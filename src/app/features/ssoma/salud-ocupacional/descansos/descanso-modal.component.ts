import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component,
  EventEmitter, Input, OnInit, Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { DatePicker } from '../../../../shared/components/date-picker/date-picker';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { Cie10Select } from '../../../../shared/components/cie10-select/cie10-select';
import { WorkerSearchInput } from '../shared/worker-search-input/worker-search-input';
import { DescansoAdjuntos } from '../shared/descanso-adjuntos/descanso-adjuntos';
import { WorkerSearchItemDto } from '../dtos/worker-search.model';
import { DescansosService } from './descansos.service';
import {
  DescansoMedicoDetalleDto,
  DescansoMedicoCreateDto,
  DescansoAdjuntoDto,
  DescansoAprobarDto,
  DescansoRechazarDto,
  DarAltaDto,
  ReabrirCasoDto,
  CasoDetalleDto,
  CasoCandidatoDto,
  DescansoSeguimientoDto,
  DescansoSeguimientoCreateDto,
  DescansoTipoDto,
} from './descansos.dtos';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { abrirCertificado } from '../shared/certificado-descanso.utils';

type TabKey = 'detalle' | 'seguimientos';

@Component({
  selector: 'app-descanso-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, AbrilModalPanel, DatePicker, SearchSelect, Cie10Select,
    WorkerSearchInput, DescansoAdjuntos,
  ],
  templateUrl: './descanso-modal.component.html',
  styleUrl: './descanso-modal.component.css',
})
export class DescansoModalComponent implements OnInit {
  /** null = modo creación, objeto = modo detalle/gestión */
  @Input() descansoId: number | null = null;
  /** Catálogo completo de tipos (los 4). Lo trae la página en su carga inicial. */
  @Input() tipos: DescansoTipoDto[] = [];
  /** Preselecciona el trabajador (p. ej. al crear desde el detalle de un accidente) y oculta el buscador. */
  @Input() presetWorker: WorkerSearchItemDto | null = null;
  /** Vincula el descanso creado a un accidente de trabajo existente. */
  @Input() presetAccidenteId: number | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<void>();

  // ── Estado general ────────────────────────────────────────────────────────
  tab: TabKey = 'detalle';
  loading   = true;
  saving    = false;
  isNuevo   = false;

  detalle: DescansoMedicoDetalleDto | null = null;
  /** El caso (timeline completo: todos los descansos del problema + seguimientos + alta). */
  caso: CasoDetalleDto | null = null;
  seguimientos: DescansoSeguimientoDto[] = [];
  /** Otros casos abiertos del mismo trabajador — solo tiene sentido ofrecerlo cuando este
   * descanso llegó "suelto" (subido desde Mi Salud, caso propio de un solo descanso). */
  casosCandidatos: CasoCandidatoDto[] = [];
  casoDestinoId: number | null = null;
  vinculando = false;

  // ── Diagnóstico CIE-10 (solo lo asigna el médico al revisar, nunca el trabajador) ──
  dCie10Codigo: string | null = null;

  // ── Worker search (solo modo creación) ───────────────────────────────────
  workerSelected : WorkerSearchItemDto | null = null;

  // ── Formulario creación ───────────────────────────────────────────────────
  cTipoId      : number | null = null;
  cFechaInicio = '';
  cFechaFin    = '';
  cDiagnostico = '';
  cDocumentos  : File[] = [];

  // ── Certificados ──────────────────────────────────────────────────────────
  /** Adjunto que se está trayendo del backend (para bloquear su botón mientras descarga). */
  descargandoId: number | null = null;

  // ── Aprobar / Rechazar ────────────────────────────────────────────────────
  aprobarObs  = '';
  rechazarMotivo = '';

  // ── Alta ─────────────────────────────────────────────────────────────────
  altaObs = '';

  // ── Nuevo seguimiento (solo lo registra el médico, no necesita "tipo") ────
  segNota         = '';
  segProximaCita  = '';
  segCie10Codigo  : string | null = null;
  segConfidencial = true;
  segGuardando    = false;

  // ── Reabrir caso ──────────────────────────────────────────────────────────
  reabriendo = false;

  constructor(
    private svc          : DescansosService,
    private errorService : ErrorService,
    private loaderService: LoaderService,
    private cdr          : ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.descansoId) {
      this.isNuevo = false;
      this.loadDetalle();
    } else {
      this.isNuevo = true;
      this.loading = false;
      // Mismo arranque que Mi Salud: fechas prellenadas con hoy.
      const hoy = new Date().toISOString().slice(0, 10);
      this.cFechaInicio = hoy;
      this.cFechaFin    = hoy;
      if (this.presetWorker) {
        this.workerSelected = this.presetWorker;
      }
      // La pantalla de Descansos ya trae el catálogo en su carga inicial; si el modal se abre
      // desde otra (p. ej. el detalle de un accidente) se pide aquí para no dejar el combo vacío.
      if (this.tipos.length === 0) this.loadTipos();
    }
  }

  // ── Carga ────────────────────────────────────────────────────────────────
  private loadDetalle(): void {
    this.loading = true;
    this.svc.getById(this.descansoId!).subscribe({
      next: d => {
        this.detalle = d;
        this.dCie10Codigo = d.diagnosticoCie10Codigo ?? null;
        this.loading = false;
        this.loadCaso(d.casoId);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.close();
      },
    });
  }

  /** El timeline completo del caso: todos sus descansos ("más descanso" incluido) + estado del alta. */
  private loadCaso(casoId: number): void {
    this.svc.getCasoDetalle(casoId).subscribe({
      next: c => {
        this.caso = c;
        // Solo tiene sentido ofrecer "vincular" cuando este caso es un descanso suelto (nació
        // solo con este) — si ya tiene más de uno, no está "perdido", ya es un caso real.
        if (c.descansos.length === 1) this.loadCandidatos();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private loadCandidatos(): void {
    this.svc.getCasosCandidatos(this.descansoId!).subscribe({
      next: c => { this.casosCandidatos = c; this.cdr.detectChanges(); },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  get esCasoSuelto(): boolean {
    return !!this.caso && this.caso.descansos.length === 1 && this.casosCandidatos.length > 0;
  }

  /** Con una etiqueta legible (fechas + tipo) para el combobox — el componente solo muestra
   * un campo plano, no arma texto compuesto por sí mismo. */
  get casosCandidatosOpts(): Array<CasoCandidatoDto & { label: string }> {
    return this.casosCandidatos.map(c => ({
      ...c,
      label: `Caso #${c.id} — ${c.primerDescansoTipo} (${this.fmtFecha(c.primerDescansoInicio)} → ${this.fmtFecha(c.primerDescansoFin)})`,
    }));
  }

  private fmtFecha(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  vincularCaso(): void {
    if (!this.casoDestinoId) return;
    Swal.fire({
      icon: 'question',
      title: '¿Vincular a ese caso?',
      text: 'Este descanso pasará a formar parte del caso seleccionado, junto con sus seguimientos.',
      showCancelButton: true,
      confirmButtonText: 'Sí, vincular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.vinculando = true;
      this.svc.vincularCaso(this.descansoId!, this.casoDestinoId!).subscribe({
        next: () => {
          this.vinculando = false;
          Swal.fire({ icon: 'success', title: 'Vinculado', timer: 1500, showConfirmButton: false });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.vinculando = false;
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  private loadTipos(): void {
    this.svc.getTipos().subscribe({
      next: t => { this.tipos = t; this.cdr.detectChanges(); },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  loadSeguimientos(): void {
    if (!this.detalle) return;
    this.svc.getSeguimientos(this.detalle.casoId).subscribe({
      next: s => { this.seguimientos = s; this.cdr.detectChanges(); },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  setTab(t: TabKey): void {
    this.tab = t;
    if (t === 'seguimientos' && this.seguimientos.length === 0) this.loadSeguimientos();
    this.cdr.detectChanges();
  }

  // ── Getters de estado ────────────────────────────────────────────────────
  get estado(): string { return this.detalle?.estado ?? ''; }
  get isPendiente(): boolean { return this.estado === 'Pendiente'; }
  get isAprobado(): boolean  { return this.estado === 'Aprobado'; }
  get isCompletado(): boolean { return this.estado === 'Completado'; }
  get casoAbierto(): boolean { return this.caso?.estado !== 'Cerrado'; }
  get casoReabierto(): boolean { return !!this.caso?.fechaReapertura; }
  /** Si el caso ya fue reabierto una vez, exige un descanso nuevo (fecha_inicio posterior a la
   * reapertura) antes de poder dar el alta otra vez — mismo criterio que valida el backend. */
  get faltaDescansoTrasReapertura(): boolean {
    if (!this.caso?.fechaReapertura) return false;
    return !this.caso.descansos.some(d => d.fechaInicio >= this.caso!.fechaReapertura!);
  }
  get canAlta(): boolean { return this.casoAbierto && this.isAprobado && !this.faltaDescansoTrasReapertura; }
  get canProrroga(): boolean { return this.casoAbierto && (this.isAprobado || this.isCompletado); }

  /**
   * Certificados del descanso. Todos son filas de ss_descanso_medico_adjunto — los descansos
   * históricos, que guardaban su único archivo en url_certificado, ya tienen su adjunto creado.
   */
  get certificados(): DescansoAdjuntoDto[] {
    return this.detalle?.adjuntos ?? [];
  }

  /**
   * Abre el certificado médico. El archivo vive en la carpeta de SharePoint configurada en BD y
   * lo sirve el backend con su token de app, así se ve sin depender de que el navegador tenga
   * sesión de Microsoft 365.
   */
  verCertificado(doc: DescansoAdjuntoDto): void {
    if (this.descargandoId !== null) return;
    this.descargandoId = doc.id;
    this.loaderService.show();
    this.cdr.detectChanges();

    this.svc.getCertificado(doc.id).subscribe({
      next: (blob) => {
        this.descargandoId = null;
        this.loaderService.hide();
        abrirCertificado(blob, doc.nombre);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.descargandoId = null;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Prórroga ──────────────────────────────────────────────────────────────
  prorrogaMode    = false;
  pFechaInicio    = '';
  pFechaFin       = '';

  iniciarProrroga(): void {
    // Pre-llenar con el día siguiente a la fecha fin del descanso actual
    const finActual = this.detalle?.fechaFin;
    if (finActual) {
      const d = new Date(finActual);
      d.setDate(d.getDate() + 1);
      this.pFechaInicio = d.toISOString().slice(0, 10);
      const d2 = new Date(d);
      d2.setDate(d2.getDate() + 6);
      this.pFechaFin = d2.toISOString().slice(0, 10);
    }
    this.prorrogaMode = true;
    this.cdr.detectChanges();
  }

  cancelarProrroga(): void { this.prorrogaMode = false; this.cdr.detectChanges(); }

  guardarProrroga(): void {
    if (!this.pFechaInicio || !this.pFechaFin) {
      Swal.fire({ icon: 'warning', title: 'Requerido', text: 'Ingresa las fechas del nuevo descanso.' });
      return;
    }
    // Si el caso ya fue reabierto y todavía no tiene un descanso posterior a esa reapertura,
    // este nuevo descanso va directo sobre el caso (no como "prórroga" de un descanso puntual
    // que ya se cerró con su propia alta histórica).
    const esNuevoTrasReapertura = this.faltaDescansoTrasReapertura;
    const dto: DescansoMedicoCreateDto = {
      workerId      : this.detalle!.workerId,
      // Hereda el tipo del descanso que extiende.
      tipoId        : this.detalle!.tipoId,
      fechaInicio   : this.pFechaInicio,
      fechaFin      : this.pFechaFin,
      prorrogaDelId : esNuevoTrasReapertura ? undefined : this.descansoId!,
      casoId        : esNuevoTrasReapertura ? this.detalle!.casoId : undefined,
    };
    this.saving = true;
    this.loaderService.show();
    this.svc.create(dto).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        this.prorrogaMode = false;
        Swal.fire({ icon: 'success', title: 'Descanso agregado', text: 'Se creó un nuevo descanso dentro del mismo caso.', timer: 2000, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  get title(): string {
    if (this.isNuevo) return 'Nuevo Descanso Médico';
    return `Descanso #${this.descansoId} · ${this.estado}`;
  }

  // ── Creación ─────────────────────────────────────────────────────────────
  onWorkerSelectedChange(w: WorkerSearchItemDto | null): void {
    this.workerSelected = w;
  }

  // La app corre zoneless: tras cambiar estado desde un evento hay que pedir el repintado.
  onFechaInicioChange(v: string | null): void {
    this.cFechaInicio = v ?? '';
    // Si la fecha fin quedó antes del nuevo inicio, se arrastra para no dejar un rango inválido.
    if (this.cFechaFin && this.cFechaInicio && this.cFechaFin < this.cFechaInicio) this.cFechaFin = this.cFechaInicio;
    this.cdr.detectChanges();
  }

  onFechaFinChange(v: string | null): void {
    this.cFechaFin = v ?? '';
    this.cdr.detectChanges();
  }

  onDocumentosChange(archivos: File[]): void {
    this.cDocumentos = archivos;
    this.cdr.detectChanges();
  }

  onProrrogaInicioChange(v: string | null): void {
    this.pFechaInicio = v ?? '';
    if (this.pFechaFin && this.pFechaInicio && this.pFechaFin < this.pFechaInicio) this.pFechaFin = this.pFechaInicio;
    this.cdr.detectChanges();
  }

  onProrrogaFinChange(v: string | null): void {
    this.pFechaFin = v ?? '';
    this.cdr.detectChanges();
  }

  onProximaCitaChange(v: string | null): void {
    this.segProximaCita = v ?? '';
    this.cdr.detectChanges();
  }

  /** Días de descanso del rango elegido (ambos extremos incluidos). */
  get diasCalculados(): number {
    if (!this.cFechaInicio || !this.cFechaFin) return 0;
    const dias = Math.round(
      (new Date(this.cFechaFin).getTime() - new Date(this.cFechaInicio).getTime()) / 86400000,
    ) + 1;
    return dias > 0 ? dias : 0;
  }

  get canCreate(): boolean {
    return !!(this.workerSelected && this.cTipoId && this.cFechaInicio && this.cFechaFin) && !this.saving;
  }

  crear(): void {
    if (!this.canCreate || !this.workerSelected) return;
    if (this.cFechaFin < this.cFechaInicio) {
      Swal.fire({ icon: 'warning', title: 'Fechas inválidas', text: 'La fecha de fin no puede ser anterior a la de inicio.' });
      return;
    }
    const dto: DescansoMedicoCreateDto = {
      workerId    : this.workerSelected.id,
      tipoId      : this.cTipoId!,
      fechaInicio : this.cFechaInicio,
      fechaFin    : this.cFechaFin,
      diagnostico : this.cDiagnostico      || undefined,
      accidenteId : this.presetAccidenteId ?? undefined,
    };
    this.saving = true;
    this.loaderService.show();
    this.svc.create(dto, this.cDocumentos).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Registrado', timer: 1400, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Aprobar ───────────────────────────────────────────────────────────────
  aprobar(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar descanso?',
      text: 'El trabajador será bloqueado automáticamente en Control de Acceso.',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
    }).then(r => {
      if (!r.isConfirmed) return;
      const dto: DescansoAprobarDto = { observaciones: this.aprobarObs || undefined };
      this.saving = true;
      this.loaderService.show();
      this.svc.aprobar(this.descansoId!, dto).subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Aprobado', text: 'Trabajador bloqueado en Control de Acceso.', timer: 2000, showConfirmButton: false });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  // ── Rechazar ─────────────────────────────────────────────────────────────
  rechazar(): void {
    if (!this.rechazarMotivo.trim()) {
      Swal.fire({ icon: 'warning', title: 'Requerido', text: 'Ingrese el motivo de rechazo.' });
      return;
    }
    const dto: DescansoRechazarDto = { motivoRechazo: this.rechazarMotivo };
    this.saving = true;
    this.loaderService.show();
    this.svc.rechazar(this.descansoId!, dto).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({ icon: 'info', title: 'Rechazado', timer: 1400, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Alta (cierra el CASO, no un descanso individual) ─────────────────────
  darAlta(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Dar de alta al trabajador?',
      text: 'El caso se cerrará, todos sus descansos aprobados pasan a Completado, y el trabajador será desbloqueado.',
      showCancelButton: true,
      confirmButtonText: 'Sí, dar alta',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
    }).then(r => {
      if (!r.isConfirmed) return;
      const dto: DarAltaDto = { observaciones: this.altaObs || undefined };
      this.saving = true;
      this.loaderService.show();
      this.svc.darAlta(this.detalle!.casoId, dto).subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Alta registrada', text: 'Trabajador desbloqueado.', timer: 2000, showConfirmButton: false });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  // ── Reabrir caso ──────────────────────────────────────────────────────────
  reabrirCaso(): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Reabrir este caso?',
      text: 'Vas a poder registrar un nuevo descanso médico sobre el mismo caso. El alta anterior queda en el historial.',
      showCancelButton: true,
      confirmButtonText: 'Sí, reabrir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d97706',
    }).then(r => {
      if (!r.isConfirmed) return;
      const dto: ReabrirCasoDto = {};
      this.reabriendo = true;
      this.svc.reabrirCaso(this.detalle!.casoId, dto).subscribe({
        next: () => {
          this.reabriendo = false;
          Swal.fire({ icon: 'success', title: 'Caso reabierto', timer: 1500, showConfirmButton: false });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.reabriendo = false;
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  // ── Diagnóstico CIE-10 (solo el médico, al revisar — en cualquier estado) ─
  guardarCie10(): void {
    if (!this.detalle) return;
    this.saving = true;
    this.svc.asignarDiagnosticoCie10(this.descansoId!, this.dCie10Codigo).subscribe({
      next: () => {
        this.saving = false;
        Swal.fire({ icon: 'success', title: 'Diagnóstico guardado', timer: 1200, showConfirmButton: false });
        this.loadDetalle();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Seguimiento ───────────────────────────────────────────────────────────
  guardarSeguimiento(): void {
    if (!this.segNota.trim()) {
      Swal.fire({ icon: 'warning', title: 'Requerido', text: 'La nota es obligatoria.' });
      return;
    }
    const dto: DescansoSeguimientoCreateDto = {
      nota                : this.segNota        || undefined,
      proximaCita         : this.segProximaCita || undefined,
      diagnosticoCie10Codigo: this.segCie10Codigo ?? undefined,
      confidencial        : this.segConfidencial,
    };
    this.segGuardando = true;
    this.svc.createSeguimiento(this.detalle!.casoId, dto).subscribe({
      next: () => {
        this.segGuardando = false;
        this.segNota = '';
        this.segProximaCita = '';
        this.segCie10Codigo = null;
        Swal.fire({ icon: 'success', title: 'Seguimiento registrado', timer: 1200, showConfirmButton: false });
        this.loadSeguimientos();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.segGuardando = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  close(): void { this.closed.emit(); }

  // ── Helpers de vista ──────────────────────────────────────────────────────
  estadoBadgeClass(estado: string): string {
    return {
      'Pendiente' : 'badge-amber',
      'Aprobado'  : 'badge-green',
      'Rechazado' : 'badge-red',
      'Completado': 'badge-blue',
    }[estado] ?? 'badge-gray';
  }
}
