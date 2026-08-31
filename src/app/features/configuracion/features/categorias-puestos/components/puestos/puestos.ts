import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CategoriasPuestosService } from '../../services/categorias-puestos.service';
import {
  AreaNodoDto,
  CategoriaAdminDto,
  PuestoAdminDto,
} from '../../dtos/categorias-puestos.dto';
import {
  AreaCascadeNode,
  AreaFlatOption,
  buildAreaTree,
  collectScopeIds,
  flattenAreaTree,
} from '../../area-tree';
import { PuestoCreateEdit } from '../puesto-create-edit/puesto-create-edit';
import { PuestoDetalle } from '../puesto-detalle/puesto-detalle';

/**
 * Sección "Puestos" de Gestión GTH → Configuración → Categorías y Puestos. Los datos los
 * carga y refresca el contenedor (una sola petición para ambas secciones); acá viven los
 * filtros, la paginación y los modales propios de la sección.
 */
@Component({
  standalone: true,
  selector: 'app-config-puestos',
  imports: [
    CommonModule,
    StatusBadge,
    TitleCasePipe,
    AbrilBulkActionDirective,
    Paginator,
    FilterModal,
    SearchInput,
    SearchSelect,
    PuestoCreateEdit,
    PuestoDetalle,
  ],
  templateUrl: './puestos.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class ConfigPuestos implements OnChanges {
  @Input() puestos: PuestoAdminDto[] = [];
  /** Categorías del catálogo: alimentan el selector del modal y el filtro por categoría. */
  @Input() categorias: CategoriaAdminDto[] = [];
  /** Árbol de áreas (lista plana): alimenta el filtro en cascada y el selector del modal. */
  @Input() areaTree: AreaNodoDto[] = [];
  /** Pide al contenedor recargar el catálogo tras crear/editar/activar. */
  @Output() changed = new EventEmitter<void>();

  showModal = false;
  puestoToEdit: PuestoAdminDto | null = null;
  /** Puesto cuyo detalle (sus trabajadores) está abierto; null = ninguno. */
  puestoDetalle: PuestoAdminDto | null = null;

  searchText = '';
  categoriaFilter: number | null = null;
  estadoFilter: boolean | null = null;
  readonly estadoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];
  /**
   * true = solo puestos con categoría asignada, false = solo los que no tienen ninguna.
   * Es independiente del filtro por categoría concreta de arriba: sirve para encontrar
   * los puestos que quedaron sueltos sin tener que revisar categoría por categoría.
   */
  conCategoriaFilter: boolean | null = null;
  readonly conCategoriaFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Con categoría' },
    { value: false, label: 'Sin categoría' },
  ];
  /**
   * Estado de las dos áreas del puesto. Sirve para encontrar lo que le falta a GTH sin tener
   * que recorrer la tabla: los puestos que nadie puede pedir, los que no dicen a dónde entra
   * el contratado, y los pocos en los que pedir y entrar son áreas distintas.
   */
  areaEstadoFilter: 'sin-solicitante' | 'sin-destino' | 'distintas' | null = null;
  readonly areaEstadoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: 'sin-solicitante', label: 'Sin área que lo pida' },
    { value: 'sin-destino', label: 'Sin área de destino' },
    { value: 'distintas', label: 'Pide y va a áreas distintas' },
  ];
  /** true = solo puestos en uso, false = solo los que no tiene ningún trabajador. */
  usoFilter: boolean | null = null;
  readonly usoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Con trabajadores' },
    { value: false, label: 'Sin trabajadores' },
  ];
  filtrosAbiertos = false;

  // ── Filtro de área en cascada (mismo patrón que Gestión de Salidas) ──
  /** Niveles visibles del desplegable: [0] = gerencias, [1] = hijas de la elegida, … */
  areaLevels: AreaCascadeNode[][] = [];
  /** Nodo elegido por nivel (undefined = "Todas" en ese nivel). */
  selectedAreaNodes: (AreaCascadeNode | undefined)[] = [];
  /** Opciones aplanadas con su ruta, para el selector de áreas del modal de alta/edición. */
  areaOptions: AreaFlatOption[] = [];

  /** IDs seleccionados para la acción bulk. Se mantiene al cambiar de página. */
  selectedIds = new Set<number>();
  /** Índice de la última fila clickeada: ancla del rango con Shift, como en Outlook. */
  private lastClickedIndex: number | null = null;

  private readonly pager = new ClientPager<PuestoAdminDto>();

  constructor(
    private service: CategoriasPuestosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  /**
   * El contenedor reasigna las listas en cada recarga: la selección apuntaría a filas de
   * la carga anterior, así que se limpia. El árbol de áreas se rearma solo cuando llega
   * uno nuevo, respetando el área que el usuario tenga filtrada — si no, cada guardado le
   * borraría el filtro.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['areaTree']) this.buildAreaCascade();
    this.limpiarSeleccion();
  }

  // ── Filtros ───────────────────────────────────────────────────────────

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.categoriaFilter !== null) n++;
    if (this.conCategoriaFilter !== null) n++;
    if (this.areaEstadoFilter !== null) n++;
    if (this.usoFilter !== null) n++;
    if (this.estadoFilter !== null) n++;
    if (this.selectedAreaNodes.some((node) => node)) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.categoriaFilter = null;
    this.conCategoriaFilter = null;
    this.areaEstadoFilter = null;
    this.usoFilter = null;
    this.estadoFilter = null;
    this.areaLevels = this.areaLevels.length ? [this.areaLevels[0]] : this.areaLevels;
    this.selectedAreaNodes = this.selectedAreaNodes.length ? [undefined] : this.selectedAreaNodes;
    this.onFilterChange();
  }

  // ── Filtro de área en cascada ─────────────────────────────────────────

  /**
   * Rearma la jerarquía y deja listo el primer nivel. La ruta que el usuario tenía elegida se
   * vuelve a recorrer sobre el árbol nuevo y se corta en el primer nodo que ya no exista.
   */
  private buildAreaCascade(): void {
    const seleccionPrevia = this.selectedAreaNodes.map((n) => n?.areaScopeId ?? null);
    const roots = buildAreaTree(this.areaTree ?? []);
    this.areaOptions = flattenAreaTree(roots);

    this.areaLevels = roots.length ? [roots] : [];
    this.selectedAreaNodes = roots.length ? [undefined] : [];

    for (let i = 0; i < seleccionPrevia.length; i++) {
      const id = seleccionPrevia[i];
      if (id == null) break;
      const nodo = this.areaLevels[i]?.find((n) => n.areaScopeId === id);
      if (!nodo) break;
      this.onAreaNodeChange(i, id);
    }
  }

  /** Al elegir un nodo: recorta los niveles inferiores y, si tiene hijos, agrega el siguiente. */
  onAreaNodeChange(levelIndex: number, selectedId: number | undefined): void {
    const selected =
      selectedId != null
        ? this.areaLevels[levelIndex]?.find((n) => n.areaScopeId === selectedId)
        : undefined;

    this.selectedAreaNodes[levelIndex] = selected;
    this.areaLevels = this.areaLevels.slice(0, levelIndex + 1);
    this.selectedAreaNodes = this.selectedAreaNodes.slice(0, levelIndex + 1);

    if (selected?.children?.length) {
      this.areaLevels.push(selected.children);
      this.selectedAreaNodes.push(undefined);
    }
  }

  /**
   * Áreas que cuentan como coincidencia: el nodo elegido más profundo y todos sus
   * descendientes. Filtrar por "Gerencia de Proyectos" tiene que traer también los puestos de
   * SSOMA, Calidad, Unidad de Proyectos, etc. — el mismo alcance que usa Solicitud de Personal.
   *
   * El filtro mira las DOS áreas del puesto: quien busca "Producción" quiere ver también los
   * puestos que entran ahí aunque los pida la Gerencia Inmobiliaria.
   */
  private get areaScopeIdsFiltrados(): Set<number> | null {
    for (let i = this.selectedAreaNodes.length - 1; i >= 0; i--) {
      const nodo = this.selectedAreaNodes[i];
      if (nodo) return new Set(collectScopeIds(nodo));
    }
    return null;
  }

  onFilterChange(): void {
    this.pager.reset();
    // Al filtrar quedarían seleccionadas filas que ya no se ven; la acción bulk actuaría
    // sobre registros invisibles.
    this.limpiarSeleccion();
  }

  get filteredPuestos(): PuestoAdminDto[] {
    const areaIds = this.areaScopeIdsFiltrados;
    return this.puestos.filter((p) => {
      const matchesTexto =
        !this.searchText.trim() ||
        SearchInput.matches(p.nombre ?? '', this.searchText) ||
        SearchInput.matches(p.categoriaNombre ?? '', this.searchText);
      const matchesCategoria =
        this.categoriaFilter === null || p.categoriaId === this.categoriaFilter;
      const matchesConCategoria =
        this.conCategoriaFilter === null || (p.categoriaId !== null) === this.conCategoriaFilter;
      const matchesUso =
        this.usoFilter === null || (p.cantidadTrabajadores > 0) === this.usoFilter;
      const matchesEstado = this.estadoFilter === null || p.activo === this.estadoFilter;
      const matchesArea =
        areaIds === null ||
        (p.areaSolicitanteScopeId !== null && areaIds.has(p.areaSolicitanteScopeId)) ||
        (p.areaDestinoScopeId !== null && areaIds.has(p.areaDestinoScopeId));
      const matchesAreaEstado =
        this.areaEstadoFilter === null ||
        (this.areaEstadoFilter === 'sin-solicitante' && p.areaSolicitanteScopeId === null) ||
        (this.areaEstadoFilter === 'sin-destino' && p.areaDestinoScopeId === null) ||
        (this.areaEstadoFilter === 'distintas' &&
          p.areaSolicitanteScopeId !== null &&
          p.areaDestinoScopeId !== null &&
          p.areaSolicitanteScopeId !== p.areaDestinoScopeId);
      return (
        matchesTexto && matchesCategoria && matchesConCategoria &&
        matchesUso && matchesEstado && matchesArea && matchesAreaEstado
      );
    });
  }

  // ── Paginación ────────────────────────────────────────────────────────

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredPuestos);
  }

  get pagedPuestos(): PuestoAdminDto[] {
    return this.pager.page(this.filteredPuestos);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
    // La página cambia pero la selección no: el ancla del rango con Shift sí, porque
    // los índices son los de la página que se está viendo.
    this.lastClickedIndex = null;
  }

  // ── Selección de filas (clic + Shift+clic para rango, estilo Outlook) ──

  limpiarSeleccion(): void {
    this.selectedIds.clear();
    this.lastClickedIndex = null;
  }

  /**
   * Clic sobre la casilla de una fila. Con Shift selecciona todo el rango entre la
   * última fila clickeada y la actual; sin Shift alterna solo esa fila.
   */
  onSelectClick(event: MouseEvent, index: number): void {
    // La fila entera abre el detalle: seleccionar no debe abrirlo también.
    event.stopPropagation();
    const rows = this.pagedPuestos;

    if (event.shiftKey && this.lastClickedIndex !== null) {
      // Evita que Shift+clic resalte el texto de las filas del rango.
      if (typeof window !== 'undefined') window.getSelection()?.removeAllRanges();
      const [desde, hasta] = [this.lastClickedIndex, index].sort((a, b) => a - b);
      for (let k = desde; k <= hasta; k++) this.selectedIds.add(rows[k].id);
      return; // el ancla se mantiene
    }

    const id = rows[index].id;
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
    this.lastClickedIndex = index;
  }

  /**
   * La casilla del encabezado actúa sobre TODOS los puestos que pasan los filtros, no
   * solo los de la página visible: el caso real es filtrar por "Sin trabajadores" y
   * eliminarlos de una, que casi siempre son más de una página.
   */
  get allSelected(): boolean {
    const rows = this.filteredPuestos;
    return rows.length > 0 && rows.every((p) => this.selectedIds.has(p.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) this.selectedIds.clear();
    else this.selectedIds = new Set(this.filteredPuestos.map((p) => p.id));
    this.lastClickedIndex = null;
  }

  /** Seleccionados que sí se pueden eliminar: los que no tiene ningún trabajador. */
  get selectedEliminables(): PuestoAdminDto[] {
    return this.filteredPuestos.filter(
      (p) => this.selectedIds.has(p.id) && p.cantidadTrabajadores === 0,
    );
  }

  /** Seleccionados que quedarán fuera del borrado por estar en uso. */
  get selectedEnUso(): number {
    return this.selectedIds.size - this.selectedEliminables.length;
  }

  // ── Acciones ──────────────────────────────────────────────────────────

  /** Abre el modal de creación (lo invoca el botón del header del contenedor). */
  openCreate(): void {
    this.puestoToEdit = null;
    this.showModal = true;
  }

  openEdit(puesto: PuestoAdminDto): void {
    this.puestoToEdit = puesto;
    this.showModal = true;
  }

  /** Clic en la fila: abre el detalle con los trabajadores que tienen ese puesto. */
  openDetalle(puesto: PuestoAdminDto): void {
    this.puestoDetalle = puesto;
  }

  closeModales(): void {
    this.showModal = false;
    this.puestoToEdit = null;
    this.puestoDetalle = null;
  }

  onSaved(): void {
    this.changed.emit();
  }

  toggle(puesto: PuestoAdminDto): void {
    this.loaderService.show();
    this.service.togglePuesto(puesto.id, !puesto.activo).subscribe({
      next: () => {
        this.loaderService.hide();
        this.changed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Elimina el puesto (soft delete: la fila se conserva para el histórico). Un puesto en
   * uso no se elimina — las fichas que lo apuntan lo perderían en su siguiente edición al
   * no existir ya en el desplegable; para eso está "Desactivar". El backend valida lo
   * mismo, acá se corta antes para no gastar la petición.
   */
  eliminar(puesto: PuestoAdminDto): void {
    if (puesto.cantidadTrabajadores > 0) {
      Swal.fire({
        icon: 'info',
        title: 'No se puede eliminar',
        text:
          `${puesto.cantidadTrabajadores} trabajador(es) usan este puesto. ` +
          'Si solo quieres que deje de aparecer en los desplegables, desactívalo.',
      });
      return;
    }

    Swal.fire({
      icon: 'question',
      title: '¿Eliminar puesto?',
      text: `Se eliminará "${puesto.nombre}".`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.service.eliminarPuesto(puesto.id).subscribe({
        next: () => {
          this.loaderService.hide();
          this.changed.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  /**
   * Elimina en bloque los puestos seleccionados, en una sola petición. Solo entran los
   * que no tiene ningún trabajador: los demás se avisan en la confirmación y se quedan.
   */
  eliminarSeleccionados(): void {
    const items = this.selectedEliminables;
    if (items.length === 0) return;

    const enUso = this.selectedEnUso;
    Swal.fire({
      icon: 'question',
      title: `¿Eliminar ${items.length} puesto(s)?`,
      text: enUso > 0
        ? `${enUso} de los seleccionados no se eliminarán porque tienen trabajadores usándolos.`
        : 'Se eliminarán los puestos seleccionados.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.service.eliminarPuestos(items.map((p) => p.id)).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: `${res.eliminados} puesto(s) eliminado(s)`,
            // Solo puede haber omitidos si a alguno le asignaron trabajadores mientras
            // la pantalla estaba abierta: se avisa en vez de dejarlo pasar en silencio.
            text: res.omitidos > 0
              ? `${res.omitidos} se omitieron porque quedaron con trabajadores usándolos.`
              : undefined,
            timer: res.omitidos > 0 ? undefined : 1500,
            showConfirmButton: res.omitidos > 0,
          });
          this.changed.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }
}
