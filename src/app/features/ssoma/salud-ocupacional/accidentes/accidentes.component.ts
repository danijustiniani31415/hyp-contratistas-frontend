import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';
import { AccidentesService } from './accidentes.service';
import { DescansoModalComponent } from '../descansos/descanso-modal.component';
import { WorkerSearchItemDto } from '../dtos/worker-search.model';
import {
  AccidenteTrabajoListItemDto,
  AccidenteFilterDto,
  AccidenteTrabajoDetalleDto,
  TipoItemDto,
  TiposSeguimientoDto,
  CitaMedicaCreateDto,
  EquipoPrestadoCreateDto,
  EquipoPrestadoDevolverDto,
  AltaMedicaCreateDto,
  AccidenteTrabajoUpdateDto,
} from './accidentes.dtos';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { CatalogosSaludService } from '../services/catalogos-salud.service';
import { AgenteRiesgoDto } from '../dtos/catalogos.model';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { WorkerSearchInput } from '../shared/worker-search-input/worker-search-input';

@Component({
  selector: 'app-accidentes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AbrilPageHeaderComponent,
    Paginator,
    DescansoModalComponent,
    FilterTriggerButton,
    FilterModal,
    SearchSelect,
    StatusBadge,
    TitleCasePipe,
    WorkerSearchInput,
  ],
  templateUrl: './accidentes.component.html',
  styleUrl: './accidentes.component.css',
})
export class AccidentesComponent implements OnInit, OnDestroy {
  readonly tabs = SSOMA_TABS;
  readonly anioActual = new Date().getFullYear();
  readonly pageSize = 20;

  accidentes: AccidenteTrabajoListItemDto[] = [];
  loading = false;
  totalPages = 1;
  totalRecords = 0;
  currentPage = 1;

  filtros: AccidenteFilterDto = {};
  workerFiltroSelected: WorkerSearchItemDto | null = null;

  // Panel de detalle
  detalle: AccidenteTrabajoDetalleDto | null = null;
  loadingDetalle = false;
  detalleTab: 'info' | 'descansos' | 'citas' | 'equipos' | 'alta' = 'info';

  readonly estadoOpts = [
    { id: '', nombre: 'Todos' },
    { id: 'Abierto', nombre: 'Abierto' },
    { id: 'Cerrado', nombre: 'Cerrado' },
  ];

  filtrosAbiertos = false;

  // Catálogos
  tiposCita: TipoItemDto[] = [];
  tiposEquipo: TipoItemDto[] = [];
  tiposAlta: TipoItemDto[] = [];
  agentesRiesgo: AgenteRiesgoDto[] = [];
  savingAgenteRiesgo = false;

  /** `agentesRiesgo` con label combinado (tipo — nombre) para el combobox. */
  get agentesRiesgoForSelect(): { id: number; label: string }[] {
    return this.agentesRiesgo.map((ag) => ({ id: ag.id, label: `${ag.tipo} — ${ag.nombre}` }));
  }

  // --- Formularios inline ---

  // Citas
  showFormCita = false;
  editingCitaId: number | null = null;
  formCita: CitaMedicaCreateDto = this.initCita();

  // Equipos
  showFormEquipo = false;
  formEquipo: EquipoPrestadoCreateDto = this.initEquipo();
  showFormDevolucion = false;
  devolucionEquipoId: number | null = null;
  formDevolucion: EquipoPrestadoDevolverDto = { fechaDevolucion: '' };

  // Alta médica
  showFormAlta = false;
  formAlta: AltaMedicaCreateDto = this.initAlta();

  // Descansos (nuevo)
  showDescansoModal = false;

  saving = false;

  private destroy$ = new Subject<void>();

  constructor(
    private svc: AccidentesService,
    private catalogosSaludService: CatalogosSaludService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load(1);
    this.loadTipos();
    this.catalogosSaludService.getAgentesRiesgo().subscribe({
      next: (data) => { this.agentesRiesgo = data; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private initCita(): CitaMedicaCreateDto {
    return { tipoId: 0, fechaCita: '', horaCita: '', clinica: '', medico: '', diagnostico: '', indicaciones: '', proximaCita: '', observaciones: '' };
  }

  private initEquipo(): EquipoPrestadoCreateDto {
    return { tipoEquipoId: 0, cantidad: 1, fechaPrestamo: '', observaciones: '' };
  }

  private initAlta(): AltaMedicaCreateDto {
    return { tipoId: 0, fechaAlta: '', medico: '', diagnosticoFinal: '', tieneRestriccion: false, descripcionRestriccion: '', fechaFinRestriccion: '', observaciones: '' };
  }

  loadTipos(): void {
    this.svc.getTiposSeguimiento().subscribe({
      next: (t: TiposSeguimientoDto) => {
        this.tiposCita = t.tiposCita;
        this.tiposEquipo = t.tiposEquipo;
        this.tiposAlta = t.tiposAlta;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getList({ ...this.filtros, page }).subscribe({
      next: (res: PagedResponseDTO<AccidenteTrabajoListItemDto>) => {
        this.accidentes   = res.data;
        this.currentPage  = res.page;
        this.totalPages   = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        this.loading      = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  onFilterChange(): void { this.load(1); }
  onPageChange(p: number): void { this.load(p); }

  onWorkerFiltroChange(w: WorkerSearchItemDto | null): void {
    this.workerFiltroSelected = w;
    this.filtros.workerId = w?.id;
    this.load(1);
  }

  limpiarFiltros(): void {
    this.filtros = {};
    this.workerFiltroSelected = null;
    this.load(1);
  }

  openDetalle(a: AccidenteTrabajoListItemDto): void {
    this.detalle = null;
    this.detalleTab = 'info';
    this.loadingDetalle = true;
    this.resetForms();
    this.cdr.detectChanges();
    this.svc.getDetalle(a.id).subscribe({
      next: (d) => {
        this.detalle = d;
        this.loadingDetalle = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDetalle = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  closeDetalle(): void {
    this.detalle = null;
    this.loadingDetalle = false;
    this.resetForms();
    this.cdr.detectChanges();
  }

  resetForms(): void {
    this.showFormCita = false;
    this.editingCitaId = null;
    this.formCita = this.initCita();
    this.showFormEquipo = false;
    this.formEquipo = this.initEquipo();
    this.showFormDevolucion = false;
    this.devolucionEquipoId = null;
    this.formDevolucion = { fechaDevolucion: '' };
    this.showFormAlta = false;
    this.formAlta = this.initAlta();
  }

  reloadDetalle(): void {
    if (!this.detalle) return;
    this.svc.getDetalle(this.detalle.id).subscribe({
      next: (d) => {
        this.detalle = d;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  // ── Cerrar accidente ─────────────────────────────────────────────

  cerrarAccidente(): void {
    if (!this.detalle) return;
    const id = this.detalle.id;
    Swal.fire({
      icon: 'question',
      title: '¿Cerrar accidente?',
      html: `<p style="font-size:13px">Se cerrará el accidente #${id}. Esta acción requiere que exista un alta médica registrada y sin descansos pendientes.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.svc.cerrar(id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Accidente cerrado', timer: 1800, showConfirmButton: false });
          this.closeDetalle();
          this.load(this.currentPage);
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  marcarReinduccion(a: AccidenteTrabajoListItemDto, ev: MouseEvent): void {
    ev.stopPropagation();
    Swal.fire({
      icon: 'question',
      title: 'Confirmar reinducción de seguridad',
      html: `<p style="font-size:13px">¿Confirmas que <strong>${a.workerNombre ?? 'el trabajador'}</strong> completó la charla de reinducción de seguridad y está autorizado para reintegrarse?</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.marcarReinduccion(a.id).subscribe({
        next: () => {
          a.reinduccionCompletada = true;
          a.fechaReinduccion = new Date().toISOString().split('T')[0];
          this.cdr.detectChanges();
          Swal.fire({ icon: 'success', title: 'Reinducción registrada', timer: 1800, showConfirmButton: false });
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  // ── Citas médicas ────────────────────────────────────────────────

  abrirFormCita(cita?: { id: number; tipoId: number; fechaCita: string; horaCita?: string; clinica?: string; medico?: string; diagnostico?: string; indicaciones?: string; proximaCita?: string; observaciones?: string }): void {
    this.editingCitaId = cita?.id ?? null;
    this.formCita = cita
      ? { tipoId: cita.tipoId, fechaCita: cita.fechaCita, horaCita: cita.horaCita ?? '', clinica: cita.clinica ?? '', medico: cita.medico ?? '', diagnostico: cita.diagnostico ?? '', indicaciones: cita.indicaciones ?? '', proximaCita: cita.proximaCita ?? '', observaciones: cita.observaciones ?? '' }
      : this.initCita();
    this.showFormCita = true;
    this.cdr.detectChanges();
  }

  guardarCita(): void {
    if (!this.detalle) return;
    if (!this.formCita.tipoId || !this.formCita.fechaCita) {
      Swal.fire({ icon: 'warning', title: 'Completa los campos obligatorios', text: 'Tipo de cita y fecha son obligatorios.', confirmButtonColor: '#0F6E56' });
      return;
    }
    this.saving = true;
    const dto = { ...this.formCita };
    if (!dto.horaCita) delete dto.horaCita;
    if (!dto.proximaCita) delete dto.proximaCita;

    const obs$ = this.editingCitaId
      ? this.svc.updateCita(this.editingCitaId, dto)
      : this.svc.createCita(this.detalle.id, dto);

    obs$.subscribe({
      next: () => {
        this.saving = false;
        this.showFormCita = false;
        this.editingCitaId = null;
        this.formCita = this.initCita();
        this.reloadDetalle();
        Swal.fire({ icon: 'success', title: 'Cita guardada', timer: 1600, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  eliminarCita(citaId: number): void {
    Swal.fire({ icon: 'question', title: '¿Eliminar cita?', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#b91c1c' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.svc.deleteCita(citaId).subscribe({
          next: () => { this.reloadDetalle(); Swal.fire({ icon: 'success', title: 'Cita eliminada', timer: 1400, showConfirmButton: false }); },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      });
  }

  // ── Equipos prestados ────────────────────────────────────────────

  guardarEquipo(): void {
    if (!this.detalle) return;
    if (!this.formEquipo.tipoEquipoId || !this.formEquipo.fechaPrestamo || this.formEquipo.cantidad < 1) {
      Swal.fire({ icon: 'warning', title: 'Completa los campos obligatorios', text: 'Tipo, cantidad y fecha de préstamo son obligatorios.', confirmButtonColor: '#0F6E56' });
      return;
    }
    this.saving = true;
    this.svc.createEquipo(this.detalle.id, this.formEquipo).subscribe({
      next: () => {
        this.saving = false;
        this.showFormEquipo = false;
        this.formEquipo = this.initEquipo();
        this.reloadDetalle();
        Swal.fire({ icon: 'success', title: 'Equipo registrado', timer: 1600, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  abrirDevolucion(equipoId: number): void {
    this.devolucionEquipoId = equipoId;
    this.formDevolucion = { fechaDevolucion: '' };
    this.showFormDevolucion = true;
    this.cdr.detectChanges();
  }

  guardarDevolucion(): void {
    if (!this.devolucionEquipoId || !this.formDevolucion.fechaDevolucion) {
      Swal.fire({ icon: 'warning', title: 'La fecha de devolución es obligatoria.', confirmButtonColor: '#0F6E56' });
      return;
    }
    this.saving = true;
    this.svc.devolverEquipo(this.devolucionEquipoId, this.formDevolucion).subscribe({
      next: () => {
        this.saving = false;
        this.showFormDevolucion = false;
        this.devolucionEquipoId = null;
        this.reloadDetalle();
        Swal.fire({ icon: 'success', title: 'Devolución registrada', timer: 1600, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  eliminarEquipo(equipoId: number): void {
    Swal.fire({ icon: 'question', title: '¿Eliminar préstamo?', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#b91c1c' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.svc.deleteEquipo(equipoId).subscribe({
          next: () => { this.reloadDetalle(); Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1400, showConfirmButton: false }); },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      });
  }

  // ── Alta médica ──────────────────────────────────────────────────

  abrirFormAlta(): void {
    const alta = this.detalle?.altaMedica;
    this.formAlta = alta
      ? { tipoId: alta.tipoId, fechaAlta: alta.fechaAlta, medico: alta.medico ?? '', diagnosticoFinal: alta.diagnosticoFinal ?? '', tieneRestriccion: alta.tieneRestriccion, descripcionRestriccion: alta.descripcionRestriccion ?? '', fechaFinRestriccion: alta.fechaFinRestriccion ?? '', observaciones: alta.observaciones ?? '' }
      : this.initAlta();
    this.showFormAlta = true;
    this.cdr.detectChanges();
  }

  guardarAlta(): void {
    if (!this.detalle) return;
    if (!this.formAlta.tipoId || !this.formAlta.fechaAlta) {
      Swal.fire({ icon: 'warning', title: 'Completa los campos obligatorios', text: 'Tipo de alta y fecha son obligatorios.', confirmButtonColor: '#0F6E56' });
      return;
    }
    if (this.formAlta.tieneRestriccion && !this.formAlta.descripcionRestriccion?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Describe la restricción', confirmButtonColor: '#0F6E56' });
      return;
    }
    this.saving = true;
    const dto = { ...this.formAlta };
    if (!dto.fechaFinRestriccion) delete dto.fechaFinRestriccion;

    const obs$ = this.detalle.altaMedica
      ? this.svc.updateAlta(this.detalle.id, dto)
      : this.svc.createAlta(this.detalle.id, dto);

    obs$.subscribe({
      next: () => {
        this.saving = false;
        this.showFormAlta = false;
        this.reloadDetalle();
        Swal.fire({ icon: 'success', title: 'Alta médica guardada', timer: 1800, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  eliminarAlta(): void {
    if (!this.detalle) return;
    Swal.fire({ icon: 'question', title: '¿Eliminar alta médica?', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#b91c1c' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.svc.deleteAlta(this.detalle!.id).subscribe({
          next: () => { this.reloadDetalle(); Swal.fire({ icon: 'success', title: 'Alta eliminada', timer: 1400, showConfirmButton: false }); },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      });
  }

  // ── Agente de riesgo (edición inline) ─────────────────────────────

  guardarAgenteRiesgo(agenteRiesgoId: number | string | null): void {
    if (!this.detalle) return;
    const id = agenteRiesgoId ? Number(agenteRiesgoId) : null;
    if (id === (this.detalle.agenteRiesgoId ?? null)) return;

    const dto: AccidenteTrabajoUpdateDto = {
      lugarAccidente: this.detalle.lugarAccidente,
      tipoAccidente: this.detalle.tipoAccidente,
      mecanismo: this.detalle.mecanismo,
      parteCuerpoAfectada: this.detalle.parteCuerpoAfectada,
      agenteRiesgoId: id,
      descripcion: this.detalle.descripcion ?? '',
      descripcionLesion: this.detalle.descripcionLesion,
      diagnosticoCie10: this.detalle.diagnosticoCie10,
      requiereHospitalizacion: this.detalle.requiereHospitalizacion,
      hospitalNombre: this.detalle.hospitalNombre,
      diasDescansoEstimados: this.detalle.diasDescansoEstimados,
      diasDescansoReales: this.detalle.diasDescansoReales,
      notificadoSunafil: this.detalle.notificadoSunafil,
      fechaNotificacionSunafil: this.detalle.fechaNotificacionSunafil,
      numeroNotificacionSunafil: this.detalle.numeroNotificacionSunafil,
      restriccionesReintegro: this.detalle.restriccionesReintegro,
    };

    this.savingAgenteRiesgo = true;
    this.svc.updateAccidente(this.detalle.id, dto).subscribe({
      next: () => {
        this.savingAgenteRiesgo = false;
        this.reloadDetalle();
      },
      error: (err: HttpErrorResponse) => {
        this.savingAgenteRiesgo = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Descansos (nuevo, vinculado al accidente) ─────────────────────

  get presetWorkerDescanso(): WorkerSearchItemDto | null {
    if (!this.detalle) return null;
    return {
      id: this.detalle.workerId,
      apellidoNombre: this.detalle.workerNombre ?? `Worker #${this.detalle.workerId}`,
      dni: this.detalle.workerDni ?? '',
      puesto: '',
      activo: true,
      empresaActualId: undefined,
      empresaActual: this.detalle.empresaNombre,
    };
  }

  abrirNuevoDescanso(): void {
    this.showDescansoModal = true;
    this.cdr.detectChanges();
  }

  cerrarDescansoModal(): void {
    this.showDescansoModal = false;
    this.cdr.detectChanges();
  }

  onDescansoGuardado(): void {
    this.cerrarDescansoModal();
    this.reloadDetalle();
  }

  // ── Helpers ──────────────────────────────────────────────────────

  get hasFilters(): boolean {
    return !!(this.filtros.fechaDesde || this.filtros.fechaHasta
           || this.filtros.workerId  || this.filtros.estado);
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtros.fechaDesde) n++;
    if (this.filtros.fechaHasta) n++;
    if (this.filtros.workerId) n++;
    if (this.filtros.estado) n++;
    return n;
  }
}
