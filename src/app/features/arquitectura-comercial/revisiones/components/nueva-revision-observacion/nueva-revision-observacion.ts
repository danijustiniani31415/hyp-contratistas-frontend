import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { PhotoGridPicker } from '../../../../../shared/components/photo-grid-picker/photo-grid-picker';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { RevisionesService } from '../../../../../core/services/arquitectura-comercial/revisiones.service';
import { ArquitecturaComercialService } from '../../../../../core/services/arquitectura-comercial.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { compressImages } from '../../../../../shared/utils/image-compress';
import { ProyectoRevisionFiltroDTO, RevisionDTO } from '../../../../../core/dtos/arquitectura-comercial/revisiones.model';
import { SupervisorAcDTO } from '../../../../../core/dtos/arquitectura-comercial/actividades.model';

/** Misma cuenta de campo compartida que en Observaciones — ver nueva-observacion.ts. */
const CUENTAS_COMPARTIDAS = ['operarioscomercial@abril.pe'];

@Component({
  standalone: true,
  selector: 'app-nueva-revision-observacion',
  imports: [AbrilModalPanel, PhotoGridPicker, CommonModule, FormsModule, SearchSelect],
  templateUrl: './nueva-revision-observacion.html',
  styleUrl: './nueva-revision-observacion.css',
})
export class NuevaRevisionObservacion implements OnInit {
  @Input() proyectos: ProyectoRevisionFiltroDTO[] = [];
  @Input() partidas: string[] = ['Pintura', 'Limpieza', 'Accesorios', 'Otros'];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() savedContinue = new EventEmitter<void>();

  get partidaOptions(): { value: string; label: string }[] {
    return this.partidas.map((p) => ({ value: p, label: p }));
  }

  esCuentaCompartida = false;
  trabajadores: SupervisorAcDTO[] = [];

  // ── Fijos: se mantienen entre observaciones del mismo recorrido ──
  proyectoId: number | null = null;
  revisionId: number | null = null;
  revisiones: RevisionDTO[] = [];
  fecha = new Date().toISOString().slice(0, 10);
  personaReporta = '';

  // ── Variables por observación ──
  zonaAmbiente = '';
  descripcion = '';
  partidaReportada: string | null = null;
  plazoLevantamiento = '';
  fotoSeleccionada: File | null = null;
  fotoPreview: string[] = [];

  registrarLevantamiento = false;
  levantaPorWorkerId: number | null = null;
  comentarioLevantamiento = '';
  fotoLevantamientoSeleccionada: File | null = null;
  fotoLevantamientoPreview: string[] = [];

  submitted = false;
  guardando = false;

  get puedeGuardar(): boolean {
    if (!this.proyectoId || !this.revisionId || !this.descripcion.trim()) return false;
    if (this.esCuentaCompartida && !this.personaReporta) return false;
    if (this.registrarLevantamiento && !this.levantaPorWorkerId) return false;
    return true;
  }

  constructor(
    private service: RevisionesService,
    private arqComercialService: ArquitecturaComercialService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const email = this.authService.getUserEmail();
    this.esCuentaCompartida = !!email && CUENTAS_COMPARTIDAS.includes(email);

    if (!this.esCuentaCompartida) {
      this.personaReporta = this.authService.getUserName() ?? '';
    }

    this.arqComercialService.getSupervisoresAc(true).subscribe({
      next: (data) => { this.trabajadores = data; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onProyectoChange(id: number | null): void {
    this.proyectoId = id;
    this.revisionId = null;
    this.revisiones = [];
    if (!id) return;
    this.service.getCatalogo(id).subscribe({
      next: (data) => { this.revisiones = data; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onFotoSeleccionada(files: FileList): void {
    compressImages(Array.from(files).slice(0, 1)).then(([file]) => {
      this.fotoSeleccionada = file;
      this.fotoPreview = [URL.createObjectURL(file)];
      this.cdr.markForCheck();
    });
  }

  quitarFoto(): void {
    if (this.fotoPreview[0]) URL.revokeObjectURL(this.fotoPreview[0]);
    this.fotoSeleccionada = null;
    this.fotoPreview = [];
  }

  /** A diferencia de Observaciones (checkbox "ya se levantó"), acá las fotos de Observación y
   * Levantamiento van lado a lado desde el inicio (igual que la app legacy) — adjuntar la foto
   * de levantamiento ES la señal de que se está registrando el levantamiento. */
  onFotoLevantamientoSeleccionada(files: FileList): void {
    compressImages(Array.from(files).slice(0, 1)).then(([file]) => {
      this.fotoLevantamientoSeleccionada = file;
      this.fotoLevantamientoPreview = [URL.createObjectURL(file)];
      this.registrarLevantamiento = true;
      this.cdr.markForCheck();
    });
  }

  quitarFotoLevantamiento(): void {
    if (this.fotoLevantamientoPreview[0]) URL.revokeObjectURL(this.fotoLevantamientoPreview[0]);
    this.fotoLevantamientoSeleccionada = null;
    this.fotoLevantamientoPreview = [];
    this.registrarLevantamiento = false;
    this.levantaPorWorkerId = null;
    this.comentarioLevantamiento = '';
  }

  /** Proyecto/Revisión/Fecha/Persona quedan igual entre observaciones del mismo recorrido —
   * mismo criterio que Observaciones. */
  private resetCamposPorItem(): void {
    this.zonaAmbiente = '';
    this.descripcion = '';
    this.partidaReportada = null;
    this.plazoLevantamiento = '';
    this.quitarFoto();
    this.registrarLevantamiento = false;
    this.levantaPorWorkerId = null;
    this.comentarioLevantamiento = '';
    this.quitarFotoLevantamiento();
    this.submitted = false;
  }

  save(): void {
    this.submitted = true;
    if (!this.proyectoId || !this.revisionId || !this.descripcion.trim()) return;
    if (this.esCuentaCompartida && !this.personaReporta) return;
    if (this.registrarLevantamiento && !this.levantaPorWorkerId) return;

    this.guardando = true;
    this.loaderService.show();
    this.service
      .crearObservacion(
        {
          revisionId: this.revisionId,
          fecha: this.fecha,
          personaReporta: this.personaReporta.trim() || null,
          zonaAmbiente: this.zonaAmbiente.trim() || null,
          descripcion: this.descripcion.trim(),
          partidaReportada: this.partidaReportada,
          plazoLevantamiento: this.plazoLevantamiento || null,
        },
        this.fotoSeleccionada,
      )
      .pipe(
        switchMap((res) => {
          if (!this.registrarLevantamiento) return of(res);
          return this.service
            .levantarObservacion(res.id, this.comentarioLevantamiento.trim() || null, this.fotoLevantamientoSeleccionada, this.levantaPorWorkerId)
            .pipe(catchError(() => of(res)));
        }),
      )
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.guardando = false;
          Swal.fire({
            title: 'Observación registrada',
            icon: 'success',
            toast: true,
            position: 'top-end',
            timer: 1500,
            showConfirmButton: false,
          });
          this.preguntarOtra();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.guardando = false;
          this.errorService.handleError(err);
        },
      });
  }

  private preguntarOtra(): void {
    Swal.fire({
      title: '¿Desea añadir otra observación?',
      text: 'Proyecto, revisión, fecha y persona que reporta quedan igual — solo completas lo que cambia.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, añadir otra',
      cancelButtonText: 'No, terminar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.resetCamposPorItem();
        this.savedContinue.emit();
      } else {
        this.saved.emit();
      }
    });
  }
}
