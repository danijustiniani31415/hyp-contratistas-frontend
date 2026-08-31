import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  FamiliaCatalogoDto,
  MaterialPendienteGlobalDto,
  MaterialNoSsomaDto,
  BuscarItemDto,
  TipoMaterialDto,
  RevisionDecisionDto,
  CrearItemCatalogoDto,
  CrearFamiliaCatalogoDto,
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

type Seccion = 'normalizado' | 'sin-estandarizar' | 'no-ssoma';
const VARIABLES_BASE = ['HH', 'AREATECHADA', 'TRABAJADORES', 'CALCULADO', 'FIJO', 'METRADO'];

@Component({
  selector: 'app-catalogo-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, Paginator, SearchInput, SearchSelect],
  templateUrl: './catalogo-page.html',
  styleUrl: './catalogo-page.css',
})
export class CatalogoPage implements OnInit {
  readonly headerTabs = PRESUPUESTO_TABS;
  private svc    = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error  = inject(ErrorService);
  cdr            = inject(ChangeDetectorRef);

  readonly variablesBase = VARIABLES_BASE;
  readonly variableBaseOpts = VARIABLES_BASE.map((v) => ({ id: v, label: v }));
  // "Sin estandarizar" es el uso del día a día (revisar lo que llegó en el último Kardex/HH),
  // así que es la sección con la que abre la pantalla — el catálogo maestro es edición ocasional.
  seccion: Seccion = 'sin-estandarizar';
  loading = false;

  // Sección 1: catálogo normalizado
  tipos: TipoMaterialDto[] = [];
  familias: FamiliaCatalogoDto[] = [];
  filtroTexto = '';
  private readonly familiasPager = new ClientPager<FamiliaCatalogoDto>();

  // Sección 2: sin estandarizar (global, con revisión en lote)
  pendientes: MaterialPendienteGlobalDto[] = [];
  filtroPendientes = '';
  decisiones: Map<number, RevisionDecisionDto> = new Map();
  procesando = false;
  private readonly pendientesPager = new ClientPager<MaterialPendienteGlobalDto>();

  // Asignación manual de ítem cuando no hubo sugerencia automática (Sin match)
  busquedaTexto: Map<number, string> = new Map();
  resultadosBusqueda: Map<number, BuscarItemDto[]> = new Map();
  itemManualPorLinea: Map<number, BuscarItemDto> = new Map();
  private timersBusqueda: Map<number, ReturnType<typeof setTimeout>> = new Map();

  /** Líneas donde el usuario descartó la sugerencia automática por estar mal (para buscar/crear otro ítem a mano). */
  sugerenciaDescartada: Set<number> = new Set();

  // Alta manual de un ítem que de verdad no existe en el catálogo
  crearItemAbiertoPara: number | null = null;
  nuevoItemNombre = '';
  nuevoItemFamiliaId: number | null = null;
  creandoItem = false;
  familiasParaCrear: FamiliaCatalogoDto[] = [];
  private familiasParaCrearCargadas = false;

  // Alta manual de família (cuando el material no encaja en ninguna família existente)
  crearFamiliaAbierta = false;
  nuevaFamiliaNombre = '';
  nuevaFamiliaTipoId: number | null = null;
  nuevaFamiliaVariableBase = '';
  nuevaFamiliaUnidad = '';
  nuevaFamiliaPerteneceSsoma = true;
  creandoFamilia = false;
  tiposParaCrear: TipoMaterialDto[] = [];
  private tiposParaCrearCargados = false;

  // Sección 3: no pertenece a SSOMA (solo lectura)
  noSsoma: MaterialNoSsomaDto[] = [];
  filtroNoSsoma = '';
  private readonly noSsomaPager = new ClientPager<MaterialNoSsomaDto>();

  ngOnInit(): void {
    this.cambiarSeccion('sin-estandarizar');
  }

  cambiarSeccion(s: Seccion): void {
    this.seccion = s;
    if (s === 'normalizado') this.cargarNormalizado();
    if (s === 'sin-estandarizar') this.cargarSinEstandarizar();
    if (s === 'no-ssoma') this.cargarNoSsoma();
  }

  // ─── Sección 1: catálogo normalizado ──────────────────────────────────────

  get familiasFiltradas(): FamiliaCatalogoDto[] {
    if (!this.filtroTexto.trim()) return this.familias;
    const q = this.filtroTexto.toLowerCase();
    return this.familias.filter((f) => f.nombre.toLowerCase().includes(q));
  }

  onFiltroFamiliasChange(): void {
    this.familiasPager.reset();
  }

  get familiasCurrentPage(): number { return this.familiasPager.currentPage; }
  get familiasTotalPages(): number { return this.familiasPager.totalPages(this.familiasFiltradas); }
  get familiasPaged(): FamiliaCatalogoDto[] { return this.familiasPager.page(this.familiasFiltradas); }
  changeFamiliasPage(page: number): void { this.familiasPager.goTo(page); }

  private cargarNormalizado(): void {
    this.loading = true;
    this.loader.show();
    this.svc.listarFamiliasCatalogo().subscribe({
      next: (familias) => {
        this.familias = familias;
        this.familiasPager.reset();
        this.loading = false;
        this.loader.hide();
        this.cdr.detectChanges();
        if (this.tipos.length === 0) this.cargarTipos();
      },
      error: (err: HttpErrorResponse) => this.onError(err),
    });
  }

  private cargarTipos(): void {
    this.svc.listarTiposCatalogo().subscribe({
      next: (tipos) => {
        this.tipos = tipos;
        this.cdr.detectChanges();
      },
    });
  }

  guardarFamilia(f: FamiliaCatalogoDto): void {
    this.loader.show();
    this.svc.actualizarFamiliaCatalogo(f.id, {
      nombre: f.nombre,
      tipoId: f.tipoId,
      variableBase: f.variableBase,
      unidadMedida: f.unidadMedida,
      perteneceSsoma: f.perteneceSsoma,
      activo: f.activo,
    }).subscribe({
      next: () => {
        this.loader.hide();
        Swal.fire({ icon: 'success', title: 'Familia actualizada', timer: 1200, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Sección 2: sin estandarizar ──────────────────────────────────────────

  get pendientesFiltrados(): MaterialPendienteGlobalDto[] {
    if (!this.filtroPendientes.trim()) return this.pendientes;
    const q = this.filtroPendientes.toLowerCase();
    return this.pendientes.filter(
      (p) => (p.projectDescription ?? '').toLowerCase().includes(q) || (p.recursoCrudo ?? '').toLowerCase().includes(q),
    );
  }

  onFiltroPendientesChange(): void {
    this.pendientesPager.reset();
  }

  get pendientesCurrentPage(): number { return this.pendientesPager.currentPage; }
  get pendientesTotalPages(): number { return this.pendientesPager.totalPages(this.pendientesFiltrados); }
  get pendientesPaged(): MaterialPendienteGlobalDto[] { return this.pendientesPager.page(this.pendientesFiltrados); }
  changePendientesPage(page: number): void { this.pendientesPager.goTo(page); }

  private cargarSinEstandarizar(): void {
    this.loading = true;
    this.decisiones.clear();
    this.itemManualPorLinea.clear();
    this.resultadosBusqueda.clear();
    this.busquedaTexto.clear();
    this.loader.show();
    this.svc.obtenerSinEstandarizarGlobal().subscribe({
      next: (lineas) => {
        this.pendientes = lineas;
        this.pendientesPager.reset();
        this.loading = false;
        this.loader.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.onError(err),
    });
  }

  setDecision(item: MaterialPendienteGlobalDto, decision: 'AUTORIZADO' | 'RECHAZADO'): void {
    if (decision === 'AUTORIZADO' && !this.puedeAutorizar(item)) return;
    if (this.decisiones.has(item.lineaId) && this.decisiones.get(item.lineaId)!.decision === decision) {
      this.decisiones.delete(item.lineaId);
    } else {
      this.decisiones.set(item.lineaId, {
        lineaId: item.lineaId,
        decision,
        itemIdConfirmado: decision === 'AUTORIZADO' ? this.itemConfirmadoPara(item) : undefined,
      });
    }
    this.cdr.detectChanges();
  }

  getDecision(lineaId: number): string | null {
    return this.decisiones.get(lineaId)?.decision ?? null;
  }

  private itemConfirmadoPara(item: MaterialPendienteGlobalDto): number | undefined {
    if (this.sugerenciaDescartada.has(item.lineaId)) return this.itemManualPorLinea.get(item.lineaId)?.id;
    return item.itemIdSugerido ?? this.itemManualPorLinea.get(item.lineaId)?.id;
  }

  /** Sin sugerencia automática (o descartada por incorrecta), hace falta haber elegido un ítem a mano antes de poder autorizar. */
  puedeAutorizar(item: MaterialPendienteGlobalDto): boolean {
    if (this.sugerenciaDescartada.has(item.lineaId)) return this.itemManualPorLinea.has(item.lineaId);
    return !!item.itemIdSugerido || this.itemManualPorLinea.has(item.lineaId);
  }

  /** La sugerencia automática estaba mal (p.ej. coincide en texto pero no en medida real): descartarla y pasar a búsqueda/creación manual. */
  descartarSugerencia(item: MaterialPendienteGlobalDto): void {
    this.sugerenciaDescartada.add(item.lineaId);
    this.decisiones.delete(item.lineaId);
    this.cdr.detectChanges();
  }

  itemManualSeleccionado(lineaId: number): BuscarItemDto | undefined {
    return this.itemManualPorLinea.get(lineaId);
  }

  /** `[options]` para el app-search-select del resultado de búsqueda manual (necesita un campo de texto propio para mostrar). */
  resultadoOpts(lineaId: number): (BuscarItemDto & { _label: string })[] {
    return (this.resultadosBusqueda.get(lineaId) ?? []).map((r) => ({ ...r, _label: `${r.nombre} (${r.nombreFamilia})` }));
  }

  onResultadoSeleccionado(item: MaterialPendienteGlobalDto, itemId: number | null): void {
    const elegido = (this.resultadosBusqueda.get(item.lineaId) ?? []).find((r) => r.id === itemId);
    if (elegido) this.seleccionarItemManual(item, elegido);
  }

  onBusquedaManualInput(item: MaterialPendienteGlobalDto, texto: string): void {
    this.busquedaTexto.set(item.lineaId, texto);
    const timerPrevio = this.timersBusqueda.get(item.lineaId);
    if (timerPrevio) clearTimeout(timerPrevio);

    if (texto.trim().length < 3) {
      this.resultadosBusqueda.delete(item.lineaId);
      this.cdr.detectChanges();
      return;
    }
    this.timersBusqueda.set(item.lineaId, setTimeout(() => {
      this.svc.buscarItems(texto.trim()).subscribe({
        next: (r) => {
          this.resultadosBusqueda.set(item.lineaId, r);
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.error.handleError(err);
          this.cdr.detectChanges();
        },
      });
    }, 300));
  }

  seleccionarItemManual(item: MaterialPendienteGlobalDto, resultado: BuscarItemDto): void {
    this.itemManualPorLinea.set(item.lineaId, resultado);
    this.resultadosBusqueda.delete(item.lineaId);
    this.busquedaTexto.delete(item.lineaId);
    if (this.decisiones.get(item.lineaId)?.decision === 'AUTORIZADO') {
      this.decisiones.set(item.lineaId, { lineaId: item.lineaId, decision: 'AUTORIZADO', itemIdConfirmado: resultado.id });
    }
    this.cdr.detectChanges();
  }

  quitarItemManual(item: MaterialPendienteGlobalDto): void {
    this.itemManualPorLinea.delete(item.lineaId);
    this.decisiones.delete(item.lineaId);
    this.cdr.detectChanges();
  }

  // ── Alta manual de ítem (cuando de verdad no existe en el catálogo) ──────

  abrirCrearItem(item: MaterialPendienteGlobalDto): void {
    this.crearItemAbiertoPara = item.lineaId;
    // A propósito vacío, no item.recursoCrudo: el ítem del catálogo debe llevar el nombre corto
    // y estandarizado (ej. "Barra expandible"), no el texto largo tal cual vino en el Kardex —
    // ese texto crudo no se pierde, queda solo como alias apuntando a este ítem (automático al
    // autorizar), que es justamente lo que permite agrupar variantes distintas bajo un mismo ítem.
    this.nuevoItemNombre = '';
    this.nuevoItemFamiliaId = null;
    if (!this.familiasParaCrearCargadas) {
      this.svc.listarFamiliasCatalogo().subscribe({
        next: (f) => {
          this.familiasParaCrear = f.filter((fam) => fam.activo);
          this.familiasParaCrearCargadas = true;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.error.handleError(err);
          this.cdr.detectChanges();
        },
      });
    }
    this.cdr.detectChanges();
  }

  cancelarCrearItem(): void {
    this.crearItemAbiertoPara = null;
    this.cdr.detectChanges();
  }

  onFamiliaCrearChange(id: number | null): void {
    this.nuevoItemFamiliaId = id;
    this.cdr.detectChanges();
  }

  confirmarCrearItem(item: MaterialPendienteGlobalDto): void {
    if (!this.nuevoItemNombre.trim() || !this.nuevoItemFamiliaId || this.creandoItem) return;
    this.creandoItem = true;
    this.cdr.detectChanges();
    const dto: CrearItemCatalogoDto = { nombre: this.nuevoItemNombre.trim(), familiaId: this.nuevoItemFamiliaId };
    this.svc.crearItemCatalogo(dto).subscribe({
      next: (nuevoItem) => {
        this.creandoItem = false;
        this.crearItemAbiertoPara = null;
        this.seleccionarItemManual(item, nuevoItem);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.creandoItem = false;
        this.error.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Alta manual de família (cuando el material no encaja en ninguna família existente) ──

  abrirCrearFamilia(): void {
    this.crearFamiliaAbierta = true;
    this.nuevaFamiliaNombre = '';
    this.nuevaFamiliaTipoId = null;
    this.nuevaFamiliaVariableBase = '';
    this.nuevaFamiliaUnidad = '';
    this.nuevaFamiliaPerteneceSsoma = true;
    if (!this.tiposParaCrearCargados) {
      this.svc.listarTiposCatalogo().subscribe({
        next: (t) => {
          this.tiposParaCrear = t;
          this.tiposParaCrearCargados = true;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.error.handleError(err);
          this.cdr.detectChanges();
        },
      });
    }
    this.cdr.detectChanges();
  }

  cancelarCrearFamilia(): void {
    this.crearFamiliaAbierta = false;
    this.cdr.detectChanges();
  }

  confirmarCrearFamilia(): void {
    if (!this.nuevaFamiliaNombre.trim() || !this.nuevaFamiliaTipoId || !this.nuevaFamiliaVariableBase || this.creandoFamilia) return;
    this.creandoFamilia = true;
    this.cdr.detectChanges();
    const dto: CrearFamiliaCatalogoDto = {
      nombre: this.nuevaFamiliaNombre.trim(),
      tipoId: this.nuevaFamiliaTipoId,
      variableBase: this.nuevaFamiliaVariableBase,
      unidadMedida: this.nuevaFamiliaUnidad.trim() || null,
      perteneceSsoma: this.nuevaFamiliaPerteneceSsoma,
    };
    this.svc.crearFamiliaCatalogo(dto).subscribe({
      next: (nuevaFamilia) => {
        this.creandoFamilia = false;
        this.crearFamiliaAbierta = false;
        this.familiasParaCrear = [...this.familiasParaCrear, nuevaFamilia];
        this.nuevoItemFamiliaId = nuevaFamilia.id;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.creandoFamilia = false;
        this.error.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  get totalSeleccionados(): number { return this.decisiones.size; }

  procesarRevision(): void {
    if (this.decisiones.size === 0 || this.procesando) return;
    this.procesando = true;
    this.cdr.detectChanges();
    this.svc.procesarSinEstandarizarGlobal(Array.from(this.decisiones.values())).subscribe({
      next: () => {
        this.procesando = false;
        this.cargarSinEstandarizar();
      },
      error: (err: HttpErrorResponse) => {
        this.procesando = false;
        this.error.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  scoreColor(score?: number): string {
    if (!score) return '#9ca3af';
    if (score >= 0.85) return '#16a34a';
    if (score >= 0.6) return '#d97706';
    return '#dc2626';
  }

  // ─── Sección 3: no pertenece a SSOMA ──────────────────────────────────────

  get noSsomaFiltrados(): MaterialNoSsomaDto[] {
    if (!this.filtroNoSsoma.trim()) return this.noSsoma;
    const q = this.filtroNoSsoma.toLowerCase();
    return this.noSsoma.filter(
      (n) => (n.projectDescription ?? '').toLowerCase().includes(q) || (n.recursoCrudo ?? '').toLowerCase().includes(q),
    );
  }

  onFiltroNoSsomaChange(): void {
    this.noSsomaPager.reset();
  }

  get noSsomaCurrentPage(): number { return this.noSsomaPager.currentPage; }
  get noSsomaTotalPages(): number { return this.noSsomaPager.totalPages(this.noSsomaFiltrados); }
  get noSsomaPaged(): MaterialNoSsomaDto[] { return this.noSsomaPager.page(this.noSsomaFiltrados); }
  changeNoSsomaPage(page: number): void { this.noSsomaPager.goTo(page); }

  /** Total S/ del conjunto filtrado — con el buscador vacío es el total general, escribiendo un
   * proyecto pasa a ser el total de ESE proyecto (para poder comunicárselo a su Oficina Técnica). */
  get totalNoSsomaFiltrado(): number {
    return this.noSsomaFiltrados.reduce((acc, n) => acc + (n.precioTotal || 0), 0);
  }

  private cargarNoSsoma(): void {
    this.loading = true;
    this.loader.show();
    this.svc.obtenerNoSsoma().subscribe({
      next: (lineas) => {
        this.noSsoma = lineas;
        this.noSsomaPager.reset();
        this.loading = false;
        this.loader.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.onError(err),
    });
  }

  private onError(err: HttpErrorResponse): void {
    this.loading = false;
    this.loader.hide();
    this.error.handleError(err);
    this.cdr.detectChanges();
  }
}
