import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  ControlSemanaDto, ControlSemanaLineaDto, DashboardPresupuestoDto, DashboardTipoDto,
  AbrirSemanaDto, RegistrarConsumoLineaDto,
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import Swal from 'sweetalert2';

type TabActiva = 'dashboard' | 'semanas' | 'registro';

@Component({
  selector: 'app-control-semana',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, AbrilPageHeaderComponent,
    FilterTriggerButton, FilterModal, SearchInput, SearchSelect, Paginator,
  ],
  templateUrl: './control-semana.html',
  styleUrl: './control-semana.css',
})
export class ControlSemanaPage implements OnInit, OnDestroy {
  private svc    = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error  = inject(ErrorService);
  private cdr    = inject(ChangeDetectorRef);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  presupuestoId!: number;
  tab: TabActiva = 'dashboard';
  loading = false;

  // Dashboard
  dashboard: DashboardPresupuestoDto | null = null;
  tipoAbierto: Set<number> = new Set();
  private pollSub?: Subscription;

  // Historial de semanas
  semanas: ControlSemanaDto[] = [];
  searchText = '';
  estadoFilter: string | null = null;
  readonly estadoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: 'ABIERTO', label: 'Abierto' },
    { value: 'CERRADO', label: 'Cerrado' },
  ];
  filtrosAbiertos = false;
  private readonly pager = new ClientPager<ControlSemanaDto>();

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.estadoFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.estadoFilter = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
    this.cdr.markForCheck();
  }

  get filteredSemanas(): ControlSemanaDto[] {
    return this.semanas.filter((s) => {
      const texto = `Semana ${s.semanaNum} ${s.observaciones ?? ''}`;
      const matchesTexto = !this.searchText.trim() || SearchInput.matches(texto, this.searchText);
      const matchesEstado = this.estadoFilter === null || s.estado === this.estadoFilter;
      return matchesTexto && matchesEstado;
    });
  }

  get currentPage(): number { return this.pager.currentPage; }
  get totalPages(): number { return this.pager.totalPages(this.filteredSemanas); }
  get pagedSemanas(): ControlSemanaDto[] { return this.pager.page(this.filteredSemanas); }
  changePage(page: number): void { this.pager.goTo(page); }

  // Registro
  formAbrir: AbrirSemanaDto = { presupuestoId: 0, fechaInicio: '', fechaFin: '' };
  semanaActiva: ControlSemanaDto | null = null;
  lineasRegistro: RegistrarConsumoLineaDto[] = [];
  guardandoConsumo = false;

  ngOnInit(): void {
    this.presupuestoId = Number(this.route.snapshot.paramMap.get('presupuestoId'));
    this.formAbrir.presupuestoId = this.presupuestoId;
    this.loadDashboard();
    this.loadSemanas();
    // Polling cada 60s
    this.pollSub = interval(60_000).pipe(
      switchMap(() => this.svc.getDashboard(this.presupuestoId)),
    ).subscribe({
      next: (d) => { this.dashboard = d; this.cdr.markForCheck(); },
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  setTab(t: TabActiva): void { this.tab = t; this.cdr.markForCheck(); }

  // ── Dashboard ─────────────────────────────────────────────────────

  loadDashboard(): void {
    this.loading = true;
    this.svc.getDashboard(this.presupuestoId).subscribe({
      next: (d) => {
        this.dashboard = d;
        d.tipos.forEach((t) => this.tipoAbierto.add(t.tipoId));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggleTipo(tipoId: number): void {
    if (this.tipoAbierto.has(tipoId)) this.tipoAbierto.delete(tipoId);
    else this.tipoAbierto.add(tipoId);
    this.cdr.markForCheck();
  }

  semaforoClass(s: string): string {
    switch (s) {
      case 'OK':            return 'sem-ok';
      case 'ADVERTENCIA':   return 'sem-warn';
      case 'ALERTA':        return 'sem-alert';
      case 'SIN_PRESUPUESTO': return 'sem-none';
      default:              return '';
    }
  }

  semaforoLabel(s: string): string {
    switch (s) {
      case 'OK':            return '✓ OK';
      case 'ADVERTENCIA':   return '⚠ ADVERTENCIA';
      case 'ALERTA':        return '✗ ALERTA';
      case 'SIN_PRESUPUESTO': return '— SIN PPTO.';
      default:              return s;
    }
  }

  pctBar(pct: number): number { return Math.min(pct, 100); }

  barClass(pct: number): string {
    if (pct >= 100) return 'bar-alert';
    if (pct >= 80)  return 'bar-warn';
    return 'bar-ok';
  }

  // ── Semanas ───────────────────────────────────────────────────────

  loadSemanas(): void {
    this.svc.getSemanasPorPresupuesto(this.presupuestoId).subscribe({
      next: (s) => { this.semanas = s; this.pager.reset(); this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.error.handleError(err); },
    });
  }

  abrirRegistro(s: ControlSemanaDto): void {
    this.semanaActiva = s;
    // Pre-cargar líneas existentes
    this.lineasRegistro = s.lineas.map((l) => ({
      familiaId:    l.familiaId,
      cantidadReal: l.cantidadReal,
      precioUnitario: l.precioUnitario ?? undefined,
      notas:        l.notas ?? undefined,
    }));
    // Si el dashboard tiene familias, rellenar las que faltan con 0
    if (this.dashboard) {
      const existentes = new Set(this.lineasRegistro.map((l) => l.familiaId));
      this.dashboard.tipos.forEach((t) =>
        t.familias.forEach((f) => {
          if (!existentes.has(f.familiaId)) {
            this.lineasRegistro.push({ familiaId: f.familiaId, cantidadReal: 0 });
          }
        }),
      );
    }
    this.setTab('registro');
  }

  // ── Abrir semana ──────────────────────────────────────────────────

  abrirSemana(): void {
    if (!this.formAbrir.fechaInicio || !this.formAbrir.fechaFin) {
      Swal.fire({ icon: 'warning', title: 'Fechas requeridas', text: 'Ingrese fecha de inicio y fin.' });
      return;
    }
    this.loader.show();
    this.svc.abrirSemana(this.formAbrir).subscribe({
      next: (s) => {
        this.loader.hide();
        this.semanas.unshift(s);
        this.formAbrir = { presupuestoId: this.presupuestoId, fechaInicio: '', fechaFin: '' };
        this.abrirRegistro(s);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Guardar consumo ───────────────────────────────────────────────

  guardarConsumo(): void {
    if (!this.semanaActiva) return;
    this.guardandoConsumo = true;
    this.loader.show();
    const lineas = this.lineasRegistro.filter((l) => l.cantidadReal > 0);
    this.svc.registrarConsumo(this.semanaActiva.id, lineas).subscribe({
      next: (s) => {
        this.guardandoConsumo = false;
        this.loader.hide();
        // Actualizar la semana en la lista
        const idx = this.semanas.findIndex((x) => x.id === s.id);
        if (idx >= 0) this.semanas[idx] = s;
        this.semanaActiva = s;
        Swal.fire({ icon: 'success', title: 'Consumo registrado', timer: 1500, showConfirmButton: false });
        this.loadDashboard();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoConsumo = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cerrarSemana(): void {
    if (!this.semanaActiva) return;
    Swal.fire({
      icon: 'question',
      title: '¿Cerrar semana?',
      text: 'No se podrá modificar el consumo una vez cerrada.',
      showCancelButton: true,
      confirmButtonText: 'Cerrar semana',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loader.show();
      this.svc.cerrarSemana(this.semanaActiva!.id).subscribe({
        next: (s) => {
          this.loader.hide();
          const idx = this.semanas.findIndex((x) => x.id === s.id);
          if (idx >= 0) this.semanas[idx] = s;
          this.semanaActiva = null;
          this.setTab('semanas');
          Swal.fire({ icon: 'success', title: 'Semana cerrada', timer: 1500, showConfirmButton: false });
          this.loadDashboard();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.loader.hide();
          this.error.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  nombreFamilia(familiaId: number): string {
    if (!this.dashboard) return String(familiaId);
    for (const t of this.dashboard.tipos) {
      const f = t.familias.find((x) => x.familiaId === familiaId);
      if (f) return f.nombreFamilia;
    }
    return String(familiaId);
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/presupuesto', this.presupuestoId]);
  }

  get tituloProyecto(): string {
    return this.dashboard?.projectDescription ?? `Presupuesto #${this.presupuestoId}`;
  }
}
