import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AccidenteIncidenteService } from '../../accidente-incidente.service';
import { FlashReportListItemDto, FlashReportInicializarDto, CatalogoItemDto, AREAS_ORIGEN } from '../../accidente-incidente.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import Swal from 'sweetalert2';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';

@Component({
  selector: 'app-accidente-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FabButton, CommonModule, FormsModule, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchSelect, Paginator],
  templateUrl: './accidente-lista.component.html',
  styleUrl: './accidente-lista.component.css',
})
export class AccidenteListaComponent implements OnInit {
  items: FlashReportListItemDto[] = [];
  loading = true;
  total = 0;
  page = 1;
  readonly pageSize = 20;

  proyectos: any[] = [];
  tipos: CatalogoItemDto[] = [];
  filtrosAbiertos = false;

  filtroProyectoId: number | undefined;
  filtroTipoId: number | undefined;
  filtroEstado = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtroArea = '';
  readonly areasOrigen = AREAS_ORIGEN;
  readonly estadoFilterOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'Borrador', label: 'Borrador' },
    { value: 'Enviado', label: 'Enviado' },
  ];

  constructor(
    private service: AccidenteIncidenteService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.filtroProyectoId = qp.get('proyectoId') ? Number(qp.get('proyectoId')) : undefined;
    this.filtroTipoId = qp.get('tipoId') ? Number(qp.get('tipoId')) : undefined;
    this.filtroEstado = qp.get('estado') ?? '';
    this.filtroFechaDesde = qp.get('fechaDesde') ?? '';
    this.filtroFechaHasta = qp.get('fechaHasta') ?? '';
    this.filtroArea = qp.get('areaOrigen') ?? '';
    const paginaGuardada = qp.get('page') ? Number(qp.get('page')) : 1;

    this.loaderService.show();
    this.service.inicializar().subscribe({
      next: (init) => {
        this.proyectos = init.proyectos
          .map((p) => ({ projectId: p.id, projectDescription: p.nombre }))
          .sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.tipos = init.tipos;
        this.loaderService.hide();
        this.cdr.markForCheck();
        this.cambiarPagina(paginaGuardada);
      },
      error: () => {
        this.loaderService.hide();
        this.cambiarPagina(paginaGuardada);
      },
    });
  }

  private syncQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        proyectoId: this.filtroProyectoId ?? null,
        tipoId: this.filtroTipoId ?? null,
        estado: this.filtroEstado || null,
        fechaDesde: this.filtroFechaDesde || null,
        fechaHasta: this.filtroFechaHasta || null,
        areaOrigen: this.filtroArea || null,
        page: this.page,
      },
      replaceUrl: true,
    });
  }

  load(): void {
    this.page = 1;
    this.cambiarPagina(1);
  }

  cambiarPagina(p: number): void {
    if (p < 1) p = 1;
    if (this.totalPages && p > this.totalPages) return;
    this.page = p;
    this.loading = true;
    this.loaderService.show();
    this.syncQueryParams();
    this.service
      .getList({
        proyectoId: this.filtroProyectoId,
        tipoId: this.filtroTipoId,
        estado: this.filtroEstado || undefined,
        fechaDesde: this.filtroFechaDesde || undefined,
        fechaHasta: this.filtroFechaHasta || undefined,
        areaOrigen: this.filtroArea || undefined,
        page: p,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.total = res.total;
          this.loading = false;
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

  limpiarFiltros(): void {
    this.filtroProyectoId = undefined;
    this.filtroTipoId = undefined;
    this.filtroEstado = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.filtroArea = '';
    this.load();
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    this.cdr.detectChanges();
  }

  irADetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/accidentes-incidentes', id]);
  }

  irANuevo(): void {
    this.router.navigate(['/ssoma/gestion/accidentes-incidentes/nuevo']);
  }

  async confirmarEliminar(event: Event, id: number): Promise<void> {
    event.stopPropagation();
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar registro?',
      text: 'Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    this.loaderService.show();
    this.service.eliminar(id).subscribe({
      next: () => { this.loaderService.hide(); this.load(); },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  get totalPages(): number { return Math.ceil(this.total / this.pageSize); }
  get pagesArray(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get hayFiltros(): boolean {
    return !!(this.filtroProyectoId || this.filtroTipoId || this.filtroEstado || this.filtroFechaDesde || this.filtroFechaHasta || this.filtroArea);
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroProyectoId) n++;
    if (this.filtroTipoId) n++;
    if (this.filtroEstado) n++;
    if (this.filtroFechaDesde) n++;
    if (this.filtroFechaHasta) n++;
    if (this.filtroArea) n++;
    return n;
  }

  areaLabel(area: string): string {
    return this.areasOrigen.find((a) => a.value === area)?.label ?? area;
  }

  areaClass(area: string): string {
    if (area === 'PostVenta') return 'area-postventa';
    if (area === 'ArquitecturaComercial') return 'area-arqcomercial';
    return 'area-produccion';
  }

  nivelLabel(n?: number): string {
    const labels = ['', 'Sin daño', 'Leve', 'c/tiempo perdido', 'Grave', 'Fatal', 'Fatal múltiple'];
    return n && n >= 1 && n <= 6 ? `N${n} - ${labels[n]}` : '—';
  }

  nivelClass(n?: number): string {
    if (!n) return '';
    if (n <= 2) return 'nivel-bajo';
    if (n <= 3) return 'nivel-medio';
    if (n <= 4) return 'nivel-alto';
    return 'nivel-critico';
  }

  /** Colores del badge de severidad para app-search-select ([badgeStyle]) — mismos umbrales que nivelClass. */
  nivelBadgeStyle(n?: number): { background: string; color: string } | null {
    if (!n) return null;
    if (n <= 2) return { background: '#dcfce7', color: '#166534' };
    if (n <= 3) return { background: '#fef9c3', color: '#713f12' };
    if (n <= 4) return { background: '#fee2e2', color: '#991b1b' };
    return { background: 'var(--color-abril-standard)', color: '#fff' };
  }

  tipoClass(codigo: string): string {
    const map: Record<string, string> = { AC: 'tipo-accidente', IN: 'tipo-incidente', NC: 'tipo-nc', AL: 'tipo-alerta' };
    return map[codigo] ?? 'tipo-incidente';
  }

  estadoClass(estado: string): string {
    if (estado === 'Enviado') return 'estado-enviado';
    if (estado === 'Borrador') return 'estado-borrador';
    return 'estado-abierto';
  }

  altaMedicaLabel(cerrado: boolean | null): string {
    if (cerrado === null) return '—';
    return cerrado ? 'Cerrado' : 'Abierto';
  }

  altaMedicaClass(cerrado: boolean | null): string {
    if (cerrado === null) return 'estado-borrador';
    return cerrado ? 'estado-enviado' : 'estado-abierto';
  }

  readonly nivelesSeveridad = [1, 2, 3, 4, 5, 6];
  readonly nivelesSeveridadOpts = [1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `N${n}` }));

  actualizarSeveridad(item: FlashReportListItemDto, campo: 'real' | 'potencial', valorRaw: string | number): void {
    const valor = valorRaw === '' ? undefined : Number(valorRaw);
    const real = campo === 'real' ? valor : item.consecuenciaRealPersonal;
    const potencial = campo === 'potencial' ? valor : item.consecuenciaPotencialPersonal;
    const anteriorReal = item.consecuenciaRealPersonal;
    const anteriorPotencial = item.consecuenciaPotencialPersonal;
    item.consecuenciaRealPersonal = real;
    item.consecuenciaPotencialPersonal = potencial;
    this.cdr.detectChanges();
    this.service.actualizarSeveridad(item.id, real, potencial).subscribe({
      error: (err: HttpErrorResponse) => {
        item.consecuenciaRealPersonal = anteriorReal;
        item.consecuenciaPotencialPersonal = anteriorPotencial;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }
}
