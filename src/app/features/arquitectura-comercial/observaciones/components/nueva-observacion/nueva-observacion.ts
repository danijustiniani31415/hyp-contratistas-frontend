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
import { ObservacionesService } from '../../../../../core/services/arquitectura-comercial/observaciones.service';
import { ArquitecturaComercialService } from '../../../../../core/services/arquitectura-comercial.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { compressImages } from '../../../../../shared/utils/image-compress';
import { ProyectoFiltroDTO } from '../../../../../core/dtos/arquitectura-comercial/observaciones.model';
import { SupervisorAcDTO } from '../../../../../core/dtos/arquitectura-comercial/actividades.model';

/** Cuenta de campo compartida por varios obreros de Arquitectura Comercial — no hay forma de
 * saber quién es por sesión, así que ahí sí se pide elegir de una lista (solo obreros, no staff).
 * Cualquier otra sesión (login individual) usa directamente el nombre de quien está logueado. */
const CUENTAS_COMPARTIDAS = ['operarioscomercial@abril.pe'];

@Component({
  standalone: true,
  selector: 'app-nueva-observacion',
  imports: [AbrilModalPanel, PhotoGridPicker, CommonModule, FormsModule, SearchSelect],
  templateUrl: './nueva-observacion.html',
  styleUrl: './nueva-observacion.css',
})
export class NuevaObservacion implements OnInit {
  @Input() proyectos: ProyectoFiltroDTO[] = [];
  @Input() partidas: string[] = ['Pintura', 'Limpieza', 'Accesorios', 'Otros'];
  @Output() closeModal = new EventEmitter<void>();
  /** Se guardó y el usuario terminó — el modal se cierra. */
  @Output() saved = new EventEmitter<void>();
  /** Se guardó pero el usuario eligió "añadir otra" — el modal sigue abierto, el padre solo refresca lista/stats. */
  @Output() savedContinue = new EventEmitter<void>();

  get partidaOptions(): { value: string; label: string }[] {
    return this.partidas.map((p) => ({ value: p, label: p }));
  }

  /** true = cuenta compartida, hay que elegir quién reporta de una lista de obreros. */
  esCuentaCompartida = false;
  trabajadores: SupervisorAcDTO[] = [];

  // ── Fijos: se mantienen entre observaciones del mismo recorrido ──
  proyectoId: number | null = null;
  fecha = new Date().toISOString().slice(0, 10);
  personaReporta = '';

  // ── Variables por observación ──
  lugar = '';
  descripcion = '';
  partidaReportada: string | null = null;
  plazoLevantamiento = '';
  fotoSeleccionada: File | null = null;
  fotoPreview: string[] = [];

  // ── "Adjuntar foto de levantamiento" — registrar el levantamiento junto con la observación ──
  registrarLevantamiento = false;
  levantaPorWorkerId: number | null = null;
  comentarioLevantamiento = '';
  fotoLevantamientoSeleccionada: File | null = null;
  fotoLevantamientoPreview: string[] = [];

  submitted = false;
  guardando = false;

  /** El botón Guardar solo se habilita cuando lo obligatorio está lleno — nada de "guardar y
   * mostrar error en rojo". Comentario y foto de levantamiento son opcionales. */
  get puedeGuardar(): boolean {
    if (!this.proyectoId || !this.descripcion.trim()) return false;
    if (this.esCuentaCompartida && !this.personaReporta) return false;
    if (this.registrarLevantamiento && !this.levantaPorWorkerId) return false;
    return true;
  }

  constructor(
    private service: ObservacionesService,
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

    // Un solo catálogo (obreros de AC) para "Persona que reporta" (cuenta compartida) y
    // "Quién levanta" — ambos representan a quien está físicamente haciendo el trabajo en obra.
    this.arqComercialService.getSupervisoresAc(true).subscribe({
      next: (data) => { this.trabajadores = data; this.cdr.markForCheck(); },
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

  onFotoLevantamientoSeleccionada(files: FileList): void {
    compressImages(Array.from(files).slice(0, 1)).then(([file]) => {
      this.fotoLevantamientoSeleccionada = file;
      this.fotoLevantamientoPreview = [URL.createObjectURL(file)];
      this.cdr.markForCheck();
    });
  }

  quitarFotoLevantamiento(): void {
    if (this.fotoLevantamientoPreview[0]) URL.revokeObjectURL(this.fotoLevantamientoPreview[0]);
    this.fotoLevantamientoSeleccionada = null;
    this.fotoLevantamientoPreview = [];
  }

  toggleRegistrarLevantamiento(): void {
    this.registrarLevantamiento = !this.registrarLevantamiento;
    if (!this.registrarLevantamiento) {
      this.levantaPorWorkerId = null;
      this.comentarioLevantamiento = '';
      this.quitarFotoLevantamiento();
    }
  }

  /** Limpia solo lo que cambia entre observaciones del mismo recorrido — Proyecto/Fecha/Persona
   * quedan igual a propósito, para no repetirlos en cada ítem. */
  private resetCamposPorItem(): void {
    this.lugar = '';
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
    if (!this.proyectoId || !this.descripcion.trim()) return;
    if (this.esCuentaCompartida && !this.personaReporta) return;
    if (this.registrarLevantamiento && !this.levantaPorWorkerId) return;

    this.guardando = true;
    this.loaderService.show();
    this.service
      .createObservacion(
        {
          proyectoId: this.proyectoId,
          fecha: this.fecha,
          personaReporta: this.personaReporta.trim() || null,
          lugar: this.lugar.trim() || null,
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
        next: (res) => {
          this.loaderService.hide();
          this.guardando = false;
          Swal.fire({
            title: `Observación ${res.codigo} registrada`,
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

  /** Tras guardar, pregunta si se agrega otra del mismo recorrido (Proyecto/Fecha/Persona
   * quedan prellenados) o si se cierra el modal. */
  private preguntarOtra(): void {
    Swal.fire({
      title: '¿Desea añadir otra observación?',
      text: 'Proyecto, fecha y persona que reporta quedan igual — solo completas lo que cambia.',
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
