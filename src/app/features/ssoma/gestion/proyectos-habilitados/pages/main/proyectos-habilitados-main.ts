import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ProyectoHabilitadoService } from '../../../../shared/services/proyecto-habilitado.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ProyectoHabilitadoListDTO } from '../../../../shared/dtos/proyecto-habilitado.dtos';
import {
  AbrilPageHeaderComponent,
} from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

@Component({
  selector: 'app-proyectos-habilitados-main',
  standalone: true,
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    StatusBadge,
    TitleCasePipe,
    Paginator,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
  ],
  templateUrl: './proyectos-habilitados-main.html',
  styleUrl: './proyectos-habilitados-main.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProyectosHabilitadosMainComponent implements OnInit {
  private svc = inject(ProyectoHabilitadoService);
  private errorSvc = inject(ErrorService);
  private loader = inject(LoaderService);
  private cdr = inject(ChangeDetectorRef);

  proyectos: ProyectoHabilitadoListDTO[] = [];
  cambiandoId: number | null = null;

  searchText = '';
  estadoFilter: boolean | null = null;
  readonly estadoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Activo' },
    { value: false, label: 'Culminado / Inactivo' },
  ];
  habilitadoFilter: boolean | null = null;
  readonly habilitadoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Habilitado' },
    { value: false, label: 'No habilitado' },
  ];
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<ProyectoHabilitadoListDTO>();

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.estadoFilter !== null) n++;
    if (this.habilitadoFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.estadoFilter = null;
    this.habilitadoFilter = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
    this.cdr.markForCheck();
  }

  get proyectosFiltrados(): ProyectoHabilitadoListDTO[] {
    return this.proyectos.filter((p) => {
      const matchesTexto =
        !this.searchText.trim() || SearchInput.matches(p.proyectoDescription ?? '', this.searchText);
      const matchesEstado = this.estadoFilter === null || p.proyectoActivo === this.estadoFilter;
      const matchesHabilitado = this.habilitadoFilter === null || p.habilitado === this.habilitadoFilter;
      return matchesTexto && matchesEstado && matchesHabilitado;
    });
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.proyectosFiltrados);
  }

  get pagedProyectos(): ProyectoHabilitadoListDTO[] {
    return this.pager.page(this.proyectosFiltrados);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loader.show();
    this.svc.getTodos().subscribe({
      next: (res) => {
        this.proyectos = res;
        this.pager.reset();
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggle(p: ProyectoHabilitadoListDTO): void {
    if (this.cambiandoId === p.proyectoId) return;
    const nuevoValor = !p.habilitado;
    this.cambiandoId = p.proyectoId;
    this.cdr.markForCheck();
    this.svc.setHabilitado(p.proyectoId, nuevoValor).subscribe({
      next: () => {
        p.habilitado = nuevoValor;
        this.cambiandoId = null;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.cambiandoId = null;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
