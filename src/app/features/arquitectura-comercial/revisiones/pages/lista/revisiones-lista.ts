import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RevisionesService } from '../../../../../core/services/arquitectura-comercial/revisiones.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { NavigationService } from '../../../../../core/navigation/navigation.service';
import {
  RevisionObservacionListItemDTO,
  RevisionFiltrosDTO,
  RevisionObservacionStatsDTO,
  RevisionDTO,
} from '../../../../../core/dtos/arquitectura-comercial/revisiones.model';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { NuevaRevisionObservacion } from '../../components/nueva-revision-observacion/nueva-revision-observacion';
import { LevantarRevisionObservacion } from '../../components/levantar-revision-observacion/levantar-revision-observacion';
import { RevisionCatalogoModal } from '../../components/revision-catalogo-modal/revision-catalogo-modal';
import { DEFAULT_PAGE_SIZE } from '../../../../../shared/constants/pagination';
import { CatalogoService } from '../../../../../core/services/arquitectura-comercial/catalogo.service';
import { CatalogoModal } from '../../../../../shared/components/catalogo-modal/catalogo-modal';
import { ProyectosArquitecturaComercialModal } from '../../../../../shared/components/proyectos-arquitectura-comercial-modal/proyectos-arquitectura-comercial-modal';

import { AC_REVISIONES_TABS } from '../../../shared/arquitectura-comercial-tabs';
@Component({
  standalone: true,
  selector: 'app-arq-comercial-revisiones-lista',
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    Paginator,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    AbrilBulkActionDirective,
    NuevaRevisionObservacion,
    LevantarRevisionObservacion,
    RevisionCatalogoModal,
    CatalogoModal,
    ProyectosArquitecturaComercialModal,
  ],
  templateUrl: './revisiones-lista.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    /* Vista de cards en mobile — mismo patrón encapsulado que Observaciones
     * (ver observaciones-lista.ts). Si funciona bien acá también, se promueve
     * a componente compartido para toda la app. */
    .rev-cards-mobile { display: none; }
    @media (max-width: 768px) {
      .abril-table-wrap { display: none; }
      .rev-cards-mobile { display: block; }
      /* .page-container tiene overflow-hidden para que .abril-table-wrap scrollee
       * internamente en desktop; en mobile esa tabla está oculta y .rev-cards-mobile
       * no es su propio contenedor de scroll, así que el overflow-hidden recortaba
       * las cards que no entraban en pantalla. */
      .page-container { overflow: visible; }
    }
  `],
})
export class RevisionesLista implements OnInit {
  readonly tabs = AC_REVISIONES_TABS;
  anioActual = new Date().getFullYear();

  items: RevisionObservacionListItemDTO[] = [];
  total = 0;
  pagina = 1;
  porPagina = DEFAULT_PAGE_SIZE;

  filtros: RevisionFiltrosDTO = { proyectos: [], partidas: [], estados: [], tipos: [] };
  filtrosListos = false;

  proyectoId: number | null = null;
  revisionId: number | null = null;
  revisionesDelProyecto: RevisionDTO[] = [];
  estado: string | null = 'Pendiente';
  partida: string | null = null;
  desde: string | null = null;
  hasta: string | null = null;
  searchText = '';
  filtrosAbiertos = false;

  showNuevaModal = false;
  showLevantarModal = false;
  showCatalogoModal = false;
  showRevisionCatalogoModal = false;
  showProyectosModal = false;
  observacionParaLevantar: RevisionObservacionListItemDTO | null = null;

  partidasCatalogo: string[] = [];

  editandoId: number | null = null;
  editForm = { personaReporta: '', partidaReportada: '' as string | null, descripcion: '', zonaAmbiente: '' };
  guardandoEdicion = false;

  get puedeEditar(): boolean {
    return this.navigationService.isFeatureAllowed('arquitectura-comercial.revisiones.editar');
  }

  stats: RevisionObservacionStatsDTO | null = null;
  lightboxUrl: string | null = null;

  get kpiReportados(): number { return this.stats?.reportados ?? 0; }
  get kpiCompletados(): number { return this.stats?.completados ?? 0; }
  get kpiPendientes(): number { return this.stats?.pendientes ?? 0; }
  get kpiEnProceso(): number { return this.stats?.enProceso ?? 0; }

  filtrarPorKpi(estadoBuscado: string | null): void {
    this.estado = estadoBuscado;
    this.onFilterChange();
  }

  loadStats(): void {
    this.service.getStats(null, null, this.proyectoId).subscribe({
      next: (data) => {
        this.stats = data;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  abrirLightbox(url: string): void { this.lightboxUrl = url; }
  cerrarLightbox(): void { this.lightboxUrl = null; }

  get filtrosActivos(): number {
    let n = 0;
    if (this.proyectoId) n++;
    if (this.revisionId) n++;
    if (this.estado) n++;
    if (this.partida) n++;
    if (this.desde) n++;
    if (this.hasta) n++;
    if (this.searchText.trim()) n++;
    return n;
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.porPagina)); }

  get estadoOptions(): { value: string; label: string }[] {
    return this.filtros.estados.map((e) => ({ value: e, label: e }));
  }

  get partidaOptions(): { value: string; label: string }[] {
    return this.partidasCatalogo.map((p) => ({ value: p, label: p }));
  }

  constructor(
    private service: RevisionesService,
    private catalogoService: CatalogoService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private navigationService: NavigationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFiltros();
    this.loadPartidasCatalogo();
    this.load();
    this.loadStats();
  }

  loadPartidasCatalogo(): void {
    this.catalogoService.getItems('partidas').subscribe({
      next: (items) => {
        this.partidasCatalogo = items.map((i) => i.nombre);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onCatalogoGuardado(): void { this.loadPartidasCatalogo(); }
  onProyectosGuardado(): void { this.loadFiltros(); }
  onRevisionCatalogoGuardado(): void {
    this.loadFiltros();
    if (this.proyectoId) this.loadRevisionesDelProyecto(this.proyectoId);
  }

  loadFiltros(): void {
    this.service.getFiltros().subscribe({
      next: (data) => {
        this.filtros = {
          ...data,
          proyectos: [...data.proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        };
        this.filtrosListos = true;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        // Sin esto, si /filtros falla el FAB "Nueva observación" queda deshabilitado para
        // siempre con el tooltip "Cargando proyectos..." — mejor dejarlo habilitado (el modal
        // ya maneja un combo de proyectos vacío) que trabado sin explicación.
        this.filtrosListos = true;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  loadRevisionesDelProyecto(proyectoId: number): void {
    this.service.getCatalogo(proyectoId).subscribe({
      next: (data) => {
        this.revisionesDelProyecto = data;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  load(): void {
    this.loaderService.show();
    this.service
      .getObservaciones({
        revisionId: this.revisionId,
        proyectoId: this.proyectoId,
        estado: this.estado,
        partida: this.partida,
        desde: this.desde,
        hasta: this.hasta,
        search: this.searchText || null,
        pagina: this.pagina,
        porPagina: this.porPagina,
      })
      .subscribe({
        next: (data) => {
          this.items = data.items;
          this.total = data.total;
          this.loaderService.hide();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  onFilterChange(): void {
    this.pagina = 1;
    this.load();
  }

  onProyectoFiltroChange(id: number | null): void {
    this.proyectoId = id;
    this.revisionId = null;
    this.revisionesDelProyecto = [];
    if (id) this.loadRevisionesDelProyecto(id);
    this.onFilterChange();
    this.loadStats();
  }

  onRevisionFiltroChange(id: number | null): void {
    this.revisionId = id;
    this.onFilterChange();
  }

  limpiarFiltros(): void {
    const proyectoCambio = this.proyectoId !== null;
    this.proyectoId = null;
    this.revisionId = null;
    this.revisionesDelProyecto = [];
    this.estado = null;
    this.partida = null;
    this.desde = null;
    this.hasta = null;
    this.searchText = '';
    this.onFilterChange();
    if (proyectoCambio) this.loadStats();
  }

  filtrarMesActual(): void {
    const hoy = new Date();
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    this.desde = this.toDateInput(primero);
    this.hasta = this.toDateInput(ultimo);
    this.onFilterChange();
  }

  filtrarAnioActual(): void {
    const anio = new Date().getFullYear();
    this.desde = this.toDateInput(new Date(anio, 0, 1));
    this.hasta = this.toDateInput(new Date(anio, 11, 31));
    this.onFilterChange();
  }

  private toDateInput(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  changePage(page: number): void {
    this.pagina = page;
    this.load();
  }

  estadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'Completado': return 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]';
      case 'En Proceso': return 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]';
      default: return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
    }
  }

  private fotoCacheBust = new Map<number, number>();

  fotoObservacion(o: RevisionObservacionListItemDTO): string | null {
    const id = this.fotoObservacionId(o);
    return id ? this.urlConCacheBust(id) : null;
  }

  fotoObservacionId(o: RevisionObservacionListItemDTO): number | null {
    return o.fotos.find((f) => f.tipo === 'Observacion')?.id ?? null;
  }

  fotoLevantamiento(o: RevisionObservacionListItemDTO): string | null {
    const id = this.fotoLevantamientoId(o);
    return id ? this.urlConCacheBust(id) : null;
  }

  fotoLevantamientoId(o: RevisionObservacionListItemDTO): number | null {
    return o.fotos.find((f) => f.tipo === 'Levantamiento')?.id ?? null;
  }

  private urlConCacheBust(fotoId: number): string {
    const base = this.service.fotoContenidoUrl(fotoId);
    const v = this.fotoCacheBust.get(fotoId);
    return v ? `${base}&v=${v}` : base;
  }

  fotosLevantamientoExtra(o: RevisionObservacionListItemDTO): number {
    return Math.max(0, o.fotos.filter((f) => f.tipo === 'Levantamiento').length - 1);
  }

  agregarFoto(o: RevisionObservacionListItemDTO, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    this.loaderService.show();
    this.service.agregarFotoObservacion(o.id, file).subscribe({
      next: () => {
        this.load();
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cambiarFoto(fotoId: number | null, o: RevisionObservacionListItemDTO, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!fotoId || !file) return;

    this.loaderService.show();
    this.service.reemplazarFoto(fotoId, file).subscribe({
      next: ({ url }) => {
        const foto = o.fotos.find((f) => f.id === fotoId);
        if (foto) foto.url = url;
        this.fotoCacheBust.set(fotoId, Date.now());
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  abrirLevantar(o: RevisionObservacionListItemDTO): void {
    this.observacionParaLevantar = o;
    this.showLevantarModal = true;
  }

  iniciarEdicion(o: RevisionObservacionListItemDTO): void {
    this.editandoId = o.id;
    this.editForm = {
      personaReporta: o.personaReporta ?? '',
      partidaReportada: o.partidaReportada,
      descripcion: o.descripcion,
      zonaAmbiente: o.zonaAmbiente ?? '',
    };
  }

  cancelarEdicion(): void { this.editandoId = null; }

  guardarEdicion(o: RevisionObservacionListItemDTO): void {
    if (!this.editForm.descripcion.trim() || this.guardandoEdicion) return;
    this.guardandoEdicion = true;
    this.service
      .updateObservacion(o.id, {
        personaReporta: this.editForm.personaReporta.trim() || null,
        partidaReportada: this.editForm.partidaReportada,
        descripcion: this.editForm.descripcion.trim(),
        zonaAmbiente: this.editForm.zonaAmbiente.trim() || null,
      })
      .subscribe({
        next: (actualizado) => {
          Object.assign(o, actualizado);
          this.editandoId = null;
          this.guardandoEdicion = false;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoEdicion = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  onNuevaGuardada(): void {
    this.showNuevaModal = false;
    this.pagina = 1;
    this.load();
    this.loadStats();
  }

  onNuevaGuardadaContinuar(): void {
    this.pagina = 1;
    this.load();
    this.loadStats();
  }

  onLevantadaGuardada(): void {
    this.showLevantarModal = false;
    this.observacionParaLevantar = null;
    this.load();
    this.loadStats();
  }

  trackById(_: number, o: RevisionObservacionListItemDTO): number {
    return o.id;
  }
}
