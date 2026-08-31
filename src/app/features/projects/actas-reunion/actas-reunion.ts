import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../shared/components/date-picker/date-picker';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { ActasReunionService } from './services/actas-reunion.service';
import { ReunionAdd } from './components/reunion-add/reunion-add';
import { ACTAS_REUNION_TABS } from './actas-reunion-tabs';
import {
  CatalogoDTO,
  PagedResultDTO,
  ProyectoFiltroDTO,
  ReunionFiltro,
  ReunionListItemDTO,
  ReunionTemaOpcionDTO,
  TrabajadorAbrilDTO,
} from './dtos/actas-reunion.dto';

@Component({
  selector: 'app-actas-reunion',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent, SearchSelect, DatePicker, Paginator, ReunionAdd],
  templateUrl: './actas-reunion.html',
})
export class ActasReunion implements OnInit {
  readonly tabs = ACTAS_REUNION_TABS;
  proyectos: ProyectoFiltroDTO[] = [];
  estados: CatalogoDTO[] = [];
  trabajadores: TrabajadorAbrilDTO[] = [];
  temas: ReunionTemaOpcionDTO[] = [];
  reuniones: PagedResultDTO<ReunionListItemDTO> = {
    page: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  filtro: ReunionFiltro = {
    projectId: null,
    areaScopeId: null,
    reunionEstadoId: null,
    desde: null,
    hasta: null,
    page: 1,
    pageSize: 10,
  };

  showAddModal = false;

  constructor(
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getPaginaInicial(this.filtro).subscribe({
      next: (data) => {
        this.proyectos = data.proyectos;
        this.estados = data.reunionEstados;
        this.trabajadores = data.trabajadores;
        this.temas = data.temas;
        this.reuniones = data.reuniones;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onFilterChange(): void {
    this.filtro.page = 1;
    this.loadReuniones();
  }

  onPageChange(page: number): void {
    this.filtro.page = page;
    this.loadReuniones();
  }

  private loadReuniones(): void {
    this.loaderService.show();
    this.service.getReuniones(this.filtro).subscribe({
      next: (data) => {
        this.reuniones = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  openDetail(item: ReunionListItemDTO): void {
    this.router.navigate(['/projects/actas-reunion', item.reunionId]);
  }

  irAConfiguracion(): void {
    this.router.navigate(['/projects/actas-reunion/configuracion']);
  }

  onCreated(reunionId: number): void {
    this.showAddModal = false;
    this.router.navigate(['/projects/actas-reunion', reunionId]);
  }

  hora(value: string | null): string {
    return value ? value.slice(0, 5) : '—';
  }

  estadoClass(estado: string): string {
    switch (estado) {
      case 'PROGRAMADA':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'REALIZADA':
        return 'bg-[var(--color-abril-primary-light)] text-[var(--color-abril-primary-dark)]';
      case 'CANCELADA':
        return 'bg-red-50 text-red-600 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }
}
