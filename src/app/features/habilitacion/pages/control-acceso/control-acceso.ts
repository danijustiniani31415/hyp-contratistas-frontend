import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../core/dtos/project/project.model';
import {
  ControlAccesoService,
  ConsultaResultDto,
  EntregableResumenDto,
  InduccionHoyDto,
  NoAutorizadoDto,
} from '../../services/control-acceso.service';
import { Tareo } from './components/tareo/tareo';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';

type Tab = 'consulta' | 'induccion' | 'no-autorizados' | 'tareo';

@Component({
  selector: 'app-control-acceso',
  standalone: true,
  imports: [CommonModule, FormsModule, Tareo, SearchSelect, AbrilPageHeaderComponent],
  templateUrl: './control-acceso.html',
  styleUrl: './control-acceso.css',
})
export class ControlAcceso implements OnInit {
  proyectos: ProjectGetDTO[] = [];
  selectedProyectoId: number | null = null;
  readonly oficinaId = 36;

  activeTab: Tab = 'consulta';

  // Consulta
  searchQuery = '';
  searching = false;
  searched = false;
  searchResults: ConsultaResultDto[] = [];
  selectedResult: ConsultaResultDto | null = null;
  searchError = '';

  get activeResult(): ConsultaResultDto | null {
    if (this.selectedResult) return this.selectedResult;
    if (this.searchResults.length === 1) return this.searchResults[0];
    return null;
  }

  // Inducción
  inducciones: InduccionHoyDto[] = [];
  loadingInducciones = false;
  readonly fechaHoy: string = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  readonly fechaHoyDate = new Date();

  // No autorizados
  noAutorizados: NoAutorizadoDto[] = [];
  loadingNoAutorizados = false;
  filtroEmpresaNA = '';
  filtroEstadoNA: 'no-autorizados' | 'autorizados' | 'todos' = 'no-autorizados';

  get empresasNA(): string[] {
    return [...new Set(this.noAutorizados.map(w => w.empresaNombre).filter(Boolean))].sort() as string[];
  }

  get noAutorizadosFiltrados(): NoAutorizadoDto[] {
    if (!this.filtroEmpresaNA) return this.noAutorizados;
    return this.noAutorizados.filter(w => w.empresaNombre === this.filtroEmpresaNA);
  }

  constructor(
    private projectService: ProjectService,
    private controlAccesoService: ControlAccesoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.projectService.getProjectsPaged({ page: 1, pageSize: 200 }).subscribe({
      next: res => {
        this.proyectos = res.data ?? [];
        this.cdr.detectChanges();
      },
    });
    this.loadInducciones();
  }

  onProyectoChange(value: number | null): void {
    this.selectedProyectoId = value;
    this.searchResults = [];
    this.selectedResult = null;
    this.searched = false;
    this.searchError = '';
    this.searchQuery = '';
    this.noAutorizados = [];
    this.filtroEmpresaNA = '';
    this.filtroEstadoNA = 'no-autorizados';
    if (this.activeTab !== 'consulta' && this.activeTab !== 'tareo') {
      this.loadTab(this.activeTab);
    }
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    if (tab !== 'consulta' && tab !== 'tareo') {
      this.loadTab(tab);
    }
  }

  private loadTab(tab: Tab): void {
    if (tab === 'induccion') this.loadInducciones();
    else if (tab === 'no-autorizados' && this.selectedProyectoId) this.loadNoAutorizados();
  }

  // ── Consulta ─────────────────────────────────────────────────────────────

  buscar(): void {
    if (!this.searchQuery.trim() || !this.selectedProyectoId) return;
    this.searching = true;
    this.searchResults = [];
    this.selectedResult = null;
    this.searched = false;
    this.searchError = '';
    this.controlAccesoService
      .consultar(this.selectedProyectoId, this.searchQuery.trim())
      .subscribe({
        next: res => {
          this.searchResults = res ?? [];
          this.searched = true;
          this.searching = false;
          this.cdr.detectChanges();
        },
        error: err => {
          this.searching = false;
          this.searchError = err?.error?.message ?? 'No se encontró el trabajador.';
          this.cdr.detectChanges();
        },
      });
  }

  onSearchKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.buscar();
  }

  estadoLabel(estado: string): string {
    switch (estado) {
      case 'AUTORIZADO': return 'HABILITADO';
      case 'NO_AUTORIZADO': return 'NO AUTORIZADO';
      case 'POR_VENCER': return 'POR VENCER';
      default: return estado;
    }
  }

  // ── Inducción ─────────────────────────────────────────────────────────────

  loadInducciones(): void {
    this.loadingInducciones = true;
    this.controlAccesoService
      .getInducciones()
      .subscribe({
        next: res => {
          this.inducciones = res;
          this.loadingInducciones = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingInducciones = false;
          this.cdr.detectChanges();
        },
      });
  }

  get confirmadosCount(): number {
    return this.inducciones.filter(i => i.ingresoConfirmado).length;
  }

  confirmarIngreso(ind: InduccionHoyDto): void {
    if (ind.ingresoConfirmado) return;
    this.controlAccesoService.confirmarIngreso(ind.induccionId).subscribe({
      next: () => {
        const idx = this.inducciones.findIndex(i => i.induccionId === ind.induccionId);
        if (idx >= 0) this.inducciones[idx] = { ...this.inducciones[idx], ingresoConfirmado: true };
        this.cdr.detectChanges();
      },
      error: err => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message ?? 'No se pudo confirmar el ingreso.',
        });
      },
    });
  }

  estaVencido(vigencia: string | null): boolean {
    return !!vigencia && vigencia < this.fechaHoy;
  }

  entregablesVigentes(entregables: EntregableResumenDto[] | null | undefined): EntregableResumenDto[] {
    return (entregables ?? []).filter(
      e => e.estado === 'Aprobado' && !this.estaVencido(e.vigencia),
    );
  }

  entregableIcono(e: EntregableResumenDto): { icono: string; color: string } {
    if (e.vigencia) {
      const dias = Math.floor((new Date(e.vigencia).getTime() - Date.now()) / 86400000);
      if (dias <= 7) return { icono: '⚠', color: '#eab308' };
    }
    return { icono: '✓', color: '#22c55e' };
  }

  // ── No autorizados ────────────────────────────────────────────────────────

  get noAutorizadosTitulo(): string {
    if (this.filtroEstadoNA === 'autorizados') return 'Autorizados';
    if (this.filtroEstadoNA === 'todos') return 'Todos';
    return 'No autorizados';
  }

  onFiltroEstadoNAChange(value: 'no-autorizados' | 'autorizados' | 'todos'): void {
    this.filtroEstadoNA = value;
    this.filtroEmpresaNA = '';
    this.loadNoAutorizados();
  }

  loadNoAutorizados(): void {
    if (!this.selectedProyectoId) return;
    this.loadingNoAutorizados = true;
    const estadoParam =
      this.filtroEstadoNA === 'no-autorizados' ? 'No Autorizado' :
      this.filtroEstadoNA === 'autorizados'    ? 'Habilitado'    :
      undefined;
    this.controlAccesoService.getNoAutorizados(this.selectedProyectoId, estadoParam).subscribe({
      next: res => {
        this.noAutorizados = res;
        this.loadingNoAutorizados = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingNoAutorizados = false;
        this.cdr.detectChanges();
      },
    });
  }
}
