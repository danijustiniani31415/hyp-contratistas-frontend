import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { CharlaContratistaService } from '../../services/charla-contratista.service';
import { CharlaContratistaDto } from '../../dtos/charla-contratista.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { SecureImgDirective } from '../../../../../../shared/directives/secure-img.directive';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SharedFiltersService } from '../../../../../../shared/services/shared-filters.service';

@Component({
  selector: 'app-charlas-revision-contratista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    AbrilModalPanel,
    FilterTriggerButton,
    FilterModal,
    StatusBadge,
    Paginator,
    SearchSelect,
    AbrilBulkActionDirective,
    SecureImgDirective,
  ],
  templateUrl: './charlas-revision-contratista.html',
  styleUrl: './charlas-revision-contratista.css',
})
export class CharlasRevisionContratista implements OnInit {
  items: CharlaContratistaDto[] = [];
  total = 0;
  page = 1;
  readonly pageSize = 20;
  loading = true;

  estado = 'Enviado';
  readonly estadoOpts = [
    { value: 'Enviado', label: 'Pendientes de revisión' },
    { value: 'Aprobado', label: 'Aprobado' },
    { value: 'Rechazado', label: 'Rechazado' },
    { value: '', label: 'Todos los estados' },
  ];

  proyectos: { id: number; nombre: string }[] = [];
  proyectoId: number | undefined;

  filtrosAbiertos = false;

  /** Mismas pestañas que CharlasDashboardComponent — esta página vive dentro del mismo grupo
   * "Charlas y Capacitaciones" y debe mostrar la misma barra de navegación. */
  readonly tabsHeader = [
    { label: 'Dashboard', icono: 'ti-chart-bar', route: '/ssoma/gestion/charlas/dashboard' },
    { label: 'Charlas Realizadas por Staff', icono: 'ti-users', route: '/ssoma/gestion/charlas/capacitaciones' },
    { label: 'Registro de Asistencia', icono: 'ti-plus', route: '/ssoma/gestion/charlas/nueva' },
    { label: 'Gestión', icono: 'ti-clipboard-check', route: '/ssoma/gestion/charlas/gestion' },
    { label: 'Revisión Contratistas', icono: 'ti-building', route: '/ssoma/gestion/charlas/revision-contratista' },
  ];

  detalle: CharlaContratistaDto | null = null;
  showRechazarForm = false;
  motivoRechazo = '';

  get filtrosActivos(): number {
    let n = 0;
    if (this.proyectoId) n++;
    return n;
  }

  constructor(
    private svc: CharlaContratistaService,
    private filters: SharedFiltersService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.filters.getProyectos().subscribe({
      next: (p) => { this.proyectos = (p as any[]).sort((a, b) => a.nombre.localeCompare(b.nombre)); this.cdr.markForCheck(); },
    });
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.svc.getRevision(this.estado || undefined, this.proyectoId, this.page, this.pageSize).subscribe({
      next: (r) => {
        this.items = r.items;
        this.total = r.total;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.loading = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get totalPages(): number { return Math.ceil(this.total / this.pageSize); }

  goPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.cargar();
  }

  onEstadoChange(v: string): void {
    this.estado = v;
    this.page = 1;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.proyectoId = undefined;
    this.page = 1;
    this.cargar();
  }

  abrirDetalle(item: CharlaContratistaDto): void {
    this.detalle = item;
    this.showRechazarForm = false;
    this.motivoRechazo = '';
    this.cdr.markForCheck();
  }

  cerrarDetalle(): void {
    this.detalle = null;
    this.showRechazarForm = false;
    this.motivoRechazo = '';
    this.cdr.markForCheck();
  }

  aprobar(): void {
    if (!this.detalle) return;
    this.loader.show();
    this.svc.aprobar(this.detalle.id).subscribe({
      next: () => {
        this.loader.hide();
        this.cerrarDetalle();
        this.cargar();
        Swal.fire({ icon: 'success', title: 'Charla aprobada', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => { this.loader.hide(); this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  rechazar(): void {
    if (!this.detalle || !this.motivoRechazo.trim()) return;
    this.loader.show();
    this.svc.rechazar(this.detalle.id, this.motivoRechazo.trim()).subscribe({
      next: () => {
        this.loader.hide();
        this.cerrarDetalle();
        this.cargar();
        Swal.fire({ icon: 'info', title: 'Charla rechazada', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => { this.loader.hide(); this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  estadoBg(estado: string): string {
    return estado === 'Aprobado' ? '#D7FAF4' : estado === 'Rechazado' ? '#FAD5D4' : '#FEF3C7';
  }

  estadoColor(estado: string): string {
    return estado === 'Aprobado' ? '#009C87' : estado === 'Rechazado' ? '#D30000' : '#B45309';
  }

  isPdf(url: string | null | undefined): boolean {
    return !!url && url.toLowerCase().includes('.pdf');
  }

  safeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
