import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EmoService } from '../../../ssoma/salud-ocupacional/services/emo.service';
import {
  DocumentTypeDto,
  EmoPorTrabajadorDto,
  EmoPorTrabajadorQuery,
} from '../../../ssoma/salud-ocupacional/dtos/emo.model';
import { WorkerService } from '../../../ssoma/salud-ocupacional/services/worker.service';
import { WorkerEditForm } from './components/worker-edit-form/worker-edit-form';
import {
  aptitudBadgeClass,
  aptitudDotColor,
  SIN_EMO_COLOR,
  SIN_EMO_LABEL,
} from '../../../ssoma/salud-ocupacional/shared/aptitud.utils';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';

import { CONFIGURACION_TABS } from '../../shared/configuracion-tabs';
@Component({
  selector: 'app-config-workers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Paginator,
    SearchInput,
    SearchSelect,
    AbrilPageHeaderComponent,
    WorkerEditForm,
  ],
  templateUrl: './workers.html',
  styleUrl: './workers.css',
})
export class Workers implements OnInit, OnDestroy {
  readonly tabs = CONFIGURACION_TABS;
  readonly pageSize = 15;

  filters = {
    search: '',
    aptitud: '',
    estado: '',
  };

  items: EmoPorTrabajadorDto[] = [];
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  // Sin opción sentinela "Todas/Todos": limpiar el desplegable (valueChange null) equivale a no filtrar.
  aptitudOptions = [
    { id: 'Apto', nombre: 'Apto' },
    { id: 'Apto con Restricciones', nombre: 'Apto con Restricciones' },
    { id: 'No Apto', nombre: 'No Apto' },
    { id: 'Observado', nombre: 'Observado' },
    { id: 'Pendiente', nombre: 'Pendiente' },
  ];

  estadoOptions = [
    { id: 'Vigente', nombre: 'Vigente' },
    { id: 'Por Vencer', nombre: 'Por Vencer' },
    { id: 'Vencido', nombre: 'Vencido' },
    { id: 'Anulado', nombre: 'Anulado' },
  ];

  // Edición (modal datos básicos).
  editOpen = false;
  editWorker: EmoPorTrabajadorDto | null = null;
  documentTypes: DocumentTypeDto[] = [];
  private docTypesLoaded = false;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: EmoService,
    private workerService: WorkerService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.load(1));
    this.load(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    const query: EmoPorTrabajadorQuery = {
      page,
      pageSize: this.pageSize,
      // Esta pantalla mantiene el catálogo de fichas, así que ve la tabla `workers` completa:
      // retirados y fichas sin vinculación incluidos. Es la única que manda este flag; sin él
      // Categorías y Puestos contaba trabajadores que después no se podían buscar acá para
      // reasignarles el puesto.
      todasLasFichas: true,
      search: this.filters.search?.trim() || undefined,
      aptitud: this.filters.aptitud || undefined,
      estado: this.filters.estado || undefined,
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

  onAptitudChange(value: string | null): void {
    this.filters.aptitud = value ?? '';
    this.load(1);
  }

  onEstadoChange(value: string | null): void {
    this.filters.estado = value ?? '';
    this.load(1);
  }

  clearFilters(): void {
    this.filters = { search: '', aptitud: '', estado: '' };
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  /** Abre el modal de edición. Carga el catálogo de tipos de documento la 1ª vez. */
  openEdit(item: EmoPorTrabajadorDto): void {
    this.editWorker = item;
    if (this.docTypesLoaded) {
      this.editOpen = true;
      return;
    }
    this.loaderService.show();
    this.workerService.getDocumentTypes().subscribe({
      next: (tipos) => {
        this.documentTypes = tipos ?? [];
        this.docTypesLoaded = true;
        this.loaderService.hide();
        this.editOpen = true;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  closeEdit(): void {
    this.editOpen = false;
    this.editWorker = null;
  }

  onEditSaved(): void {
    this.closeEdit();
    this.load(this.currentPage);
  }

  estadoEmoClass(estado?: string): string {
    switch (estado) {
      case 'Vigente':
        return 'chip-green';
      case 'Por Vencer':
        return 'chip-orange';
      case 'Vencido':
        return 'chip-red';
      case 'Anulado':
        return 'chip-gray';
      default:
        return 'chip-gray';
    }
  }

  aptitudColor(item: EmoPorTrabajadorDto): string {
    if (!item.tieneEmo) return SIN_EMO_COLOR;
    return aptitudDotColor(item.aptitud);
  }

  aptitudBadge(item: EmoPorTrabajadorDto): string {
    return item.tieneEmo ? aptitudBadgeClass(item.aptitud) : 'bg-gray-100 text-gray-600 border-gray-200';
  }

  aptitudLabel(item: EmoPorTrabajadorDto): string {
    if (!item.tieneEmo) return SIN_EMO_LABEL;
    return item.aptitud ?? '—';
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.aptitud || this.filters.estado);
  }
}
