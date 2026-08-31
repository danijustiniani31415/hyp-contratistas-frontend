import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AmonestacionService } from '../../services/amonestacion.service';
import {
  AmonestacionInitDto,
  TipoSancionDto,
  AmonestacionCreateRequest,
  AmonFotoUpload,
} from '../../dtos/amonestacion.dtos';
import { WorkerSearchService } from '../../../../salud-ocupacional/services/worker-search.service';
import { WorkerSearchItemDto } from '../../../../salud-ocupacional/dtos/worker-search.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { PhotoGridPicker } from '../../../../../../shared/components/photo-grid-picker/photo-grid-picker';

@Component({
  selector: 'app-amonestacion-nueva',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, AbrilModalPanel, PhotoGridPicker],
  templateUrl: './amonestacion-nueva.html',
  styleUrl: './amonestacion-nueva.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmonestacionNueva implements OnInit, OnDestroy {
  saving = false;
  loadingInit = true;
  init: AmonestacionInitDto | null = null;

  // Trabajador
  workerQuery = '';
  workerResults: WorkerSearchItemDto[] = [];
  workerSelected: WorkerSearchItemDto | null = null;
  workerSearching = false;

  // Campos del formulario
  proyectoId: number | null = null;
  fecha = new Date().toISOString().split('T')[0];
  partidaId: number | null = null;
  tipoSancionId: number | null = null;
  infraccionTipoId: number | null = null;
  descripcion = '';
  puntosInfraccion = 1;
  aplicaPenalizacion = false;
  sancionInfraccionId: number | null = null;
  diasSuspension: number | null = null;
  fechaInicioSuspension = '';
  fechaFinSuspension = '';

  fotosSeleccionadas: { file: File; base64: string; nombre: string }[] = [];

  private workerQuery$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private svc: AmonestacionService,
    private workerSearch: WorkerSearchService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.svc.getInit().subscribe({
      next: (data) => {
        this.init = data;
        this.loadingInit = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingInit = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });

    this.workerQuery$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => this.runWorkerSearch(q));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Worker search ─────────────────────────────────────────────────

  onWorkerQueryChange(value: string): void {
    this.workerQuery = value;
    if (!value || value.trim().length < 2) {
      this.workerResults = [];
      return;
    }
    this.workerSearching = true;
    this.workerQuery$.next(value.trim());
  }

  private runWorkerSearch(q: string): void {
    this.workerSearch.search(q).subscribe({
      next: (res) => {
        this.workerResults = res;
        this.workerSearching = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.workerResults = [];
        this.workerSearching = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectWorker(w: WorkerSearchItemDto): void {
    if (w.inhabilitadoSsoma) {
      Swal.fire({
        icon: 'warning',
        title: 'Trabajador inhabilitado',
        text: `${w.apellidoNombre} tiene 10 o más puntos acumulados y está inhabilitado para operar.`,
      });
      return;
    }
    this.workerSelected = w;
    this.workerQuery = w.apellidoNombre;
    this.workerResults = [];
    this.cdr.markForCheck();
  }

  clearWorker(): void {
    this.workerSelected = null;
    this.workerQuery = '';
    this.workerResults = [];
    this.cdr.markForCheck();
  }

  // ── Tipo sanción helpers ──────────────────────────────────────────

  get tipoSancionSeleccionado(): TipoSancionDto | null {
    return this.init?.tiposSancion.find((t) => t.id === this.tipoSancionId) ?? null;
  }

  get generaSuspension(): boolean {
    return this.tipoSancionSeleccionado?.generaSuspension ?? false;
  }

  get esContratista(): boolean {
    return !(this.workerSelected === null) &&
      !this.workerSelected?.empresaActual?.toLowerCase().includes('abril');
  }

  /** Catálogos que crecen -> combobox, no <select> nativo (necesitan label combinado). */
  get tiposSancionOpts(): { id: number; label: string }[] {
    return (this.init?.tiposSancion ?? []).map((t) => ({ id: t.id, label: `${t.nombre} (${t.nivelGravedad})` }));
  }

  get racInfraccionesOpts(): { id: number; label: string }[] {
    const uit = this.init?.uitActual ?? 0;
    return (this.init?.racInfracciones ?? []).map((ri) => {
      let label = ri.nombre;
      if (ri.montoFijo) label += ` — S/ ${ri.montoFijo.toFixed(2)}`;
      else if (ri.factorUit) label += ` — ${ri.factorUit}xUIT (S/ ${(ri.factorUit * uit).toFixed(2)})`;
      return { id: ri.id, label };
    });
  }

  // ── Fotos ─────────────────────────────────────────────────────────

  get fotoPreviews(): string[] {
    return this.fotosSeleccionadas.map((f) => f.base64);
  }

  onFotosChange(files: FileList): void {
    const pendientes = Array.from(files).slice(0, 3 - this.fotosSeleccionadas.length);
    pendientes.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        this.fotosSeleccionadas.push({
          file,
          base64: reader.result as string,
          nombre: file.name,
        });
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    });
  }

  removeFoto(idx: number): void {
    this.fotosSeleccionadas.splice(idx, 1);
    this.cdr.markForCheck();
  }

  // ── Validación y envío ────────────────────────────────────────────

  get canSubmit(): boolean {
    return !!(
      this.workerSelected &&
      this.proyectoId &&
      this.fecha &&
      this.tipoSancionId &&
      this.infraccionTipoId &&
      this.descripcion.trim() &&
      this.puntosInfraccion >= 0 &&
      this.puntosInfraccion <= 10 &&
      !this.saving
    );
  }

  private buildRequest(estado: 'Borrador' | 'Registrada'): AmonestacionCreateRequest {
    const fotos: AmonFotoUpload[] = this.fotosSeleccionadas.map((f) => ({
      base64: f.base64,
      nombreArchivo: f.nombre,
    }));
    return {
      proyectoId: this.proyectoId!,
      fecha: this.fecha,
      workerId: this.workerSelected!.id,
      partidaId: this.partidaId ?? undefined,
      tipoSancionId: this.tipoSancionId!,
      infraccionTipoId: this.infraccionTipoId!,
      descripcion: this.descripcion,
      aplicaPenalizacion: this.aplicaPenalizacion,
      sancionInfraccionId: this.aplicaPenalizacion && this.sancionInfraccionId
        ? this.sancionInfraccionId
        : undefined,
      puntosInfraccion: this.puntosInfraccion,
      diasSuspension: this.generaSuspension && this.diasSuspension ? this.diasSuspension : undefined,
      fechaInicioSuspension: this.generaSuspension && this.fechaInicioSuspension
        ? this.fechaInicioSuspension
        : undefined,
      fechaFinSuspension: this.generaSuspension && this.fechaFinSuspension
        ? this.fechaFinSuspension
        : undefined,
      fotos,
      estado,
    };
  }

  guardarBorrador(): void {
    if (!this.canSubmit) return;
    this.saving = true;
    this.loaderService.show();
    this.svc.crear(this.buildRequest('Borrador')).subscribe({
      next: (res) => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Borrador guardado',
          html: `Código: <b>${res.codigo}</b><br>Puedes confirmarlo luego desde la lista.`,
          timer: 3000,
          showConfirmButton: false,
        }).then(() => this.cerrar());
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  submit(): void {
    if (!this.canSubmit) return;
    this.saving = true;
    this.loaderService.show();
    this.svc.crear(this.buildRequest('Registrada')).subscribe({
      next: (res) => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Amonestación registrada',
          html: `Código: <b>${res.codigo}</b><br>Se ha enviado el PDF al correo.`,
          timer: 3000,
          showConfirmButton: false,
        }).then(() => this.cerrar());
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cerrar(): void {
    this.router.navigate(['/ssoma/gestion/amonestaciones']);
  }
}
