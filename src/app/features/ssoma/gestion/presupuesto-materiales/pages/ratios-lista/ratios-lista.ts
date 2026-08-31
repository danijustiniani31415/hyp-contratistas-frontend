import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  FamiliaConRatioDto,
  RatioFamiliaComparacionDto,
  RatioProyectoItemDto,
  ResumenRatiosDto,
  TipoDriverRatio,
  RatioDriverComparacionDto,
  RatioDriverProyectoDto,
} from '../../presupuesto.dtos';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

@Component({
  selector: 'app-ratios-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchInput, SearchSelect],
  templateUrl: './ratios-lista.html',
  styleUrl: './ratios-lista.css',
})
export class RatiosListaPage implements OnInit {
  readonly headerTabs = PRESUPUESTO_TABS;
  private svc = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  familias: FamiliaConRatioDto[] = [];
  loading = false;
  filtro = '';
  tipoSeleccionado = '';
  variableBaseSeleccionada = '';
  filtrosAbiertos = false;

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtro.trim()) n++;
    if (this.tipoSeleccionado) n++;
    if (this.variableBaseSeleccionada) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filtro = '';
    this.tipoSeleccionado = '';
    this.variableBaseSeleccionada = '';
    this.cdr.markForCheck();
  }

  detalles: Map<number, RatioFamiliaComparacionDto> = new Map();
  cargandoDetalleIds: Set<number> = new Set();
  actualizandoProjectId: number | null = null;

  // ── Resumen general ────────────────────────────────────────────────
  resumen: ResumenRatiosDto | null = null;
  loadingResumen = false;
  calculandoTodos = false;

  // ── Ratios de dotación (HH / N Trabajadores por m2) ─────────────────
  hhComparacion: RatioDriverComparacionDto | null = null;
  trabajadoresComparacion: RatioDriverComparacionDto | null = null;
  loadingDrivers = false;
  calculandoDrivers = false;
  actualizandoDriverProjectId: number | null = null;

  ngOnInit(): void {
    this.load();
    this.loadResumen();
    this.loadDrivers();
  }

  loadDrivers(): void {
    this.loadingDrivers = true;
    this.cdr.markForCheck();
    this.svc.getComparacionDriver('HH').subscribe({
      next: (d) => { this.hhComparacion = d; this.loadingDrivers = false; this.cdr.markForCheck(); },
      error: () => { this.loadingDrivers = false; this.cdr.markForCheck(); },
    });
    this.svc.getComparacionDriver('TRABAJADORES').subscribe({
      next: (d) => { this.trabajadoresComparacion = d; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  /** Calcula ratios de TODOS los proyectos con consumo SSOMA estandarizado de una sola vez — evita
   * tener que entrar a la ficha de cada proyecto y darle "Calcular ratios" uno por uno. */
  calcularTodosLosRatios(): void {
    if (this.calculandoTodos) return;
    this.calculandoTodos = true;
    this.loader.show();
    this.svc.calcularRatiosTodos().subscribe({
      next: (res) => {
        this.calculandoTodos = false;
        this.loader.hide();
        const conAdvertencias = res.proyectos.filter((p) => p.advertencias.length > 0).length;
        Swal.fire({
          icon: 'success',
          title: 'Ratios calculados',
          text: `${res.totalProyectosProcesados} proyecto(s) procesados.` +
            (conAdvertencias > 0 ? ` ${conAdvertencias} con alguna advertencia (revisa la consola/detalle).` : ''),
        });
        this.load();
        this.loadResumen();
      },
      error: (err: HttpErrorResponse) => {
        this.calculandoTodos = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  calcularDrivers(): void {
    if (this.calculandoDrivers) return;
    this.calculandoDrivers = true;
    this.loader.show();
    this.svc.calcularRatiosDrivers().subscribe({
      next: (res) => {
        this.calculandoDrivers = false;
        this.loader.hide();
        Swal.fire({
          icon: 'success',
          title: 'Ratios de dotación calculados',
          text: `${res.ratiosCalculados} ratio(s) calculados. ${res.proyectosSinTareo} proyecto(s) con área techada quedaron sin ratio de HH por falta de Tareo registrado (Trabajadores no depende del Tareo, se calcula aparte).`,
        });
        this.loadDrivers();
      },
      error: (err: HttpErrorResponse) => {
        this.calculandoDrivers = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggleIncluidoDriver(tipo: TipoDriverRatio, p: RatioDriverProyectoDto): void {
    if (this.actualizandoDriverProjectId === p.projectId) return;
    this.actualizandoDriverProjectId = p.projectId;
    this.cdr.markForCheck();
    this.svc.actualizarIncluidoManualDriver(tipo, p.projectId, !p.incluidoManual).subscribe({
      next: () => {
        this.actualizandoDriverProjectId = null;
        this.loadDrivers();
      },
      error: (err: HttpErrorResponse) => {
        this.actualizandoDriverProjectId = null;
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  driverTipoLabel(tipo: TipoDriverRatio): string {
    return tipo === 'HH'
      ? 'Horas-Hombre por m² de área techada (desde Tareo real)'
      : 'Trabajadores distintos por m² de área techada (total que pasó por la obra)';
  }

  loadResumen(): void {
    this.loadingResumen = true;
    this.svc.getResumenRatios().subscribe({
      next: (r) => {
        this.resumen = r;
        this.loadingResumen = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingResumen = false;
        this.cdr.markForCheck();
      },
    });
  }

  irAProyecto(projectId: number): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/proyecto', projectId]);
  }

  load(): void {
    this.loading = true;
    this.loader.show();
    this.svc.listarFamiliasConRatio().subscribe({
      next: (f) => {
        this.familias = f;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
        // Todas abiertas por defecto: se carga el detalle de cada una.
        f.forEach((fam) => this.cargarDetalle(fam.familiaId));
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get tiposDisponibles(): string[] {
    return Array.from(new Set(this.familias.map((f) => f.tipoMaterial))).sort();
  }

  get tiposFilterOptions(): { value: string; label: string }[] {
    return this.tiposDisponibles.map((t) => ({ value: t, label: t }));
  }

  get variableBasesFilterOptions(): { value: string; label: string }[] {
    return this.variableBasesDisponibles.map((vb) => ({ value: vb, label: this.driverLabel(vb) }));
  }

  get variableBasesDisponibles(): string[] {
    return Array.from(new Set(this.familias.map((f) => f.variableBase))).sort();
  }

  get familiasFiltradas(): FamiliaConRatioDto[] {
    const q = this.filtro.trim().toLowerCase();
    return this.familias.filter((f) => {
      const coincideTexto = !q
        || f.nombreFamilia.toLowerCase().includes(q)
        || f.tipoMaterial.toLowerCase().includes(q);
      const coincideTipo = !this.tipoSeleccionado || f.tipoMaterial === this.tipoSeleccionado;
      const coincideVariableBase = !this.variableBaseSeleccionada
        || f.variableBase === this.variableBaseSeleccionada;
      return coincideTexto && coincideTipo && coincideVariableBase;
    });
  }

  onFiltroChange(valor: string): void {
    this.filtro = valor;
    this.cdr.markForCheck();
  }

  onTipoChange(valor: string): void {
    this.tipoSeleccionado = valor;
    this.cdr.markForCheck();
  }

  onVariableBaseChange(valor: string): void {
    this.variableBaseSeleccionada = valor;
    this.cdr.markForCheck();
  }

  private cargarDetalle(familiaId: number): void {
    this.cargandoDetalleIds.add(familiaId);
    this.cdr.markForCheck();
    this.svc.getComparacionFamilia(familiaId).subscribe({
      next: (d) => {
        this.detalles.set(familiaId, d);
        this.cargandoDetalleIds.delete(familiaId);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoDetalleIds.delete(familiaId);
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggleIncluidoRatio(familiaId: number, p: RatioProyectoItemDto): void {
    this.toggleIncluido(familiaId, p.projectId, !p.incluidoManualRatio, 'RATIO');
  }

  toggleIncluidoPrecio(familiaId: number, p: RatioProyectoItemDto): void {
    this.toggleIncluido(familiaId, p.projectId, !p.incluidoManualPrecio, 'PRECIO');
  }

  private toggleIncluido(
    familiaId: number,
    projectId: number,
    nuevoValor: boolean,
    campo: 'RATIO' | 'PRECIO',
  ): void {
    if (this.actualizandoProjectId === projectId) return;
    this.actualizandoProjectId = projectId;
    this.cdr.markForCheck();
    this.svc.actualizarIncluidoManual(familiaId, projectId, nuevoValor, campo).subscribe({
      next: () => {
        this.actualizandoProjectId = null;
        this.cargarDetalle(familiaId);
      },
      error: (err: HttpErrorResponse) => {
        this.actualizandoProjectId = null;
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  driverLabel(variableBase: string): string {
    switch (variableBase) {
      case 'HH': return 'Horas-Hombre';
      case 'AREATECHADA': return 'Área Techada (m²)';
      case 'TRABAJADORES': return 'Trabajadores';
      case 'CALCULADO': return 'Calculado (sin ratio real)';
      case 'FIJO': return 'Monto fijo';
      case 'METRADO': return 'Metrado';
      default: return variableBase;
    }
  }

  /**
   * HH y área techada dan ratios diminutos (ej. 0.00003 por HH) — se escalan x1000 solo
   * para que se puedan leer. El valor guardado en la base no cambia, esto es solo pantalla.
   */
  escalaRatio(variableBase: string): number {
    return variableBase === 'HH' || variableBase === 'AREATECHADA' ? 1000 : 1;
  }

  /**
   * Qué tan confiable es la mediana según cuántos proyectos la respaldan.
   * No es un cálculo estadístico formal, es una guía simple para no confiar
   * igual en una mediana de 2 proyectos que en una de 15.
   */
  confianzaLabel(nProyectos: number): string {
    if (nProyectos >= 6) return 'Alta';
    if (nProyectos >= 3) return 'Media';
    return 'Baja';
  }

  confianzaClass(nProyectos: number): string {
    if (nProyectos >= 6) return 'badge-ok';
    if (nProyectos >= 3) return 'badge-warn';
    return 'badge-danger';
  }
}
