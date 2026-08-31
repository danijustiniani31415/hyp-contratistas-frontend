import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { WorkerSearchInput } from '../../../shared/worker-search-input/worker-search-input';
import { ProgramacionCreate } from '../../../programaciones/components/programacion-create/programacion-create';
import { ConvalidacionService } from '../../../services/convalidacion.service';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import { EmoService } from '../../../services/emo.service';
import {
  EmpresaSimpleDto,
  MedicoSimpleDto,
} from '../../../dtos/catalogos.model';
import { WorkerSearchItemDto } from '../../../dtos/worker-search.model';
import { EmoListItemDto } from '../../../dtos/emo.model';
import {
  ConvalidacionCreateDto,
  ConvalidacionResultado,
} from '../../../dtos/convalidacion.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { aptitudBadgeClass } from '../../../shared/aptitud.utils';
import { FirmaElectronicaService } from '../../../shared/firma-electronica.service';

@Component({
  selector: 'app-convalidacion-create',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SearchSelect, WorkerSearchInput, ProgramacionCreate],
  templateUrl: './convalidacion-create.html',
  styleUrl: './convalidacion-create.css',
})
export class ConvalidacionCreate implements OnInit {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  worker: WorkerSearchItemDto | null = null;
  emosDisponibles: EmoListItemDto[] = [];
  loadingEmos = false;
  emoOrigenId = 0;
  empresaDestinoId = 0;
  fechaConvalidacion = '';
  fechaVencimiento = '';
  medicoId: number | null = null;
  resultado: ConvalidacionResultado = 'Aprobada';
  notas = '';
  saving = false;

  empresas: EmpresaSimpleDto[] = [];
  medicos: MedicoSimpleDto[] = [];

  showProgramarEmo = false;

  readonly resultadoOptions = [
    { id: 'Aprobada', nombre: 'Aprobada' },
    { id: 'Rechazada', nombre: 'Rechazada' },
    { id: 'Pendiente', nombre: 'Pendiente' },
  ];

  constructor(
    private service: ConvalidacionService,
    private emoService: EmoService,
    private catalogos: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private firmaElectronica: FirmaElectronicaService,
  ) {}

  ngOnInit(): void {
    this.catalogos.getEmpresas().subscribe((res) => {
      this.empresas = res;
      this.cdr.detectChanges();
    });
    this.catalogos.getMedicos().subscribe((res) => {
      // Solo médicos internos de Abril (sin clínica externa asociada) pueden
      // firmar convalidaciones — los de clínicas contratadas no aplican acá.
      this.medicos = res.filter((m) => !m.clinicaId);
      this.cdr.detectChanges();
    });
  }

  onWorkerSelected(w: WorkerSearchItemDto | null): void {
    this.worker = w;
    this.emoOrigenId = 0;
    this.emosDisponibles = [];
    if (w) this.loadEmosWorker(w.id);
  }

  /** Puesto/clasificación destino: el registro VIGENTE del trabajador (ya gestionado en
   * Habilitación → Cambiar obra / puesto de trabajo). El origen (qué tenía al momento del
   * EMO elegido) solo se puede resolver server-side, así que no hay vista previa acá — el
   * backend lo calcula al guardar y bloquea con un mensaje claro si el cambio de puesto no
   * es convalidable. */
  get puestoDestinoPreview(): string {
    return this.worker?.cargo || this.worker?.puesto || '—';
  }

  get clasificacionDestinoPreview(): string {
    return this.worker?.obraOficinaStaffNombre || 'Sin clasificar';
  }

  abrirProgramarEmo(): void {
    this.showProgramarEmo = true;
  }

  onProgramacionSaved(): void {
    this.showProgramarEmo = false;
    Swal.fire({
      icon: 'success',
      title: 'EMO programado',
      timer: 1500,
      showConfirmButton: false,
    });
  }

  onProgramacionClosed(): void {
    this.showProgramarEmo = false;
  }

  private loadEmosWorker(workerId: number): void {
    this.loadingEmos = true;
    this.emoService
      .getEmos({ workerId, pageSize: 50, page: 1 })
      .subscribe({
        next: (res) => {
          this.emosDisponibles = (res.data ?? []).filter(
            (e) => e.estado !== 'Anulado' && e.aptitud !== 'No Apto',
          );
          this.loadingEmos = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loadingEmos = false;
          this.errorService.handleError(err);
        },
      });
  }

  get emoOrigenOptions(): Array<EmoListItemDto & { display: string }> {
    return this.emosDisponibles.map((e) => ({
      ...e,
      display: `${formatDate(e.fechaEmo)} · ${e.tipoEmo} · ${e.empresa} · ${e.aptitud}`,
    }));
  }

  get selectedEmo(): EmoListItemDto | null {
    return this.emosDisponibles.find((e) => e.id === this.emoOrigenId) ?? null;
  }

  aptitudClass(aptitud: string): string {
    return aptitudBadgeClass(aptitud);
  }

  get canSubmit(): boolean {
    return !!(
      this.worker &&
      this.emoOrigenId &&
      this.empresaDestinoId &&
      this.fechaConvalidacion &&
      this.fechaVencimiento &&
      this.resultado
    ) && !this.saving;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Completa EMO origen, empresa destino, fechas y resultado.',
      });
      return;
    }

    const payload: ConvalidacionCreateDto = {
      emoOrigenId: this.emoOrigenId,
      empresaDestinoId: this.empresaDestinoId,
      fechaConvalidacion: this.fechaConvalidacion,
      fechaVencimiento: this.fechaVencimiento,
      medicoId: this.medicoId || undefined,
      resultado: this.resultado,
      notas: this.notas || undefined,
      // Puesto/clasificación origen y destino ya no se digitan acá: el backend los resuelve
      // solos a partir del historial de vinculación del trabajador.
    };

    // Toda decisión final (no "Pendiente") exige firma: PIN del médico + reautenticación
    // fresca de Microsoft. El backend vuelve a validar ambos de todas formas.
    if (this.resultado !== 'Pendiente') {
      const medicoNombre = this.medicos.find((m) => m.id === this.medicoId)?.apellidoNombre ?? 'el médico';
      const firma = await this.firmaElectronica.solicitarFirma(medicoNombre);
      if (!firma) return;
      payload.pinFirma = firma.pinFirma;
      payload.microsoftAccessToken = firma.microsoftAccessToken;
    }

    this.saving = true;
    this.loaderService.show();
    this.service.createConvalidacion(payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Convalidación registrada',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        // El backend bloquea con 400/423 cuando el cambio de puesto sube de riesgo — en ese
        // caso se ofrece el atajo de programar el EMO nuevo en el momento, en vez de un error
        // genérico sin salida.
        const mensaje: string = err?.error?.message ?? '';
        if (mensaje.includes('EMO nuevo')) {
          Swal.fire({
            icon: 'warning',
            title: 'No se puede convalidar',
            text: mensaje,
            showCancelButton: true,
            confirmButtonText: 'Programar EMO ahora',
            cancelButtonText: 'Cerrar',
          }).then((res) => {
            if (res.isConfirmed) this.abrirProgramarEmo();
          });
          return;
        }
        this.errorService.handleError(err);
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${mo}/${d.getFullYear()}`;
}
