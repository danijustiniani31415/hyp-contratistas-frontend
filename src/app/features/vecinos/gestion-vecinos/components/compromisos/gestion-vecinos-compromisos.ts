import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../../../../environments/environment';
import { StatusPills } from '../status-pills/status-pills';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { GestionVecinosService } from '../../services/gestion-vecinos.service';
import {
  VecinoSolicitudItemDTO,
  VecinoCompromisoItemDTO,
  VecinoEntregableItemDTO,
  VecinoNormativaDTO,
  CatalogOptionDTO,
} from '../../dtos/gestion-vecinos.dto';

@Component({
  selector: 'app-gestion-vecinos-compromisos',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusPills],
  templateUrl: './gestion-vecinos-compromisos.html',
})
export class GestionVecinosCompromisos implements OnInit {
  @Input() solicitud!: VecinoSolicitudItemDTO;
  @Input() compromisoEstados: CatalogOptionDTO[] = [];
  @Input() entregableEstados: CatalogOptionDTO[] = [];
  /** Se emite cuando cambia el número de compromisos (para refrescar badges). */
  @Output() changed = new EventEmitter<void>();

  compromisos: VecinoCompromisoItemDTO[] = [];
  loaded = false;

  showForm = false;
  nuevo = {
    descripcion: '',
    esCritico: false,
    vecinoCompromisoEstadoId: null as number | null,
    fechaInicio: '' as string,
    fechaFin: '' as string,
    observaciones: '' as string,
  };

  constructor(
    private service: GestionVecinosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Estado por defecto del nuevo compromiso = "Pendiente".
    this.nuevo.vecinoCompromisoEstadoId =
      this.compromisoEstados.find((e) => e.descripcion === 'Pendiente')?.id ?? null;
    this.load();
  }

  private load(): void {
    this.loaderService.show();
    this.service.getCompromisos(this.solicitud.vecinoSolicitudId).subscribe({
      next: (res) => {
        this.compromisos = res;
        this.loaded = true;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  addCompromiso(): void {
    if (!this.nuevo.descripcion.trim()) {
      Swal.fire({ icon: 'warning', title: 'Descripción requerida', text: 'Ingresa la descripción del compromiso.', confirmButtonColor: '#4CAF50' });
      return;
    }
    if (this.nuevo.fechaInicio && this.nuevo.fechaFin && this.nuevo.fechaFin < this.nuevo.fechaInicio) {
      Swal.fire({ icon: 'warning', title: 'Fechas inválidas', text: 'La fecha fin no puede ser anterior a la fecha de inicio.', confirmButtonColor: '#4CAF50' });
      return;
    }

    this.loaderService.show();
    this.service
      .createCompromiso(this.solicitud.vecinoSolicitudId, {
        descripcion: this.nuevo.descripcion.trim(),
        esCritico: this.nuevo.esCritico,
        vecinoCompromisoEstadoId: this.nuevo.vecinoCompromisoEstadoId,
        fechaInicio: this.nuevo.fechaInicio || null,
        fechaFin: this.nuevo.fechaFin || null,
        observaciones: this.nuevo.observaciones.trim() || null,
      })
      .subscribe({
        next: () => {
          this.nuevo = { descripcion: '', esCritico: false, vecinoCompromisoEstadoId: null, fechaInicio: '', fechaFin: '', observaciones: '' };
          this.showForm = false;
          this.changed.emit();
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  onCompromisoEstadoChange(c: VecinoCompromisoItemDTO, estadoId: number): void {
    const previo = c.vecinoCompromisoEstadoId;
    if (estadoId === previo) return;
    this.loaderService.show();
    this.service.updateCompromisoEstado(c.vecinoCompromisoId, estadoId).subscribe({
      next: () => {
        const e = this.compromisoEstados.find((x) => x.id === estadoId);
        c.vecinoCompromisoEstadoId = estadoId;
        if (e) c.estadoDescripcion = e.descripcion;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        c.vecinoCompromisoEstadoId = previo;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Tipo de entregable obligatorio: no admite el estado "No aplica". */
  private static readonly ENTREGABLE_OBLIGATORIO = 'Acta de Compromiso';

  esObligatorio(ent: VecinoEntregableItemDTO): boolean {
    return ent.tipoDescripcion === GestionVecinosCompromisos.ENTREGABLE_OBLIGATORIO;
  }

  /** Estados disponibles para un entregable (oculta "No aplica" en los obligatorios). */
  estadosPara(ent: VecinoEntregableItemDTO): CatalogOptionDTO[] {
    if (!this.esObligatorio(ent)) return this.entregableEstados;
    return this.entregableEstados.filter((e) => e.descripcion !== 'No aplica');
  }

  /** URL absoluta del archivo del entregable (la ruta guardada es relativa al backend). */
  entregableFileUrl(url?: string | null): string {
    if (!url) return '';
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  onEntregableFileSelected(ent: VecinoEntregableItemDTO, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.loaderService.show();
    this.service.uploadEntregable(ent.vecinoCompromisoEntregableId, file).subscribe({
      next: (res) => {
        ent.archivoUrl = res.archivoUrl;
        ent.originalFileName = file.name;
        input.value = '';
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        input.value = '';
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Observaciones (edición inline) ─────────────────────────────────────
  editObsId: number | null = null;
  obsDraft = '';

  startEditObs(c: VecinoCompromisoItemDTO): void {
    this.editObsId = c.vecinoCompromisoId;
    this.obsDraft = c.observaciones ?? '';
  }

  cancelEditObs(): void {
    this.editObsId = null;
    this.obsDraft = '';
  }

  saveObs(c: VecinoCompromisoItemDTO): void {
    const valor = this.obsDraft.trim() || null;
    this.loaderService.show();
    this.service.updateCompromisoObservaciones(c.vecinoCompromisoId, valor).subscribe({
      next: () => {
        c.observaciones = valor;
        this.editObsId = null;
        this.obsDraft = '';
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Fecha límite por municipalidad/fiscalización (edición inline) ──────
  editFechaMuniId: number | null = null;
  fechaMuniDraft = '';

  /** Un compromiso está catalogado "con fecha límite por municipalidad/fiscalización" si tiene esa fecha. */
  tieneFechaMunicipalidad(c: VecinoCompromisoItemDTO): boolean {
    return !!c.fechaFinMunicipalidad;
  }

  startEditFechaMuni(c: VecinoCompromisoItemDTO): void {
    this.editFechaMuniId = c.vecinoCompromisoId;
    this.fechaMuniDraft = c.fechaFinMunicipalidad ? c.fechaFinMunicipalidad.substring(0, 10) : '';
  }

  cancelEditFechaMuni(): void {
    this.editFechaMuniId = null;
    this.fechaMuniDraft = '';
  }

  saveFechaMuni(c: VecinoCompromisoItemDTO): void {
    if (!this.fechaMuniDraft) {
      Swal.fire({ icon: 'warning', title: 'Fecha requerida', text: 'Ingresa la fecha límite por municipalidad/fiscalización.', confirmButtonColor: '#4CAF50' });
      return;
    }
    if (c.fechaFin && this.fechaMuniDraft > c.fechaFin.substring(0, 10)) {
      Swal.fire({ icon: 'warning', title: 'Fecha inválida', text: 'La fecha límite por municipalidad/fiscalización no puede ser posterior a la fecha fin del compromiso.', confirmButtonColor: '#4CAF50' });
      return;
    }
    this.loaderService.show();
    this.service.updateCompromisoFechaMunicipalidad(c.vecinoCompromisoId, this.fechaMuniDraft).subscribe({
      next: () => {
        c.fechaFinMunicipalidad = this.fechaMuniDraft;
        this.editFechaMuniId = null;
        this.fechaMuniDraft = '';
        this.loaderService.hide();
        this.changed.emit();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  async quitarFechaMuni(c: VecinoCompromisoItemDTO): Promise<void> {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Quitar fecha límite?',
      text: 'El compromiso dejará de estar catalogado como "con fecha límite por municipalidad/fiscalización".',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed) return;

    this.loaderService.show();
    this.service.updateCompromisoFechaMunicipalidad(c.vecinoCompromisoId, null).subscribe({
      next: () => {
        c.fechaFinMunicipalidad = null;
        this.editFechaMuniId = null;
        this.fechaMuniDraft = '';
        this.loaderService.hide();
        this.changed.emit();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Normativas (multi-archivo por compromiso) ──────────────────────────
  onNormativasSelected(c: VecinoCompromisoItemDTO, event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;

    this.loaderService.show();
    this.service.uploadNormativas(c.vecinoCompromisoId, files).subscribe({
      next: (res) => {
        c.normativas = [...(c.normativas ?? []), ...res.normativas];
        input.value = '';
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        input.value = '';
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  async eliminarNormativa(c: VecinoCompromisoItemDTO, n: VecinoNormativaDTO): Promise<void> {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar archivo?',
      text: n.originalFileName || 'Este archivo se eliminará.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed) return;

    this.loaderService.show();
    this.service.deleteNormativa(n.vecinoCompromisoNormativaId).subscribe({
      next: () => {
        c.normativas = (c.normativas ?? []).filter((x) => x.vecinoCompromisoNormativaId !== n.vecinoCompromisoNormativaId);
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onEntregableEstadoChange(ent: VecinoEntregableItemDTO, estadoId: number): void {
    const previo = ent.vecinoEntregableEstadoId;
    if (estadoId === previo) return;
    this.loaderService.show();
    this.service.updateEntregableEstado(ent.vecinoCompromisoEntregableId, estadoId).subscribe({
      next: () => {
        const e = this.entregableEstados.find((x) => x.id === estadoId);
        ent.vecinoEntregableEstadoId = estadoId;
        if (e) ent.estadoDescripcion = e.descripcion;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        ent.vecinoEntregableEstadoId = previo;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
