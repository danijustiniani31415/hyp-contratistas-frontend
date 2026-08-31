import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { InduccionService } from '../../services/induccion.service';
import { InduccionListDto } from '../../dtos/induccion.model';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
@Component({
  selector: 'app-hab-inducciones',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchInput, FilterTriggerButton, FilterModal],
  templateUrl: './inducciones.html',
  styleUrl: './inducciones.css',
})
export class Inducciones implements OnInit {
  inducciones: InduccionListDto[] = [];
  private _todas: InduccionListDto[] = [];
  private _filtradasServidor: InduccionListDto[] = [];
  loading = false;

  filtroEstado = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtroProyectoId: number | null = null;
  busqueda = '';
  filtrosAbiertos = false;

  readonly hoy = new Date().toISOString().substring(0, 10);

  get catalogoProyectos(): { id: number; nombre: string }[] {
    const map = new Map<number, string>();
    for (const i of this._todas) map.set(i.proyectoId, i.proyectoNombre);
    return Array.from(map, ([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroEstado) n++;
    if (this.filtroFechaDesde) n++;
    if (this.filtroFechaHasta) n++;
    if (this.filtroProyectoId) n++;
    return n;
  }

  constructor(
    private induccionService: InduccionService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();

    const params: Record<string, unknown> = {
      empresaId: this.authService.getEmpresaId(),
    };
    if (this.filtroEstado && this.filtroEstado !== 'INGRESO') params['estado'] = this.filtroEstado;
    if (this.filtroFechaDesde) params['fechaDesde'] = this.filtroFechaDesde;
    if (this.filtroFechaHasta) params['fechaHasta'] = this.filtroFechaHasta;

    this.induccionService.getList(params).subscribe({
      next: (res) => {
        this._todas = res ?? [];
        this._filtradasServidor = this.filtroEstado === 'INGRESO'
          ? this._todas.filter(i => i.ingresoConfirmado && i.estado !== 'REALIZADA')
          : this.filtroEstado === 'PROGRAMADA'
            ? this._todas.filter(i => !i.ingresoConfirmado)
            : this._todas;
        this.aplicarFiltrosLocales();
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

  /** Proyecto y búsqueda (trabajador/DNI) filtran sobre lo ya cargado — no ameritan
   * ida y vuelta al servidor, la lista por empresa ya es acotada. */
  private aplicarFiltrosLocales(): void {
    let lista = this._filtradasServidor;
    if (this.filtroProyectoId) {
      lista = lista.filter(i => i.proyectoId === this.filtroProyectoId);
    }
    if (this.busqueda.trim()) {
      lista = lista.filter(i =>
        SearchInput.matches(i.apellidoNombre, this.busqueda) ||
        SearchInput.matches(i.dni, this.busqueda));
    }
    this.inducciones = lista;
  }

  onBusquedaChange(): void {
    this.aplicarFiltrosLocales();
    this.cdr.detectChanges();
  }

  onProyectoFiltroChange(): void {
    this.aplicarFiltrosLocales();
    this.cdr.detectChanges();
  }

  onFilterChange(): void {
    this.load();
  }

  abrirFiltros(): void {
    this.filtrosAbiertos = true;
  }

  clearFilters(): void {
    this.filtroEstado = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.filtroProyectoId = null;
    this.busqueda = '';
    this.load();
  }

  getBadge(item: InduccionListDto): { label: string; clase: string } {
    if (item.estado === 'REALIZADA') return { label: 'Completada', clase: 'badge-green' };
    if (item.estado === 'RECHAZADA') return { label: 'Rechazada', clase: 'badge-red' };
    if (item.ingresoConfirmado) return { label: 'Ingresó', clase: 'badge-yellow' };
    if (item.estado === 'FALTA') return { label: 'No asistió', clase: 'badge-red' };
    if (item.estado === 'PROGRAMADA' && item.fechaProgramada < this.hoy) {
      return { label: 'No asistió', clase: 'badge-red' };
    }
    if (item.estado === 'PROGRAMADA') return { label: 'Programada', clase: 'badge-blue' };
    return { label: item.estado ?? 'Desconocido', clase: 'badge-gray' };
  }

  isNoAsistio(item: InduccionListDto): boolean {
    return item.estado === 'FALTA' || (item.estado === 'PROGRAMADA' && !item.ingresoConfirmado && item.fechaProgramada < this.hoy);
  }
}
