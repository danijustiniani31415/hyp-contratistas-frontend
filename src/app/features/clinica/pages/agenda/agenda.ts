import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import Swal from 'sweetalert2';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ClinicaProgramacionService } from '../../services/clinica-programacion.service';
import { InterconsultaClinicaService } from '../../services/interconsulta-clinica.service';
import { ProgramacionClinicaDto, ClinicaAccionDto, ClinicaInterconsultaCreateDto } from '../../dtos/clinica.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { CompletarEmo } from './components/completar-emo/completar-emo';
import { environment } from '../../../../../environments/environment';
import { hoyIsoLocal } from '../../../../shared/utils/fecha-local.util';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { DatePicker } from '../../../../shared/components/date-picker/date-picker';
import { TimePicker } from '../../../../shared/components/time-picker/time-picker';
import { CatalogosSaludService } from '../../../ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmoTipoDto } from '../../../ssoma/salud-ocupacional/dtos/catalogos.model';

import { CLINICA_TABS } from '../../shared/clinica-tabs';
type FiltroEstado = '' | 'Programado' | 'Aceptado por Clínica' | 'En Atención' | 'Completado' | 'Rechazado' | 'No se presentó';

@Component({
  selector: 'app-clinica-agenda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CompletarEmo,
    AbrilPageHeaderComponent,
    SearchSelect,
    SearchInput,
    DatePicker,
    TimePicker,
  ],
  templateUrl: './agenda.html',
  styleUrls: ['./agenda.css'],
})
export class Agenda implements OnInit {
  readonly tabs = CLINICA_TABS;

  /**
   * Acento de los desplegables de los modales de la agenda (fecha, hora y tipo de EMO): el mismo
   * verde del botón «Confirmar», para que los tres campos se lean como parte del mismo formulario
   * y no cada uno con el color por defecto de su componente.
   */
  readonly accentoModal = '#22c55e';
  items: ProgramacionClinicaDto[] = [];
  loading = false;
  accionando: number | null = null;

  // Sin fecha por defecto: se muestran todas las programaciones. Solo se
  // restringe cuando el usuario elige explícitamente una fecha.
  selectedDate = '';
  filtroEstado: FiltroEstado = '';
  busqueda = '';

  tipoEmoOptions: EmoTipoDto[] = [];

  modalAceptar: {
    open: boolean;
    item: ProgramacionClinicaDto | null;
    nuevaFecha: string;
    horaAceptar: string;
    tipoEmoId: number | null;
    fechaError: string;
    horaError: string;
  } = {
    open: false,
    item: null,
    nuevaFecha: '',
    horaAceptar: '',
    tipoEmoId: null,
    fechaError: '',
    horaError: '',
  };

  modalReprogramar: {
    open: boolean;
    item: ProgramacionClinicaDto | null;
    nuevaFecha: string;
    nuevaHora: string;
    tipoEmoId: number | null;
    horaError: string;
    fechaError: string;
  } = {
    open: false,
    item: null,
    nuevaFecha: '',
    nuevaHora: '',
    tipoEmoId: null,
    horaError: '',
    fechaError: '',
  };

  completandoItem: ProgramacionClinicaDto | null = null;

  modalConfirmarReprogramar: {
    open: boolean;
    workerNombre: string;
    fechaNueva: string;
    horaNueva: string;
    body: ClinicaAccionDto | null;
    itemId: number | null;
  } = { open: false, workerNombre: '', fechaNueva: '', horaNueva: '', body: null, itemId: null };

  modalInterconsulta = {
    visible: false,
    progId: 0,
    workerId: 0,
    emoId: null as number | null,
    workerNombre: '',
    workerDni: '',
    especialidad: '',
    observacion: '',
    requiereSeguimiento: false,
    especialidadError: '',
    cargando: false,
  };

  readonly estadosFiltro: { key: FiltroEstado; label: string }[] = [
    { key: '', label: 'Todos' },
    { key: 'Programado', label: 'Programado' },
    { key: 'Aceptado por Clínica', label: 'Aceptado' },
    { key: 'En Atención', label: 'En Atención' },
    { key: 'Completado', label: 'Completado' },
    { key: 'Rechazado', label: 'Rechazado' },
    { key: 'No se presentó', label: 'No se presentó' },
  ];

  constructor(
    private svc: ClinicaProgramacionService,
    private interconsultaSvc: InterconsultaClinicaService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private catalogosSalud: CatalogosSaludService,
  ) {}

  ngOnInit(): void {
    this.loadAgenda(this.selectedDate);
    this.catalogosSalud.getEmoTipos().subscribe({
      next: (tipos) => (this.tipoEmoOptions = [...tipos].sort((a, b) => a.nombre.localeCompare(b.nombre))),
      error: (err) => this.errorService.handleError(err),
    });
  }

  loadAgenda(fecha: string): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getProgramacionesFiltradas({ desde: fecha || undefined, hasta: fecha || undefined }).subscribe({
      next: (data) => {
        this.items = data;
        console.log('[Agenda] items[0]:', data[0]);
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onDateChange(): void {
    this.loadAgenda(this.selectedDate);
  }

  enviandoInasistencias = false;

  /** Fecha efectiva para el correo de inasistencias: la elegida en el filtro, o hoy si no hay ninguna. */
  private fechaParaInasistencias(): string {
    return this.selectedDate || hoyIsoLocal();
  }

  /** El correo de inasistencias solo tiene sentido a partir del mediodía (recién ahí se sabe quién no se presentó). */
  get puedeEnviarInasistencias(): boolean {
    return new Date().getHours() >= 12;
  }

  enviarInasistencias(): void {
    if (this.enviandoInasistencias || !this.puedeEnviarInasistencias) return;
    const fecha = this.fechaParaInasistencias();
    const noShow = this.items.filter(
      (i) => i.estado === 'No se presentó' && (i.fechaProgramada || '').substring(0, 10) === fecha,
    ).length;

    Swal.fire({
      icon: 'question',
      title: '¿Enviar correo de inasistencias?',
      html: `Se notificará a los administradores (con copia a Medicina Ocupacional y Administración) de
        <strong>${noShow}</strong> trabajador(es) que no se presentaron el <strong>${fecha}</strong>.`,
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.enviandoInasistencias = true;
      this.loaderService.show();
      this.svc.enviarInasistencias(fecha).subscribe({
        next: (res) => {
          this.enviandoInasistencias = false;
          this.loaderService.hide();
          const detalleHtml = res.detalles?.length
            ? `<ul style="text-align:left; font-size:12px; margin-top:8px; max-height:200px; overflow:auto;">
                ${res.detalles.map((d) => `<li>${d}</li>`).join('')}
              </ul>`
            : '';
          Swal.fire({
            icon: res.totalErrores > 0 ? 'warning' : 'success',
            title: 'Correos procesados',
            html: `Enviados: <strong>${res.totalEnviados}</strong> · Errores: <strong>${res.totalErrores}</strong> de ${res.totalSeleccionadas} seleccionada(s).${detalleHtml}`,
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.enviandoInasistencias = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  limpiarFecha(): void {
    this.selectedDate = '';
    this.loadAgenda(this.selectedDate);
  }

  // ── Counts ───────────────────────────────────────────────
  get totalHoy(): number { return this.items.length; }
  get countProgramados(): number { return this.items.filter(i => i.estado === 'Programado').length; }
  get countAceptados(): number { return this.items.filter(i => i.estado === 'Aceptado por Clínica').length; }
  get countEnAtencion(): number { return this.items.filter(i => i.estado === 'En Atención').length; }
  get countCompletados(): number { return this.items.filter(i => i.estado === 'Completado').length; }
  get countRechazados(): number {
    return this.items.filter(i =>
      ['Rechazado por Clínica', 'Cancelado'].includes(i.estado),
    ).length;
  }
  get countNoPresento(): number { return this.items.filter(i => i.estado === 'No se presentó').length; }

  countForFiltro(key: FiltroEstado): number {
    switch (key) {
      case '': return this.totalHoy;
      case 'Programado': return this.countProgramados;
      case 'Aceptado por Clínica': return this.countAceptados;
      case 'En Atención': return this.countEnAtencion;
      case 'Completado': return this.countCompletados;
      case 'Rechazado': return this.countRechazados;
      case 'No se presentó': return this.countNoPresento;
    }
  }

  // ── Filter ───────────────────────────────────────────────
  get programacionesFiltradas(): ProgramacionClinicaDto[] {
    let base = this.items;
    if (this.filtroEstado === 'Rechazado') {
      base = base.filter(i =>
        ['Rechazado por Clínica', 'Cancelado'].includes(i.estado),
      );
    } else if (this.filtroEstado) {
      base = base.filter(i => i.estado === this.filtroEstado);
    }
    // Búsqueda por nombre o DNI con la misma lógica que el resto de la app (palabras en cualquier
    // orden, sin tildes). El `?? ''` no es defensivo de más: el backend sirve `workerDni` (y el
    // nombre) como opcionales, y un solo registro sin DNI hacía reventar el filtro con
    // "Cannot read properties of null" — por eso la búsqueda de esta pantalla no funcionaba.
    const q = this.busqueda.trim();
    if (q) {
      base = base.filter(
        i => SearchInput.matches(i.workerNombre ?? '', q) || (i.workerDni ?? '').includes(q),
      );
    }
    return base;
  }

  // ── Modal Aceptar ────────────────────────────────────────
  /**
   * Hora con la que abre el modal de aceptación cuando la programación no trae ninguna: las 8:00,
   * que es la hora habitual de atención. La hora es obligatoria para aceptar, así que dejar el
   * campo vacío obligaba a elegirla a mano en todas las citas sin hora.
   */
  private static readonly HORA_ATENCION_DEFECTO = '08:00';

  abrirAceptar(item: ProgramacionClinicaDto): void {
    this.modalAceptar = {
      open: true,
      item,
      nuevaFecha: item.fechaProgramada ? item.fechaProgramada.substring(0, 10) : '',
      // Solo cuando no hay hora programada: si la clínica ya tiene una, manda la suya.
      horaAceptar: (item.horaProgramada ?? '').trim() || Agenda.HORA_ATENCION_DEFECTO,
      tipoEmoId: item.tipoEmoId ?? null,
      fechaError: '',
      horaError: '',
    };
  }

  cancelarAceptar(): void {
    this.modalAceptar = { open: false, item: null, nuevaFecha: '', horaAceptar: '', tipoEmoId: null, fechaError: '', horaError: '' };
  }

  confirmarAceptar(): void {
    const item = this.modalAceptar.item;
    if (!item) return;
    this.modalAceptar.fechaError = '';
    this.modalAceptar.horaError = '';
    if (!this.modalAceptar.nuevaFecha) {
      this.modalAceptar.fechaError = 'La fecha es obligatoria';
      return;
    }
    if (!this.modalAceptar.horaAceptar || this.modalAceptar.horaAceptar.trim() === '' || this.modalAceptar.horaAceptar === '--:--') {
      this.modalAceptar.horaError = 'La hora es obligatoria';
      return;
    }
    const body: ClinicaAccionDto = {
      id: item.id,
      accion: 'Aceptar',
      nuevaFecha: this.modalAceptar.nuevaFecha,
      horaNueva: this.modalAceptar.horaAceptar,
      tipoEmoId: this.modalAceptar.tipoEmoId ?? undefined,
    };
    this.cancelarAceptar();
    this.ejecutarAccion(item.id, body);
  }

  // ── Modal Reprogramar ────────────────────────────────────
  abrirReprogramar(item: ProgramacionClinicaDto): void {
    console.log('[abrirReprogramar] fechaProgramada raw:', item.fechaProgramada, 'resultado substring:', item.fechaProgramada?.substring(0, 10));
    this.modalReprogramar = {
      open: true,
      item,
      nuevaFecha: item.fechaProgramada ? item.fechaProgramada.substring(0, 10) : '',
      nuevaHora: item.horaProgramada ?? '',
      tipoEmoId: item.tipoEmoId ?? null,
      horaError: '',
      fechaError: '',
    };
    setTimeout(() => { this.cdr.detectChanges(); }, 0);
  }

  cancelarReprogramar(): void {
    this.modalReprogramar = { open: false, item: null, nuevaFecha: '', nuevaHora: '', tipoEmoId: null, horaError: '', fechaError: '' };
  }

  confirmarReprogramar(): void {
    const item = this.modalReprogramar.item;
    if (!item) return;
    this.modalReprogramar.fechaError = '';
    this.modalReprogramar.horaError = '';
    let valid = true;
    const tipoEmoCambio = this.modalReprogramar.tipoEmoId != null && this.modalReprogramar.tipoEmoId !== (item.tipoEmoId ?? null);
    if (!this.modalReprogramar.nuevaFecha) {
      this.modalReprogramar.fechaError = 'La fecha es obligatoria';
      valid = false;
    } else if (
      !tipoEmoCambio &&
      this.modalReprogramar.nuevaFecha === (item.fechaProgramada ?? '').substring(0, 10) &&
      this.modalReprogramar.nuevaHora === (item.horaProgramada ?? '')
    ) {
      this.modalReprogramar.fechaError = 'Debes cambiar la fecha, la hora o el tipo de EMO';
      valid = false;
    }
    if (!this.modalReprogramar.nuevaHora || this.modalReprogramar.nuevaHora === '--:--') {
      this.modalReprogramar.horaError = 'La hora es obligatoria';
      valid = false;
    }
    if (!valid) return;
    const body: ClinicaAccionDto = {
      id: item.id,
      accion: 'Aceptar',
      nuevaFecha: this.modalReprogramar.nuevaFecha,
      horaNueva: this.modalReprogramar.nuevaHora,
      tipoEmoId: this.modalReprogramar.tipoEmoId ?? undefined,
    };
    console.log('[Reprogramar] payload:', body);
    this.modalConfirmarReprogramar = {
      open: true,
      workerNombre: item.workerNombre ?? '',
      fechaNueva: this.modalReprogramar.nuevaFecha,
      horaNueva: this.modalReprogramar.nuevaHora,
      body,
      itemId: item.id,
    };
  }

  cancelarConfirmarReprogramar(): void {
    this.modalConfirmarReprogramar = { open: false, workerNombre: '', fechaNueva: '', horaNueva: '', body: null, itemId: null };
  }

  ejecutarReprogramar(): void {
    const { body, itemId } = this.modalConfirmarReprogramar;
    if (!body || !itemId) return;
    this.cancelarConfirmarReprogramar();
    this.cancelarReprogramar();
    this.accionando = itemId;
    this.svc.accionClinica(itemId, body).subscribe({
      next: () => {
        this.accionando = null;
        this.loadAgenda(this.selectedDate);
        Swal.fire({ icon: 'success', title: 'Cita reprogramada', timer: 1500, showConfirmButton: false });
      },
      error: (err) => {
        this.accionando = null;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Rechazar (SweetAlert2) ───────────────────────────────
  rechazar(item: ProgramacionClinicaDto): void {
    Swal.fire({
      title: 'Rechazar programación',
      html: `
        <span style="font-size:0.87rem;color:#94a3b8">${item.workerNombre}</span>
        <input id="swal-motivo-rechazo" class="swal2-input" placeholder="Motivo de rechazo *" autocomplete="off">
        <label style="display:flex;align-items:center;gap:8px;justify-content:center;margin-top:10px;font-size:0.85rem;color:#cbd5e1;cursor:pointer;">
          <input id="swal-enviar-correo" type="checkbox" checked style="width:16px;height:16px;cursor:pointer;">
          Enviar correo de notificación de rechazo
        </label>
      `,
      background: '#1e293b',
      color: '#f1f5f9',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const motivoInput = document.getElementById('swal-motivo-rechazo') as HTMLInputElement | null;
        const enviarCorreoInput = document.getElementById('swal-enviar-correo') as HTMLInputElement | null;
        const motivo = motivoInput?.value?.trim();
        if (!motivo) {
          Swal.showValidationMessage('Ingresa el motivo de rechazo');
          return false;
        }
        return { motivo, enviarCorreo: enviarCorreoInput?.checked ?? true };
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.ejecutarAccion(item.id, {
          id: item.id,
          accion: 'Rechazar',
          motivoRechazo: result.value.motivo,
          enviarCorreo: result.value.enviarCorreo,
        });
      }
    });
  }

  // ── No asistió ───────────────────────────────────────────
  noAsistio(item: ProgramacionClinicaDto): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Marcar como No asistió?',
      html: `<span style="font-size:0.87rem;color:#94a3b8">${item.workerNombre}</span>`,
      background: '#1e293b',
      color: '#f1f5f9',
      confirmButtonColor: '#f97316',
      cancelButtonColor: '#334155',
      showCancelButton: true,
      confirmButtonText: 'Sí, no asistió',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.ejecutarAccion(item.id, { id: item.id, accion: 'No Asistió' });
    });
  }

  // ── CheckIn ──────────────────────────────────────────────
  checkIn(item: ProgramacionClinicaDto): void {
    const hora = new Date().toTimeString().slice(0, 5);
    this.ejecutarAccion(item.id, { id: item.id, accion: 'CheckIn', checkInHora: hora });
  }

  // ── Deshacer CheckIn ────────────────────────────────────
  deshacerCheckin(item: ProgramacionClinicaDto): void {
    Swal.fire({
      title: 'Deshacer ingreso',
      html: `<span style="font-size:0.87rem;color:#94a3b8">¿Confirmas deshacer el ingreso de <strong>${item.workerNombre}</strong>?</span>`,
      icon: 'warning',
      background: '#1e293b',
      color: '#f1f5f9',
      confirmButtonColor: '#475569',
      cancelButtonColor: '#334155',
      showCancelButton: true,
      confirmButtonText: 'Sí, deshacer',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
      const headers = new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
      this.accionando = item.id;
      this.http
        .patch(`${environment.apiUrl}api/v1/ssoma/salud-ocupacional/programaciones/${item.id}/deshacer-checkin`, {}, { headers })
        .subscribe({
          next: () => {
            this.accionando = null;
            this.loadAgenda(this.selectedDate);
          },
          error: (err) => {
            this.accionando = null;
            this.errorService.handleError(err);
          },
        });
    });
  }

  // ── Completar EMO ────────────────────────────────────────
  abrirCompletar(item: ProgramacionClinicaDto): void {
    this.completandoItem = item;
  }

  onCompletado(): void {
    this.completandoItem = null;
    this.loadAgenda(this.selectedDate);
  }

  // ── Shared ───────────────────────────────────────────────
  private ejecutarAccion(id: number, body: ClinicaAccionDto): void {
    this.accionando = id;
    this.svc.accionClinica(id, body).subscribe({
      next: () => {
        this.accionando = null;
        this.loadAgenda(this.selectedDate);
      },
      error: (err) => {
        this.accionando = null;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Interconsulta (nueva desde card) ─────────────────────
  abrirInterconsulta(item: any): void {
    this.modalInterconsulta = {
      visible: true,
      progId: item.id,
      workerId: item.workerId,
      emoId: item.emoId ?? null,
      workerNombre: item.workerNombre ?? '',
      workerDni: item.workerDni ?? '',
      especialidad: '',
      observacion: '',
      requiereSeguimiento: false,
      especialidadError: '',
      cargando: false,
    };
  }

  cancelarInterconsulta(): void {
    this.modalInterconsulta.visible = false;
  }

  confirmarInterconsulta(): void {
    const m = this.modalInterconsulta;
    m.especialidadError = '';

    if (!m.especialidad.trim()) {
      m.especialidadError = 'La especialidad es obligatoria';
      return;
    }

    m.cargando = true;
    const dto: ClinicaInterconsultaCreateDto = {
      workerId: m.workerId,
      especialidad: m.especialidad.trim(),
      programacionId: m.progId,
      diagnostico: m.observacion.trim() || undefined,
      requiereSeguimiento: m.requiereSeguimiento,
    };

    this.interconsultaSvc.createInterconsulta(dto).subscribe({
      next: () => {
        this.cancelarInterconsulta();
        this.loadAgenda(this.selectedDate);
        Swal.fire('Interconsulta registrada', '', 'success');
      },
      error: (err) => {
        m.cargando = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── CSS helpers ──────────────────────────────────────────
  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Programado': 'chip-blue',
      'Aceptado por Clínica': 'chip-violet',
      'En Atención': 'chip-orange',
      'Completado': 'chip-green',
      'Rechazado por Clínica': 'chip-slate',
      'Cancelado': 'chip-slate',
      'No se presentó': 'chip-slate',
    };
    return map[estado] ?? 'chip-slate';
  }

  cardBorderClass(estado: string): string {
    const map: Record<string, string> = {
      'Programado': 'card-bl-blue',
      'Aceptado por Clínica': 'card-bl-violet',
      'En Atención': 'card-bl-orange',
      'Completado': 'card-bl-green',
      'Rechazado por Clínica': 'card-bl-slate',
      'Cancelado': 'card-bl-slate',
      'No se presentó': 'card-bl-slate',
    };
    return map[estado] ?? 'card-bl-slate';
  }

  filtroClass(key: FiltroEstado): string {
    const map: Record<string, string> = {
      'Programado': 'pill-blue',
      'Aceptado por Clínica': 'pill-violet',
      'En Atención': 'pill-orange',
      'Completado': 'pill-green',
      'Rechazado': 'pill-slate',
      'No se presentó': 'pill-amber',
    };
    return map[key] ?? '';
  }

  esTerminal(estado: string): boolean {
    return ['Completado', 'Rechazado por Clínica', 'Cancelado'].includes(estado);
  }

  fechaClass(fecha: string): string {
    const hoy = hoyIsoLocal();
    if (fecha === hoy) return 'fecha-hoy';
    if (fecha < hoy) return 'fecha-pasada';
    return 'fecha-futura';
  }
}
