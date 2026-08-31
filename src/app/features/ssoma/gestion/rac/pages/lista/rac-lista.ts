import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { RacService } from '../../services/rac.service';
import { RacListItemDto, RacListQuery, RacPagedResult } from '../../dtos/rac.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { CatalogosSaludService } from '../../../../salud-ocupacional/services/catalogos-salud.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';

import { RAC_TABS } from '../../rac-tabs';
@Component({
  selector: 'app-rac-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FabButton, CommonModule, FormsModule, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchSelect, Paginator],
  templateUrl: './rac-lista.html',
  styleUrl: './rac-lista.css',
})
export class RacLista implements OnInit {
  readonly tabs = RAC_TABS;
  result: RacPagedResult<RacListItemDto> | null = null;
  loading = false;
  query: RacListQuery = { page: 1, pageSize: 20 };

  filtroEstado = '';
  filtroSeveridad = '';
  filtroTipo = '';
  filtroSoloConPenalidad = false;
  filtroProyectoId: number | null = null;
  filtroEmpresaReportadaId: number | null = null;
  filtroEmpresaReportanteId: number | null = null;
  filtroMes: number | null = null;
  filtroAnio: number | null = null;
  filtrosAbiertos = false;
  readonly anioActual = new Date().getFullYear();
  readonly meses = [
    { val: 1, label: 'Enero' }, { val: 2, label: 'Febrero' }, { val: 3, label: 'Marzo' },
    { val: 4, label: 'Abril' }, { val: 5, label: 'Mayo' }, { val: 6, label: 'Junio' },
    { val: 7, label: 'Julio' }, { val: 8, label: 'Agosto' }, { val: 9, label: 'Septiembre' },
    { val: 10, label: 'Octubre' }, { val: 11, label: 'Noviembre' }, { val: 12, label: 'Diciembre' },
  ];
  readonly anios = Array.from({ length: 4 }, (_, i) => this.anioActual - 1 + i);

  proyectos: { id: number; nombre: string }[] = [];
  empresas: { id: number; razonSocial: string }[] = [];

  readonly estadoFilterOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'Abierto', label: 'Abierto' },
    { value: 'Cerrado', label: 'Cerrado' },
  ];
  readonly severidadFilterOptions = [
    { value: '', label: 'Toda severidad' },
    { value: 'CRITICO', label: 'Crítico' },
    { value: 'ALTO', label: 'Alto' },
    { value: 'MEDIO', label: 'Medio' },
    { value: 'BAJO', label: 'Bajo' },
  ];
  readonly tipoFilterOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'ACTO', label: 'Acto' },
    { value: 'CONDICION', label: 'Condición' },
  ];
  readonly mesFilterOptions = [{ value: null, label: 'Todos los meses' }, ...this.meses.map((m) => ({ value: m.val, label: m.label }))];
  get anioFilterOptions() {
    return [{ value: null, label: 'Todos los años' }, ...this.anios.map((a) => ({ value: a, label: String(a) }))];
  }

  constructor(
    private racService: RacService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private projectService: ProjectService,
    private catalogosSaludService: CatalogosSaludService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  get esContratista(): boolean {
    return this.authService.isContratista();
  }

  ngOnInit(): void {
    forkJoin({
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200 }),
      empresas: this.catalogosSaludService.getEmpresas(),
    }).subscribe({
      next: ({ proyectos, empresas }) => {
        this.proyectos = proyectos.data
          .filter(p => p.estado === 'ACTIVO')
          .map(p => ({ id: p.projectId, nombre: p.projectDescription }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.empresas = empresas
          .map(e => ({ id: e.id, razonSocial: e.nombre }))
          .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
        this.cdr.detectChanges();
      },
      error: () => {},
    });

    // Restaurar filtros al volver de cerrar/ver un RAC (evita tener que re-filtrar cada vez).
    const previos = this.racService.listFiltrosState;
    if (previos) {
      this.filtroEstado = previos.filtroEstado;
      this.filtroSeveridad = previos.filtroSeveridad;
      this.filtroTipo = previos.filtroTipo;
      this.filtroSoloConPenalidad = previos.filtroSoloConPenalidad;
      this.filtroProyectoId = previos.filtroProyectoId;
      this.filtroEmpresaReportadaId = previos.filtroEmpresaReportadaId;
      this.filtroEmpresaReportanteId = previos.filtroEmpresaReportanteId;
      this.filtroMes = previos.filtroMes;
      this.filtroAnio = previos.filtroAnio;
      this.query = { ...this.query, page: previos.page };
    }
    this.load();
  }

  private rangoMes(): { fechaDesde?: string; fechaHasta?: string } {
    if (!this.filtroMes || !this.filtroAnio) return {};
    // Backend filtra con FechaHasta inclusive (<=), así que el límite superior
    // es el último día del mes seleccionado (día 0 del mes siguiente), no el día 1.
    const desde = new Date(Date.UTC(this.filtroAnio, this.filtroMes - 1, 1));
    const hasta = new Date(Date.UTC(this.filtroAnio, this.filtroMes, 0, 23, 59, 59));
    return { fechaDesde: desde.toISOString(), fechaHasta: hasta.toISOString() };
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    const q: RacListQuery = {
      ...this.query,
      estado: this.filtroEstado || undefined,
      severidad: this.filtroSeveridad || undefined,
      tipo: this.filtroTipo || undefined,
      soloConPenalidad: this.filtroSoloConPenalidad || undefined,
      proyectoId: this.filtroProyectoId ?? undefined,
      empresaReportadaId: this.filtroEmpresaReportadaId ?? undefined,
      empresaReportanteId: this.filtroEmpresaReportanteId ?? undefined,
      ...this.rangoMes(),
    };
    this.query = q;
    this.racService.listFiltrosState = {
      filtroEstado: this.filtroEstado,
      filtroSeveridad: this.filtroSeveridad,
      filtroTipo: this.filtroTipo,
      filtroSoloConPenalidad: this.filtroSoloConPenalidad,
      filtroProyectoId: this.filtroProyectoId,
      filtroEmpresaReportadaId: this.filtroEmpresaReportadaId,
      filtroEmpresaReportanteId: this.filtroEmpresaReportanteId,
      filtroMes: this.filtroMes,
      filtroAnio: this.filtroAnio,
      page: q.page ?? 1,
    };
    this.racService.getList(q).subscribe({
      next: (res) => {
        this.result = res;
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

  onFiltroMesChange(value: number | null): void {
    this.filtroMes = value ?? null;
    if (this.filtroMes && !this.filtroAnio) this.filtroAnio = this.anioActual;
    this.buscar();
  }

  buscar(): void {
    this.query = { ...this.query, page: 1 };
    this.load();
  }

  cambiarPagina(p: number): void {
    if (p < 1 || (this.result && p > this.result.totalPages)) return;
    this.query = { ...this.query, page: p };
    this.load();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroSeveridad = '';
    this.filtroTipo = '';
    this.filtroSoloConPenalidad = false;
    this.filtroProyectoId = null;
    this.filtroEmpresaReportadaId = null;
    this.filtroEmpresaReportanteId = null;
    this.filtroMes = null;
    this.filtroAnio = null;
    this.query = { ...this.query, page: 1 };
    this.load();
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    this.cdr.detectChanges();
  }

  irADetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/rac', id]);
  }

  irANuevo(): void {
    this.router.navigate(['/ssoma/gestion/rac/nuevo']);
  }

  irACerrar(id: number): void {
    this.router.navigate(['/ssoma/gestion/rac', id, 'cerrar']);
  }

  descargarPdf(id: number): void {
    this.loaderService.show();
    this.racService.getReportePdf(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RAC-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.loaderService.hide();
      },
      error: () => {
        this.loaderService.hide();
      },
    });
  }

  puedeVerBotonCerrar(item: RacListItemDto): boolean {
    return item.estado !== 'Cerrado';
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroEstado || this.filtroSeveridad || this.filtroTipo || this.filtroSoloConPenalidad
      || this.filtroProyectoId || this.filtroEmpresaReportadaId || this.filtroEmpresaReportanteId
      || this.filtroMes || this.filtroAnio);
  }

  severidadClass(sev: string): string {
    switch (sev?.toUpperCase()) {
      case 'CRITICO': return 'badge-critico';
      case 'ALTO':    return 'badge-alto';
      case 'MEDIO':   return 'badge-medio';
      case 'BAJO':    return 'badge-bajo';
      default:        return 'badge-default';
    }
  }

  severidadDotClass(sev: string): string {
    switch (sev?.toUpperCase()) {
      case 'CRITICO': return 'dot--critico';
      case 'ALTO':    return 'dot--alto';
      case 'MEDIO':   return 'dot--medio';
      case 'BAJO':    return 'dot--bajo';
      default:        return 'dot--default';
    }
  }

  estadoClass(est: string): string {
    switch (est) {
      case 'Abierto':     return 'estado-abierto';
      case 'Cerrado':     return 'estado-cerrado';
      case 'Vencido':     return 'estado-vencido';
      case 'En proceso':  return 'estado-proceso';
      default:            return '';
    }
  }
}
