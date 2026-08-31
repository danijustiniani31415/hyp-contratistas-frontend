import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../../shared/components/date-picker/date-picker';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ActasReunionService } from '../services/actas-reunion.service';
import { ACTAS_REUNION_TABS } from '../actas-reunion-tabs';
import {
  AcuerdoBusquedaFiltro,
  AcuerdoBusquedaItemDTO,
  PagedResultDTO,
  TrabajadorAbrilDTO,
} from '../dtos/actas-reunion.dto';

/** No es un valor real del catálogo de estados (ver AcuerdoBusquedaFiltroRequest.Estado en backend):
 * filtra por EsInformativo=true en vez de por ReunionAcuerdoEstado. */
const ESTADOS_ACUERDO = [
  { id: 'PENDIENTE', descripcion: 'Pendiente' },
  { id: 'EN PROCESO', descripcion: 'En proceso' },
  { id: 'CUMPLIDO', descripcion: 'Cumplido' },
  { id: 'ANULADO', descripcion: 'Anulado' },
  { id: 'INFORMATIVO', descripcion: 'Informativo' },
];

@Component({
  selector: 'app-acuerdos-busqueda',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect, DatePicker, Paginator],
  templateUrl: './acuerdos-busqueda.html',
})
export class AcuerdosBusqueda implements OnInit {
  readonly tabs = ACTAS_REUNION_TABS;
  readonly estados = ESTADOS_ACUERDO;

  trabajadores: TrabajadorAbrilDTO[] = [];
  acuerdos: PagedResultDTO<AcuerdoBusquedaItemDTO> = {
    page: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  filtro: AcuerdoBusquedaFiltro = {
    estado: null,
    responsableWorkerId: null,
    desde: null,
    hasta: null,
    texto: null,
    page: 1,
    pageSize: 10,
  };

  constructor(
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.service.buscarTrabajadoresPorFiltro(null, null, null).subscribe({
      next: (data) => {
        this.trabajadores = data;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
    this.loadAcuerdos();
  }

  onFilterChange(): void {
    this.filtro.page = 1;
    this.loadAcuerdos();
  }

  onPageChange(page: number): void {
    this.filtro.page = page;
    this.loadAcuerdos();
  }

  private loadAcuerdos(): void {
    this.loaderService.show();
    this.service.getAcuerdos(this.filtro).subscribe({
      next: (data) => {
        this.acuerdos = data;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  irAReunion(a: AcuerdoBusquedaItemDTO): void {
    this.router.navigate(['/projects/actas-reunion', a.reunionId]);
  }

  criticidadClass(criticidad: string): string {
    switch (criticidad) {
      case 'CRITICO':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'MEDIO':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-gray-50 text-gray-500 border border-gray-200';
    }
  }

  criticidadLabel(criticidad: string): string {
    switch (criticidad) {
      case 'CRITICO':
        return 'Crítico';
      case 'MEDIO':
        return 'Medio';
      default:
        return 'Normal';
    }
  }

  estadoClass(a: AcuerdoBusquedaItemDTO): string {
    if (a.esInformativo) return 'bg-blue-50 text-blue-600 border border-blue-200';
    switch (a.reunionAcuerdoEstado) {
      case 'PENDIENTE':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'EN PROCESO':
        return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'CUMPLIDO':
        return 'bg-[var(--color-abril-primary-light)] text-[var(--color-abril-primary-dark)]';
      case 'ANULADO':
        return 'bg-gray-100 text-gray-500 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  estadoLabel(a: AcuerdoBusquedaItemDTO): string {
    return a.esInformativo ? 'Informativo' : a.reunionAcuerdoEstado;
  }
}
