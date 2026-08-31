import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ObservacionesService } from '../../../../../core/services/arquitectura-comercial/observaciones.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { NavigationService } from '../../../../../core/navigation/navigation.service';
import {
  ObservacionListItemDTO,
  ObservacionFiltrosDTO,
  ObservacionStatsDTO,
} from '../../../../../core/dtos/arquitectura-comercial/observaciones.model';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { NuevaObservacion } from '../../components/nueva-observacion/nueva-observacion';
import { LevantarObservacion } from '../../components/levantar-observacion/levantar-observacion';
import { DEFAULT_PAGE_SIZE } from '../../../../../shared/constants/pagination';
import { CatalogoService } from '../../../../../core/services/arquitectura-comercial/catalogo.service';
import { CatalogoModal } from '../../../../../shared/components/catalogo-modal/catalogo-modal';
import { ProyectosArquitecturaComercialModal } from '../../../../../shared/components/proyectos-arquitectura-comercial-modal/proyectos-arquitectura-comercial-modal';

import { AC_OBSERVACIONES_TABS } from '../../../shared/arquitectura-comercial-tabs';
@Component({
  standalone: true,
  selector: 'app-arq-comercial-observaciones-lista',
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
    NuevaObservacion,
    LevantarObservacion,
    CatalogoModal,
    ProyectosArquitecturaComercialModal,
  ],
  templateUrl: './observaciones-lista.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    /* Vista de cards en mobile (en vez de forzar la tabla): permite agrupar 2
     * campos por fila y mostrar Observación/Levantamiento lado a lado con
     * fotos más grandes — cosas que una conversión tabla→bloque no permite
     * bien. Encapsulado a este componente a propósito (por ahora solo
     * Observaciones); si el patrón funciona bien se promueve a un componente
     * compartido para toda la app, incluyendo el futuro módulo "Gestión de
     * Revisiones". */
    .obs-cards-mobile { display: none; }
    @media (max-width: 768px) {
      .abril-table-wrap { display: none; }
      .obs-cards-mobile { display: block; }
      /* .page-container tiene overflow-hidden para que .abril-table-wrap scrollee
       * internamente en desktop; en mobile esa tabla está oculta y .obs-cards-mobile
       * no es su propio contenedor de scroll, así que el overflow-hidden recortaba
       * las cards que no entraban en pantalla. */
      .page-container { overflow: visible; }
    }
  `],
})
export class ObservacionesLista implements OnInit {
  readonly tabs = AC_OBSERVACIONES_TABS;
  anioActual = new Date().getFullYear();

  items: ObservacionListItemDTO[] = [];
  total = 0;
  pagina = 1;
  porPagina = DEFAULT_PAGE_SIZE;

  filtros: ObservacionFiltrosDTO = { proyectos: [], partidas: [], estados: [] };
  /** false hasta que loadFiltros() resuelve — evita abrir "Nueva observación" con el combo
   * de proyectos todavía vacío (llegaba después, por eso hacía falta un segundo click). */
  filtrosListos = false;

  proyectoId: number | null = null;
  /** Por defecto se muestran las observaciones Pendientes — es lo que el
   * equipo de campo necesita ver primero al entrar a la lista. */
  estado: string | null = 'Pendiente';
  partida: string | null = null;
  desde: string | null = null;
  hasta: string | null = null;
  searchText = '';
  filtrosAbiertos = false;

  showNuevaModal = false;
  showLevantarModal = false;
  showCatalogoModal = false;
  showProyectosModal = false;
  observacionParaLevantar: ObservacionListItemDTO | null = null;

  /** Catálogo curado de partidas (reemplaza los valores "distintos usados" de filtros.partidas). */
  partidasCatalogo: string[] = [];

  /** Edición inline de una fila — solo disponible con el featureKey .editar. */
  editandoId: number | null = null;
  editForm = { personaReporta: '', partidaReportada: '' as string | null, descripcion: '' };
  guardandoEdicion = false;

  get puedeEditar(): boolean {
    return this.navigationService.isFeatureAllowed('arquitectura-comercial.observaciones.editar');
  }

  stats: ObservacionStatsDTO | null = null;
  lightboxUrl: string | null = null;

  get kpiReportados(): number {
    return this.stats?.reportados ?? 0;
  }
  get kpiCompletados(): number {
    return this.stats?.completados ?? 0;
  }
  get kpiPendientes(): number {
    return this.stats?.pendientes ?? 0;
  }
  get kpiEnProceso(): number {
    return this.stats?.enProceso ?? 0;
  }

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

  abrirLightbox(url: string): void {
    this.lightboxUrl = url;
  }

  cerrarLightbox(): void {
    this.lightboxUrl = null;
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.proyectoId) n++;
    if (this.estado) n++;
    if (this.partida) n++;
    if (this.desde) n++;
    if (this.hasta) n++;
    if (this.searchText.trim()) n++;
    return n;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.porPagina));
  }

  get estadoOptions(): { value: string; label: string }[] {
    return this.filtros.estados.map((e) => ({ value: e, label: e }));
  }

  get partidaOptions(): { value: string; label: string }[] {
    return this.partidasCatalogo.map((p) => ({ value: p, label: p }));
  }

  constructor(
    private service: ObservacionesService,
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

  onCatalogoGuardado(): void {
    this.loadPartidasCatalogo();
  }

  onProyectosGuardado(): void {
    this.loadFiltros();
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
        this.filtrosListos = true;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  load(): void {
    this.loaderService.show();
    this.service
      .getObservaciones({
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
    this.onFilterChange();
    this.loadStats();
  }

  limpiarFiltros(): void {
    const proyectoCambio = this.proyectoId !== null;
    this.proyectoId = null;
    this.estado = null;
    this.partida = null;
    this.desde = null;
    this.hasta = null;
    this.searchText = '';
    this.onFilterChange();
    if (proyectoCambio) this.loadStats();
  }

  /** Atajo "Este mes": setea desde/hasta al primer y último día del mes actual. */
  filtrarMesActual(): void {
    const hoy = new Date();
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    this.desde = this.toDateInput(primero);
    this.hasta = this.toDateInput(ultimo);
    this.onFilterChange();
  }

  /** Atajo "Este año": setea desde/hasta al primer y último día del año actual. */
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

  /** fotoId → timestamp del último reemplazo, para forzar al navegador a repedir la imagen
   * (la URL de fotoContenidoUrl es la misma antes/después de "cambiar foto"). */
  private fotoCacheBust = new Map<number, number>();

  fotoObservacion(o: ObservacionListItemDTO): string | null {
    const id = this.fotoObservacionId(o);
    return id ? this.urlConCacheBust(id) : null;
  }

  fotoObservacionId(o: ObservacionListItemDTO): number | null {
    return o.fotos.find((f) => f.tipo === 'Observacion')?.id ?? null;
  }

  fotoLevantamiento(o: ObservacionListItemDTO): string | null {
    const id = this.fotoLevantamientoId(o);
    return id ? this.urlConCacheBust(id) : null;
  }

  fotoLevantamientoId(o: ObservacionListItemDTO): number | null {
    return o.fotos.find((f) => f.tipo === 'Levantamiento')?.id ?? null;
  }

  private urlConCacheBust(fotoId: number): string {
    const base = this.service.fotoContenidoUrl(fotoId);
    const v = this.fotoCacheBust.get(fotoId);
    return v ? `${base}&v=${v}` : base;
  }

  fotosLevantamientoExtra(o: ObservacionListItemDTO): number {
    return Math.max(0, o.fotos.filter((f) => f.tipo === 'Levantamiento').length - 1);
  }

  /** Reemplaza el archivo de una foto ya subida — "me equivoqué de foto". */
  cambiarFoto(fotoId: number | null, o: ObservacionListItemDTO, event: Event): void {
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

  /** Sube la primera foto de "Observacion" cuando la observación se creó sin ella. */
  agregarFoto(o: ObservacionListItemDTO, event: Event): void {
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

  abrirLevantar(o: ObservacionListItemDTO): void {
    this.observacionParaLevantar = o;
    this.showLevantarModal = true;
  }

  iniciarEdicion(o: ObservacionListItemDTO): void {
    this.editandoId = o.id;
    this.editForm = {
      personaReporta: o.personaReporta ?? '',
      partidaReportada: o.partidaReportada,
      descripcion: o.descripcion,
    };
  }

  cancelarEdicion(): void {
    this.editandoId = null;
  }

  guardarEdicion(o: ObservacionListItemDTO): void {
    if (!this.editForm.descripcion.trim() || this.guardandoEdicion) return;
    this.guardandoEdicion = true;
    this.service
      .updateObservacion(o.id, {
        personaReporta: this.editForm.personaReporta.trim() || null,
        partidaReportada: this.editForm.partidaReportada,
        descripcion: this.editForm.descripcion.trim(),
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

  /** Modo "añadir otra": el modal sigue abierto, solo refrescamos lista/stats. */
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

  trackById(_: number, o: ObservacionListItemDTO): number {
    return o.id;
  }
}
