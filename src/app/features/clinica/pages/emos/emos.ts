import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { EmoService } from '../../../ssoma/salud-ocupacional/services/emo.service';
import { CatalogosSaludService } from '../../../ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmoPorTrabajadorDto, EmoPorTrabajadorQuery } from '../../../ssoma/salud-ocupacional/dtos/emo.model';
import { EmpresaSimpleDto } from '../../../ssoma/salud-ocupacional/dtos/catalogos.model';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { aptitudBadgeClass, APTITUD_CHART_ORDER } from '../../../ssoma/salud-ocupacional/shared/aptitud.utils';
import { diasVencerBadgeClass, diasVencerStyle } from '../../../ssoma/salud-ocupacional/shared/dias-vencer.utils';
import { EmoDetail } from '../../../ssoma/salud-ocupacional/emos/components/emo-detail/emo-detail';
import { ProgramarEmoDialogComponent } from '../../../../shared/components/programar-emo-dialog/programar-emo-dialog';
import { EditarEmoModal } from '../../../../shared/components/editar-emo-modal/editar-emo-modal';
import { DocumentosEmoModal } from '../../../../shared/components/documentos-emo-modal/documentos-emo-modal';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { ProyectoHabilitadoService } from '../../../ssoma/shared/services/proyecto-habilitado.service';

import { CLINICA_TABS } from '../../shared/clinica-tabs';
interface FilterOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-clinica-emos',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, SearchSelect, EmoDetail, ProgramarEmoDialogComponent, EditarEmoModal, DocumentosEmoModal, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchInput],
  templateUrl: './emos.html',
  styleUrl: './emos.css',
})
export class ClinicaEmos implements OnInit, OnDestroy {
  readonly tabs = CLINICA_TABS;
  readonly pageSize = 50;

  filters = {
    search: '',
    aptitud: '',
    estado: '',
    empresaId: 0,
    proyectoId: '',
    sinLectura: false,
    sinCertificado: false,
    sinEmoCompleto: false,
    sinInterconsulta: false,
  };

  filtrosAbiertos = false;

  aptitudOptions: FilterOption[] = [
    { id: '', nombre: 'Todas las aptitudes' },
    ...APTITUD_CHART_ORDER.map((a) => ({ id: a, nombre: a })),
  ];

  estadoOptions: FilterOption[] = [
    { id: '', nombre: 'Todos los estados' },
    { id: 'Vigente', nombre: 'Vigente' },
    { id: 'Por Vencer', nombre: 'Por Vencer' },
    { id: 'Vencido', nombre: 'Vencido' },
    { id: 'Convalidado', nombre: 'Convalidado' },
    { id: 'Anulado', nombre: 'Anulado' },
    { id: 'Sin EMO', nombre: 'Sin EMO' },
  ];

  empresaOptions: Array<EmpresaSimpleDto & { idAsString?: string }> = [];
  proyectoOptions: FilterOption[] = [{ id: '', nombre: 'Todos los proyectos' }];

  items: EmoPorTrabajadorDto[] = [];
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  selectedEmoId: number | null = null;
  selectedWorkerForProgramar: EmoPorTrabajadorDto | null = null;
  emoSeleccionado: EmoPorTrabajadorDto | null = null;
  emoDocumentos: EmoPorTrabajadorDto | null = null;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: EmoService,
    private catalogos: CatalogosSaludService,
    private proyectoService: ProyectoHabilitadoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.load(1));

    this.loadEmpresas();
    this.loadProyectos();
    this.load(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadEmpresas(): void {
    this.catalogos.getEmpresas().subscribe({
      next: (list) => {
        // Solo razones sociales de Abril: los trabajadores de contratistas no se gestionan aquí.
        this.empresaOptions = [
          { id: 0, nombre: 'Todas las empresas', esAbril: false },
          ...list.filter((e) => e.esAbril),
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        this.empresaOptions = [{ id: 0, nombre: 'Todas las empresas', esAbril: false }];
      },
    });
  }

  private loadProyectos(): void {
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
  }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    const query: EmoPorTrabajadorQuery = {
      page,
      pageSize: this.pageSize,
      search: this.filters.search?.trim() || undefined,
      aptitud: this.filters.aptitud || undefined,
      estado: this.filters.estado || undefined,
      empresaId: this.filters.empresaId || undefined,
      proyectoId: this.filters.proyectoId ? Number(this.filters.proyectoId) : undefined,
      sinLectura: this.filters.sinLectura || undefined,
      sinCertificado: this.filters.sinCertificado || undefined,
      sinEmoCompleto: this.filters.sinEmoCompleto || undefined,
      sinInterconsulta: this.filters.sinInterconsulta || undefined,
    };
    this.service.getEmosPorTrabajador(query).subscribe({
      next: (res) => {
        this.items = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
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
    this.filters = {
      search: '', aptitud: '', estado: '', empresaId: 0, proyectoId: '',
      sinLectura: false, sinCertificado: false, sinEmoCompleto: false, sinInterconsulta: false,
    };
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  onRowClick(item: EmoPorTrabajadorDto): void {
    if (item.tieneEmo && item.emoId != null) {
      this.selectedEmoId = item.emoId;
    }
  }

  closeDetail(): void {
    this.selectedEmoId = null;
  }

  onDetailSaved(): void {
    this.load(this.currentPage);
  }

  verHistorial(item: EmoPorTrabajadorDto, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/ssoma/salud-ocupacional/emos', item.workerId, 'historial']);
  }

  abrirProgramarEmo(item: EmoPorTrabajadorDto, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedWorkerForProgramar = item;
  }

  onProgramarEmoCerrado(reload: boolean): void {
    this.selectedWorkerForProgramar = null;
    if (reload) this.load(this.currentPage);
  }

  abrirDocumentos(item: EmoPorTrabajadorDto, event: MouseEvent): void {
    event.stopPropagation();
    this.emoDocumentos = item;
  }

  abrirEditar(item: EmoPorTrabajadorDto, event: MouseEvent): void {
    event.stopPropagation();
    this.emoSeleccionado = item;
  }

  onEditarClosed(): void {
    this.emoSeleccionado = null;
  }

  onEditarSaved(): void {
    this.emoSeleccionado = null;
    this.load(this.currentPage);
  }

  aptitudClass(aptitud?: string): string {
    return aptitud ? aptitudBadgeClass(aptitud) : 'bg-gray-100 text-gray-500 border-gray-200';
  }

  diasClass(dias?: number): string {
    if (dias == null) return 'bg-gray-100 text-gray-500 border-gray-200';
    return diasVencerBadgeClass(dias);
  }

  diasLabel(dias?: number): string {
    if (dias == null) return '—';
    return diasVencerStyle(dias).label;
  }

  estadoClass(estado?: string, tieneEmo?: boolean): string {
    if (!tieneEmo) return 'bg-red-50 text-red-700 border-red-200';
    switch (estado) {
      case 'Vigente':    return 'bg-green-100 text-green-800 border-green-200';
      case 'Por Vencer': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Vencido':    return 'bg-red-100 text-red-800 border-red-200';
      case 'Convalidado':return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Anulado':    return 'bg-gray-100 text-gray-600 border-gray-200';
      default:           return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  estadoLabel(item: EmoPorTrabajadorDto): string {
    return item.tieneEmo ? item.estado ?? '—' : 'Sin EMO';
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.search) n++;
    if (this.filters.aptitud) n++;
    if (this.filters.estado) n++;
    if (this.filters.empresaId) n++;
    if (this.filters.proyectoId) n++;
    if (this.filters.sinLectura) n++;
    if (this.filters.sinCertificado) n++;
    if (this.filters.sinEmoCompleto) n++;
    if (this.filters.sinInterconsulta) n++;
    return n;
  }
}
