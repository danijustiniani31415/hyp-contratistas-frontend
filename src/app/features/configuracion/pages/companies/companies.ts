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
import { CatalogosSaludService } from '../../../ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmpresaSimpleDto } from '../../../ssoma/salud-ocupacional/dtos/catalogos.model';
import { CompanyEditForm } from './components/company-edit-form/company-edit-form';
import { CompanyCreateForm } from './components/company-create-form/company-create-form';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';

import { CONFIGURACION_TABS } from '../../shared/configuracion-tabs';
@Component({
  selector: 'app-config-companies',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, SearchInput, SearchSelect, CompanyEditForm, CompanyCreateForm, AbrilPageHeaderComponent],
  templateUrl: './companies.html',
  styleUrl: './companies.css',
})
export class Companies implements OnInit, OnDestroy {
  readonly tabs = CONFIGURACION_TABS;
  readonly pageSize = 15;

  filters = { search: '', estado: '' as '' | 'activo' | 'inactivo' };

  readonly estadoOptions = [
    { value: '', label: 'Todos' },
    { value: 'activo', label: 'Activos' },
    { value: 'inactivo', label: 'Inactivos' },
  ];

  all: EmpresaSimpleDto[] = [];
  filtered: EmpresaSimpleDto[] = [];
  pageItems: EmpresaSimpleDto[] = [];

  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  editModalOpen = false;
  editCompany: EmpresaSimpleDto | null = null;
  createModalOpen = false;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe(() => {
        // El loader aparece solo tras ~0.5 s de inactividad (no en cada tecla).
        this.loaderService.show();
        this.applyFilters(1);
        setTimeout(() => this.loaderService.hide(), 300);
      });
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.invalidateCache();
    this.service.getEmpresas().subscribe({
      next: (res) => {
        this.all = res ?? [];
        this.applyFilters(1);
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

  applyFilters(page: number): void {
    const q = this.filters.search.trim().toLowerCase();
    const estado = this.filters.estado;
    this.filtered = this.all.filter((e) => {
      const activo = e.activo ?? true;
      if (estado === 'activo' && !activo) return false;
      if (estado === 'inactivo' && activo) return false;
      if (!q) return true;
      return SearchInput.matches(e.nombre ?? '', q);
    });
    this.totalRecords = this.filtered.length;
    this.totalPages = Math.max(Math.ceil(this.totalRecords / this.pageSize), 1);
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
    const start = (this.currentPage - 1) * this.pageSize;
    this.pageItems = this.filtered.slice(start, start + this.pageSize);
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChange$.next(value);
  }

  onFilterChange(): void {
    this.applyFilters(1);
  }

  onEstadoChange(value: string | null): void {
    this.filters.estado = (value ?? '') as '' | 'activo' | 'inactivo';
    this.applyFilters(1);
  }

  clearFilters(): void {
    this.filters = { search: '', estado: '' };
    this.applyFilters(1);
  }

  onPageChange(page: number): void {
    this.applyFilters(page);
  }

  openEditModal(company: EmpresaSimpleDto): void {
    this.editCompany = company;
    this.editModalOpen = true;
  }

  closeEditModal(): void {
    this.editModalOpen = false;
    this.editCompany = null;
  }

  onEditSaved(): void {
    this.closeEditModal();
  }

  openCreateModal(): void {
    this.createModalOpen = true;
  }

  closeCreateModal(): void {
    this.createModalOpen = false;
  }

  onCreated(): void {
    this.createModalOpen = false;
    this.load();
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.estado);
  }
}
