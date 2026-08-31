import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../abril-modal-panel/abril-modal-panel';
import { SearchSelect } from '../search-select/search-select';
import { DatePicker } from '../date-picker/date-picker';
import { TitleCasePipe } from '../../pipes/title-case.pipe';
import { ClinicaProgramacionService } from '../../../features/clinica/services/clinica-programacion.service';
import { CatalogosSaludService } from '../../../features/ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmoPorTrabajadorDto } from '../../../features/ssoma/salud-ocupacional/dtos/emo.model';
import {
  ProgramacionDestinatarioDto,
  ProgramacionDestinatariosDto,
} from '../../../features/clinica/dtos/clinica.model';
import {
  ClinicaSimpleDto,
  EmoTipoDto,
} from '../../../features/ssoma/salud-ocupacional/dtos/catalogos.model';
import { RazonSocialCupo } from '../../dtos/razon-social.dto';
import { ErrorService } from '../../../core/services/error.service';

/**
 * "Programar EMO con clínica": reserva la cita en una clínica (crea una `ss_programacion_emo`) y
 * dispara el correo de programación. NO registra el resultado del examen: eso es el modal
 * "Registrar resultados de EMO" (`emos/components/emo-create`), que crea la fila de `worker_emos`
 * con aptitud y vencimiento.
 *
 * Lo usan la pantalla de EMOs de SSOMA y la del portal de la clínica, así que vive en
 * `shared/components/`. Sigue el estándar de formularios SSOMA: `app-abril-modal-panel` en
 * variante azul, `app-search-select` / `app-date-picker` para los desplegables y la fecha, y las
 * clases globales `.abril-field*` para los campos nativos.
 */
@Component({
  selector: 'app-programar-emo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SearchSelect, DatePicker, TitleCasePipe],
  templateUrl: './programar-emo-dialog.html',
  styleUrl: './programar-emo-dialog.css',
})
export class ProgramarEmoDialogComponent implements OnInit {
  @Input() worker!: EmoPorTrabajadorDto;
  @Output() closed = new EventEmitter<boolean>();

  /** Acento azul del logo: el de los formularios SSOMA (ver CLAUDE.md → estándar de UI). */
  readonly accentColor = 'var(--color-abril-logo-blue)';

  tiposEmo: EmoTipoDto[] = [];
  clinicas: ClinicaSimpleDto[] = [];

  /**
   * Razones sociales del grupo con sus cupos. Solo se cargan cuando hay que elegir una
   * (ver `pideRazonSocial`); en el caso normal la lista queda vacía y no se pide nada.
   */
  razonesSociales: RazonSocialCupo[] = [];

  form: {
    fechaProgramada: string;
    tipoEmoId: number | null;
    clinicaId: number | null;
    empresaId: number | null;
    notas: string;
  } = {
    fechaProgramada: '',
    tipoEmoId: null,
    clinicaId: null,
    empresaId: null,
    notas: '',
  };

  submitting = false;

  /**
   * Fecha mínima de la cita: hoy. Una programación es una reserva a futuro con la clínica, así que
   * un día pasado no es una cita sino un dato mal tipeado. Se calcula al construir el modal (vive
   * lo que dura la programación, no hace falta refrescarla) y en hora local, que es la del usuario
   * que la agenda — `toISOString()` la pasaría a UTC y en la noche de Perú daría el día siguiente.
   */
  readonly minFechaProgramada = ProgramarEmoDialogComponent.hoyLocal();

  private static hoyLocal(): string {
    const hoy = new Date();
    const mes = `${hoy.getMonth() + 1}`.padStart(2, '0');
    const dia = `${hoy.getDate()}`.padStart(2, '0');
    return `${hoy.getFullYear()}-${mes}-${dia}`;
  }

  /**
   * A quién le va a llegar cada correo del flujo, resuelto por el backend con la misma lógica
   * del envío real. Son DOS correos con destinatarios propios (los configura por separado
   * Configuración de EMOs), así que el modal los muestra por separado en vez de dar a entender
   * que es uno solo:
   *   • `manual`   — sale al guardar la cita.
   *   • `aceptada` — sale después, cuando la clínica acepta.
   * Se recargan al cambiar de clínica porque sus correos de contacto forman parte.
   */
  manual: ProgramacionDestinatariosDto = this.vacio();
  aceptada: ProgramacionDestinatariosDto = this.vacio();
  cargandoDestinatarios = false;

  constructor(
    private programacionService: ClinicaProgramacionService,
    private catalogos: CatalogosSaludService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.catalogos.getEmoTipos().subscribe({
      next: (list) => {
        // Ficha de pre-ingreso: el único examen que aplica antes de firmar es el de Ingreso.
        // El backend lo valida igual (ProgramacionEmoRepository.Create); acá se acota el
        // desplegable para que no haya que elegir mal primero y leer el error después.
        this.tiposEmo = this.worker?.esFinalistaAprobado
          ? list.filter((t) => t.nombre?.trim().toLowerCase() === 'ingreso')
          : list;
        // Con una sola opción se preselecciona: no tiene sentido obligar a abrir el desplegable.
        if (this.worker?.esFinalistaAprobado && this.tiposEmo.length === 1) {
          this.form.tipoEmoId = this.tiposEmo[0].id;
        }
        this.cdr.detectChanges();
      },
    });
    this.catalogos.getClinicas().subscribe({
      next: (list) => {
        this.clinicas = list.filter((c) => c.activo);
        this.cdr.detectChanges();
      },
    });
    if (this.pideRazonSocial) this.cargarRazonesSociales();
    this.cargarDestinatarios();
  }

  // ── Razón social ────────────────────────────────────────────────────────
  /**
   * ¿Hay que elegirle la razón social? Solo cuando la ficha no tiene ninguna, que es el caso del
   * ingreso directo FFT: su vacante no se aprueba ni se publica, así que nadie pasó por la
   * asignación interna de Reclutamiento y llegó al EMO sin empresa. Sin ella la cita quedaría
   * fuera de la pantalla de Programaciones y del correo a la clínica, así que es obligatoria.
   *
   * En el resto de los casos la razón social es un dato de la ficha y no una decisión de quien
   * programa, así que se sigue mostrando de solo lectura.
   */
  get pideRazonSocial(): boolean {
    return !this.worker?.empresaId;
  }

  private cargarRazonesSociales(): void {
    this.programacionService.getRazonesSociales().subscribe({
      next: (list) => {
        this.razonesSociales = list ?? [];
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /** Razón social elegida, para el aviso de cupos. */
  get razonSocialSeleccionada(): RazonSocialCupo | null {
    return this.razonesSociales.find((r) => r.id === this.form.empresaId) ?? null;
  }

  /** true si la razón social elegida ya no tiene cupo para una persona más. */
  get sinCupos(): boolean {
    return this.razonSocialSeleccionada?.cuposDisponibles === 0;
  }

  private cargarDestinatarios(): void {
    this.cargandoDestinatarios = true;
    this.programacionService
      .getDestinatarios(this.worker.workerId, this.form.clinicaId)
      .subscribe({
        next: (res) => {
          this.manual = this.normalizar(res?.manual);
          this.aceptada = this.normalizar(res?.aceptada);
          this.cargandoDestinatarios = false;
          this.cdr.detectChanges();
        },
        // Es solo informativo: si falla, el formulario sigue siendo usable sin los avisos.
        error: () => {
          this.manual = this.vacio();
          this.aceptada = this.vacio();
          this.cargandoDestinatarios = false;
          this.cdr.detectChanges();
        },
      });
  }

  private vacio(): ProgramacionDestinatariosDto {
    return { para: [], copias: [], clinicaPendiente: false, clinicaSinCorreos: false };
  }

  private normalizar(d?: ProgramacionDestinatariosDto): ProgramacionDestinatariosDto {
    return {
      para: d?.para ?? [],
      copias: d?.copias ?? [],
      clinicaPendiente: d?.clinicaPendiente ?? false,
      clinicaSinCorreos: d?.clinicaSinCorreos ?? false,
    };
  }

  /** Etiqueta del destinatario: "Clínica ServiSalud", "Jefe Juan Pérez" o el correo a secas. */
  etiquetaDestinatario(d: ProgramacionDestinatarioDto): string {
    if (!d.nombre) return d.email;
    const prefijo = d.origen === 'CLINICA' ? 'Clínica' : d.origen === 'JEFE' ? 'Jefe' : '';
    return prefijo ? `${prefijo} ${d.nombre}` : d.nombre;
  }

  onClinicaChange(id: number | null): void {
    this.form.clinicaId = id;
    // Los correos de contacto son de la clínica, así que el aviso cambia con ella.
    this.cargarDestinatarios();
  }

  get canSubmit(): boolean {
    if (this.pideRazonSocial && !this.form.empresaId) return false;
    return !!(this.form.fechaProgramada && this.form.tipoEmoId && this.form.clinicaId);
  }

  submit(): void {
    if (!this.canSubmit || this.submitting) return;

    if (this.worker.interconsultaEstado === 'Pendiente') {
      Swal.fire({
        icon: 'warning',
        title: 'Interconsulta pendiente',
        html: `<strong>${this.worker.nombreCompleto}</strong> tiene una interconsulta pendiente${this.worker.interconsultaEspecialidad ? ' de ' + this.worker.interconsultaEspecialidad : ''}.<br/>¿Igual quieres programarle este EMO?`,
        showCancelButton: true,
        confirmButtonText: 'Sí, programar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#005D9D',
      }).then((res) => {
        if (res.isConfirmed) this.enviar();
      });
      return;
    }

    this.enviar();
  }

  private enviar(): void {
    this.submitting = true;
    this.programacionService
      .programarEmo({
        workerId: this.worker.workerId,
        tipoEmoId: this.form.tipoEmoId!,
        // La elegida en el modal cuando la ficha no traía ninguna: el backend se la asigna al
        // trabajador (y al requerimiento del que salió), no la usa solo para esta cita.
        empresaId: this.form.empresaId ?? this.worker.empresaId ?? null,
        fechaProgramada: this.form.fechaProgramada,
        horaProgramada: null,
        clinicaId: this.form.clinicaId,
        // Ya no se elige médico en el modal: el backend le asigna el que esté marcado como
        // por defecto en ss_medicos_ocupacionales (ProgramacionEmoRepository.Create).
        medicoId: null,
        notas: this.form.notas || null,
        origen: 'Registro directo',
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          Swal.fire({
            icon: 'success',
            title: 'EMO programado',
            text: 'El EMO fue programado correctamente.',
            timer: 2000,
            showConfirmButton: false,
          });
          this.closed.emit(true);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting = false;
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
  }

  close(): void {
    this.closed.emit(false);
  }
}
