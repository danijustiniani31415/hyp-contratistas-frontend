import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { AuthService } from '../../../core/services/auth.service';
import { Roles } from '../../../core/constants/roles';
import { DashboardHabService } from '../../../core/services/dashboard-hab.service';
import { ProjectService } from '../../../core/services/project.service';
import { ProjectGetDTO } from '../../../core/dtos/project/project.model';
import { HabEmpresaService } from '../services/hab-empresa.service';
import { TrabajadorHabService } from '../services/trabajador-hab.service';
import { EquipoHabService } from '../services/equipo-hab.service';
import {
  DashboardAdminDto,
  EmpresaResumenDto,
  WorkerNombradoDto,
  EntregableNombradoDto,
  InterconsultaNombradaDto,
} from '../../../core/dtos/habilitacion/dashboard-hab.model';
import { EmpresaEntregableDto, EmpresaProyectoDto } from '../dtos/empresa.model';
import { SearchSelect } from '../../../shared/components/search-select/search-select';

interface ProgresoProyecto {
  total: number; aprobadosEquiv: number; rechazados: number; porcentaje: number;
}

@Component({
  selector: 'app-dashboard-hab',
  standalone: true,
  imports: [CommonModule, RouterModule, SearchSelect],
  templateUrl: './dashboard-hab.component.html',
  styleUrl: './dashboard-hab.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHabComponent implements OnInit {
  // ── Admin ──
  loading = false;
  data: DashboardAdminDto | null = null;
  proyectosAdmin: ProjectGetDTO[] = [];
  selectedProyectoId: number | null = null;

  // ── Contratista ──
  empresaId: number | null = null;
  currentUserId: number | null = null;
  proyectos: EmpresaProyectoDto[] = [];
  loadingProyectos = true;
  progresoPorProyecto = new Map<number, ProgresoProyecto>();
  entregablesPorProyecto = new Map<number, EmpresaEntregableDto[]>();
  proyectoTabSeleccionado = 0;
  totalTrabajadores = 0;
  trabHabilitados = 0;
  trabNoHabilitados = 0;
  loadingTrabajadores = true;
  topNoHabilitados: { nombre: string; motivo: string }[] = [];
  totalEquipos = 0;
  proximosVencer: any[] = [];

  /** Secciones colapsables de la vista admin (tablas de detalle bajo las tarjetas KPI) —
   * arrancan todas cerradas para que se vean solo los títulos hasta que el usuario elija cuál abrir. */
  private seccionesAbiertas = new Set<string>();
  toggleSeccion(nombre: string): void {
    if (this.seccionesAbiertas.has(nombre)) this.seccionesAbiertas.delete(nombre);
    else this.seccionesAbiertas.add(nombre);
    this.cdr.detectChanges();
  }
  seccionAbierta(nombre: string): boolean { return this.seccionesAbiertas.has(nombre); }

  get esContratista(): boolean { return this.authService.isContratista(); }

  get isAdmin(): boolean {
    return this.authService.hasRole(Roles.ADMINISTRADOR_UDP) ||
           this.authService.hasRole(Roles.ADMINISTRADOR_SISTEMA);
  }

  get empresaNombre(): string {
    if (typeof localStorage === 'undefined') return '';
    try { return JSON.parse(localStorage.getItem('user') ?? '{}').razonSocial ?? ''; } catch { return ''; }
  }

  // Admin getters
  get kpis() { return this.data?.kpis; }
  get empresas(): EmpresaResumenDto[] { return this.data?.empresas ?? []; }
  get trabajadoresNoAutorizados(): WorkerNombradoDto[] { return this.data?.trabajadoresNoAutorizados ?? []; }
  get emosVencidos(): WorkerNombradoDto[] { return this.data?.emosVencidos ?? []; }
  get interconsultas(): InterconsultaNombradaDto[] { return this.data?.interconsultas ?? []; }
  get personalCasaNoHabilitado(): WorkerNombradoDto[] { return this.data?.personalCasaNoHabilitado ?? []; }
  get entregablesEmpresaVencidos(): EntregableNombradoDto[] { return this.data?.entregablesEmpresaVencidos ?? []; }
  get entregablesEmpresaFalta(): EntregableNombradoDto[] { return this.data?.entregablesEmpresaFalta ?? []; }
  get entregablesTrabajadorVencidos(): EntregableNombradoDto[] { return this.data?.entregablesTrabajadorVencidos ?? []; }
  get entregablesTrabajadorFalta(): EntregableNombradoDto[] { return this.data?.entregablesTrabajadorFalta ?? []; }
  get entregablesCasaVencidos(): EntregableNombradoDto[] { return this.data?.entregablesCasaVencidos ?? []; }
  get entregablesCasaFalta(): EntregableNombradoDto[] { return this.data?.entregablesCasaFalta ?? []; }

  // Contratista getters
  get proyectoTabActual(): EmpresaProyectoDto | null { return this.proyectos[this.proyectoTabSeleccionado] ?? null; }
  get entregablesTabActual(): EmpresaEntregableDto[] {
    const p = this.proyectoTabActual;
    return p ? (this.entregablesPorProyecto.get(p.proyectoId) ?? []) : [];
  }
  get entregablesAprobados(): number { return this.entregablesTabActual.filter(e => e.estado === 'Aprobado').length; }
  get entregablesFalta(): number { return this.entregablesTabActual.filter(e => e.estado === 'Falta' || e.estado === 'Rechazado').length; }
  get entregablesEnviados(): number { return this.entregablesTabActual.filter(e => e.estado === 'Enviado').length; }
  get pctEntregables(): number { const t = this.entregablesTabActual.length; return t ? Math.round((this.entregablesAprobados / t) * 100) : 0; }
  get totalEntregables(): number { return this.entregablesTabActual.length; }
  get pctHabilitados(): number { return this.totalTrabajadores ? Math.round((this.trabHabilitados / this.totalTrabajadores) * 100) : 0; }
  get totalProyectosActivos(): number { return this.proyectos.length; }
  get alertasCount(): number { return this.trabNoHabilitados; }
  get ringOffset(): number { return 125.7 - (this.pctEntregables / 100) * 125.7; }
  get ringOffsetTasa(): number { return 106.8 - (this.pctHabilitados / 100) * 106.8; }

  colorProyecto(idx: number): string {
    return ['#22c55e','#f59e0b','#3b82f6','#a855f7','#ef4444'][idx % 5];
  }
  diasClass(dias: number): string { return dias <= 7 ? 'dias-r' : dias <= 14 ? 'dias-o' : 'dias-y'; }
  iniciales(nombre: string): string { return nombre.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase(); }
  selectTab(idx: number): void { this.proyectoTabSeleccionado = idx; this.cdr.detectChanges(); }

  constructor(
    private dashboardService: DashboardHabService,
    private projectService: ProjectService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private habEmpresaService: HabEmpresaService,
    private trabajadorService: TrabajadorHabService,
    private equipoService: EquipoHabService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const proyectoIdUrl = Number(this.route.snapshot.queryParamMap.get('proyectoId'));
    if (Number.isFinite(proyectoIdUrl) && proyectoIdUrl > 0) {
      this.selectedProyectoId = proyectoIdUrl;
    }

    if (this.esContratista) {
      this.empresaId = this.authService.getEmpresaId() ?? null;
      const token = this.authService.getToken();
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          const candidates = [
            decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
            decoded.userId,
            decoded.nameid,
            decoded.sub,
          ];
          for (const c of candidates) {
            if (c != null) {
              const parsed = parseInt(String(c), 10);
              if (!isNaN(parsed)) {
                this.currentUserId = parsed;
                break;
              }
            }
          }
        } catch { }
      }
      if (this.empresaId) {
        this.loadProyectos();
        this.loadTrabajadores();
      }
    } else {
      this.loadProyectosAdmin();
    }
  }

  // ── Admin ──
  loadProyectosAdmin(): void {
    this.projectService.getProjectsPaged({ page: 1, pageSize: 200 }).subscribe({
      next: (res) => {
        this.proyectosAdmin = res.data ?? [];
        this.cdr.detectChanges();
        if (this.selectedProyectoId) {
          // Ya vino de la URL (?proyectoId=...) — no hace falta preseleccionar de nuevo.
          this.load();
        } else {
          this.preseleccionarProyectoActual();
        }
      },
      error: () => { this.proyectosAdmin = []; this.cdr.detectChanges(); },
    });
  }

  /** Preselecciona el proyecto "actual" del usuario (tabla user_project) si tiene uno
   * asignado y sigue en la lista de proyectos activos; si tiene varios, deja el primero. */
  preseleccionarProyectoActual(): void {
    this.projectService.getMisProyectos().subscribe({
      next: (ids) => {
        if (this.selectedProyectoId || !ids?.length) return;
        const asignado = this.proyectosAdmin.find(p => ids.includes(p.projectId));
        if (asignado) {
          this.onProyectoChange(asignado.projectId);
          this.cdr.detectChanges();
        }
      },
      error: () => {},
    });
  }

  onProyectoChange(id: number | null): void {
    this.selectedProyectoId = id;
    this.data = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { proyectoId: id ?? null },
      queryParamsHandling: 'merge',
    });
    if (id) this.load();
  }

  load(): void {
    if (!this.selectedProyectoId) return;
    this.loading = true;
    this.dashboardService.getResumen(this.selectedProyectoId).subscribe({
      next: (res) => { this.data = res; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  // ── Contratista ──
  loadProyectos(): void {
    this.loadingProyectos = true;
    this.habEmpresaService.getProyectos(this.empresaId!).subscribe({
      next: (ps) => {
        this.proyectos = ps;
        ps.forEach(p => this.loadEntregablesProyecto(p));
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingProyectos = false; },
    });
  }

  loadEntregablesProyecto(p: EmpresaProyectoDto): void {
    this.habEmpresaService.getEntregables(this.empresaId!, p.proyectoId).subscribe({
      next: (ents) => {
        this.entregablesPorProyecto.set(p.proyectoId, ents);
        const total = ents.length;
        const aprobados = ents.filter(e => e.estado === 'Aprobado').length;
        this.progresoPorProyecto.set(p.proyectoId, {
          total, aprobadosEquiv: aprobados,
          rechazados: ents.filter(e => e.estado === 'Rechazado').length,
          porcentaje: total ? Math.round((aprobados / total) * 100) : 0,
        });
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  loadTrabajadores(): void {
    this.loadingTrabajadores = true;
    this.trabajadorService.getTrabajadores({ empresaId: this.empresaId!, page: 1, pageSize: 200 }).subscribe({
      next: (res) => {
        const workers = res.data ?? [];
        this.totalTrabajadores = res.totalRecords ?? workers.length;
        this.trabHabilitados = workers.filter(w => w.estadoHabilitacion === 'Habilitado').length;
        this.trabNoHabilitados = workers.filter(w => w.estadoHabilitacion === 'No Autorizado').length;
        this.topNoHabilitados = workers
          .filter(w => w.estadoHabilitacion === 'No Autorizado').slice(0, 5)
          .map(w => ({ nombre: w.apellidoNombre ?? '—', motivo: 'No autorizado' }));
        this.loadingTrabajadores = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingTrabajadores = false; },
    });
  }

  pct(parte: number, total: number): number { return total ? Math.round((parte / total) * 100) : 0; }

  getWhatsappUrl(): string { return 'https://chat.whatsapp.com/'; }
}
