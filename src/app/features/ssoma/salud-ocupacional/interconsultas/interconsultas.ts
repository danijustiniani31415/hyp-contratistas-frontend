import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { InterconsultaService } from '../services/interconsulta.service';
import { CatalogosSaludService } from '../services/catalogos-salud.service';
import { ProyectoHabilitadoService } from '../../shared/services/proyecto-habilitado.service';
import {
  InterconsultaListDto,
  InterconsultaQueryParams,
} from '../dtos/interconsulta.model';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Roles } from '../../../../core/constants/roles';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import {
  estadoBadgeClass,
  estadoInterconsultaStyle,
} from '../shared/estado.utils';
import { InterconsultaDetail } from './components/interconsulta-detail/interconsulta-detail';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../shared/directives/abril-bulk-action.directive';
import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';

interface FilterOption {
  id: string;
  nombre: string;
}

/** Opción del filtro "Tipo": el id es el de workers_obra_oficina_staff. */
interface TipoOption {
  id: number | '';
  nombre: string;
}

/** Ids fijos del catálogo workers_obra_oficina_staff (ver ObraOficinaStaffIds en el backend). */
const OBRA_OFICINA_STAFF_IDS = { obra: 1, staff: 2, oficinaCentral: 3 } as const;

/** Opciones del filtro "Tipo" (workers_obra_oficina_staff). */
const TIPO_OPTIONS: TipoOption[] = [
  { id: '', nombre: 'Todos los tipos' },
  { id: OBRA_OFICINA_STAFF_IDS.staff, nombre: 'Staff' },
  { id: OBRA_OFICINA_STAFF_IDS.oficinaCentral, nombre: 'Oficina Central' },
  { id: OBRA_OFICINA_STAFF_IDS.obra, nombre: 'Obrero (Obra)' },
];

const OBRA_OFICINA_CON_CORREO_PROPIO = new Set<number>([
  OBRA_OFICINA_STAFF_IDS.staff,
  OBRA_OFICINA_STAFF_IDS.oficinaCentral,
]);

@Component({
  selector: 'app-salud-interconsultas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Paginator,
    SearchSelect,
    InterconsultaDetail,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    TitleCasePipe,
    AbrilBulkActionDirective,
  ],
  templateUrl: './interconsultas.html',
  styleUrl: './interconsultas.css',
})
export class Interconsultas implements OnInit, OnDestroy {
  readonly tabs = SSOMA_TABS;
  anioActual = new Date().getFullYear();
  readonly pageSize = 15;

  filters = {
    search: '',
    estado: 'Pendiente',
    proyectoId: '',
    contributorId: '',
    obraOficinaStaffId: '' as number | '',
  };

  estadoOptions: FilterOption[] = [
    { id: '', nombre: 'Todos los estados' },
    { id: 'Pendiente', nombre: 'Pendiente' },
    { id: 'Atendida', nombre: 'Atendida' },
    { id: 'Cancelada', nombre: 'Cancelada' },
  ];

  tipoOptions: TipoOption[] = TIPO_OPTIONS;
  proyectoOptions: FilterOption[] = [{ id: '', nombre: 'Todos los proyectos' }];
  razonSocialOptions: FilterOption[] = [{ id: '', nombre: 'Todas las razones sociales' }];

  items: InterconsultaListDto[] = [];
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  selectedId: number | null = null;
  selectedIds = new Set<number>();
  sendingEmails = false;
  filtrosAbiertos = false;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: InterconsultaService,
    private catalogosService: CatalogosSaludService,
    private proyectoService: ProyectoHabilitadoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  /**
   * Solo la clínica (el médico) puede enviar estos correos en producción — el backend también
   * lo exige. Se incluye Jefe SSOMA (id 9) para que pueda probar el flujo.
   */
  get puedeEnviarCorreos(): boolean {
    return this.authService.isClinica() || this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA);
  }

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.load(1));
    this.loadCatalogos();
    this.load(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCatalogos(): void {
    this.proyectoService.getHabilitados().subscribe({
      next: (proyectos) => {
        this.proyectoOptions = [
          { id: '', nombre: 'Todos los proyectos' },
          ...proyectos.map((p) => ({ id: String(p.projectId), nombre: p.projectDescription })),
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        // Catálogo secundario: si falla, se mantiene solo la opción "Todos".
      },
    });

    this.catalogosService.getEmpresas().subscribe({
      next: (empresas) => {
        // Solo razones sociales de Abril: los trabajadores de contratistas no se gestionan aquí.
        this.razonSocialOptions = [
          { id: '', nombre: 'Todas las razones sociales' },
          ...empresas
            .filter((e) => e.esAbril)
            .map((e) => ({ id: String(e.id), nombre: e.nombre })),
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        // Catálogo secundario: si falla, se mantiene solo la opción "Todas".
      },
    });
  }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    const query: InterconsultaQueryParams = {
      page,
      pageSize: this.pageSize,
      search: this.filters.search?.trim() || undefined,
      estado: this.filters.estado || undefined,
      proyectoId: this.filters.proyectoId ? Number(this.filters.proyectoId) : undefined,
      contributorId: this.filters.contributorId ? Number(this.filters.contributorId) : undefined,
      obraOficinaStaffId: this.filters.obraOficinaStaffId || undefined,
    };
    this.service.getInterconsultas(query).subscribe({
      next: (res) => {
        this.items = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        this.selectedIds.clear();
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChange$.next(value);
  }

  onFilterChange(): void {
    this.load(1);
  }

  clearFilters(): void {
    this.filters = { search: '', estado: 'Pendiente', proyectoId: '', contributorId: '', obraOficinaStaffId: '' };
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  openDetail(item: InterconsultaListDto): void {
    this.selectedId = item.id;
  }

  closeDetail(): void {
    this.selectedId = null;
  }

  estadoClass(estado: string): string {
    return estadoBadgeClass(estadoInterconsultaStyle(estado));
  }

  isPendientePulse(estado: string): boolean {
    return estadoInterconsultaStyle(estado).pulse === true;
  }

  diasPendiente(item: InterconsultaListDto): number {
    if (item.estado !== 'Pendiente') return item.diasPendiente;
    // Fallback: si backend no envía dias, lo calculamos.
    if (item.diasPendiente != null && item.diasPendiente >= 0) return item.diasPendiente;
    const derivacion = new Date(item.fechaDerivacion);
    if (isNaN(derivacion.getTime())) return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    derivacion.setHours(0, 0, 0, 0);
    const ms = hoy.getTime() - derivacion.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }

  diasPendienteClass(dias: number): string {
    if (dias < 3) return 'text-gray-600 bg-gray-100';
    if (dias < 7) return 'text-yellow-700 bg-yellow-100';
    if (dias < 15) return 'text-orange-700 bg-orange-100';
    return 'text-red-700 bg-red-100';
  }

  /** Trabajador con correo propio (Staff/Oficina Central con email corporativo). */
  tieneCorreoPropio(item: InterconsultaListDto): boolean {
    return !!item.workerEmail && OBRA_OFICINA_CON_CORREO_PROPIO.has(item.obraOficinaStaffId ?? 0);
  }

  /** Si obra_oficina viene vacío se asume "Obra": solo Staff/Oficina Central se marcan explícitamente. */
  tipoDisplay(item: InterconsultaListDto): string {
    return item.obraOficina?.trim() || 'Obra';
  }

  /** Categoría + puesto combinados en un solo texto compacto ("OPERARIO · ALBAÑIL"). */
  puestoDisplay(item: InterconsultaListDto): string {
    return [item.categoria, item.puesto].filter((v) => !!v?.trim()).join(' · ');
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filters.search ||
      this.filters.estado !== 'Pendiente' ||
      this.filters.proyectoId ||
      this.filters.contributorId ||
      this.filters.obraOficinaStaffId
    );
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.search) n++;
    if (this.filters.estado !== 'Pendiente') n++;
    if (this.filters.proyectoId) n++;
    if (this.filters.contributorId) n++;
    if (this.filters.obraOficinaStaffId) n++;
    return n;
  }

  // ===== Selección y envío de correos =====

  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelection(id: number): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  get allVisibleSelected(): boolean {
    return this.items.length > 0 && this.items.every((i) => this.selectedIds.has(i.id));
  }

  toggleSelectAll(): void {
    if (this.allVisibleSelected) {
      this.items.forEach((i) => this.selectedIds.delete(i.id));
    } else {
      this.items.forEach((i) => this.selectedIds.add(i.id));
    }
  }

  enviarCorreos(): void {
    if (this.selectedIds.size === 0 || this.sendingEmails) return;
    const ids = Array.from(this.selectedIds);

    Swal.fire({
      icon: 'question',
      title: '¿Enviar correos de recordatorio?',
      html: `Se notificará a <strong>${ids.length}</strong> trabajador(es) seleccionado(s).<br>
        Staff/Oficina Central reciben correo individual; obreros sin correo se agrupan en un
        correo consolidado a su administrador encargado.`,
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.sendingEmails = true;
      this.loaderService.show();
      this.service.enviarCorreos(ids).subscribe({
        next: (res) => {
          this.sendingEmails = false;
          this.loaderService.hide();
          const detalleHtml = res.detalles?.length
            ? `<ul style="text-align:left; font-size:12px; margin-top:8px; max-height:200px; overflow:auto;">
                ${res.detalles.map((d) => `<li>${d}</li>`).join('')}
              </ul>`
            : '';
          Swal.fire({
            icon: res.totalErrores > 0 ? 'warning' : 'success',
            title: 'Correos procesados',
            html: `Enviados: <strong>${res.totalEnviados}</strong> · Errores: <strong>${res.totalErrores}</strong> de ${res.totalSeleccionadas} seleccionada(s).${detalleHtml}`,
          });
          this.selectedIds.clear();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.sendingEmails = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }
}
