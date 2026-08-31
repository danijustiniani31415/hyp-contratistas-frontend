import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { AuthService } from '../../../../core/services/auth.service';
import { HabEmpresaService } from '../../services/hab-empresa.service';
import { TrabajadorHabService } from '../../services/trabajador-hab.service';
import { EquipoHabService } from '../../services/equipo-hab.service';
import { EmpresaEntregableDto, EmpresaProyectoDto } from '../../dtos/empresa.model';
import { ContratistaUsuarios } from './components/contratista-usuarios/contratista-usuarios';
import { AbrilPageHeaderComponent, AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';

interface ProgresoProyecto {
  total: number;
  aprobadosEquiv: number;
  rechazados: number;
  porcentaje: number;
}

interface VencerItem {
  nombre: string;
  documento: string;
  proyecto: string;
  dias: number;
  tipo: 'trabajador' | 'empresa';
  iniciales: string;
}

@Component({
  selector: 'app-dashboard-contratista',
  standalone: true,
  imports: [CommonModule, RouterModule, ContratistaUsuarios, AbrilPageHeaderComponent],
  templateUrl: './dashboard-contratista.html',
  styleUrl: './dashboard-contratista.css',
})
export class DashboardContratista implements OnInit {
  empresaId: number | null = null;
  currentUserId: number | null = null;
  activeSection: 'resumen' | 'usuarios' = 'resumen';
  proyectoTabSeleccionado = 0;

  // Proyectos
  proyectos: EmpresaProyectoDto[] = [];
  loadingProyectos = true;
  progresoPorProyecto = new Map<number, ProgresoProyecto>();

  // Entregables empresa
  entregablesPorProyecto = new Map<number, EmpresaEntregableDto[]>();
  loadingEntregables = false;

  // Trabajadores
  totalTrabajadores = 0;
  trabHabilitados = 0;
  trabPendientes = 0;
  trabNoHabilitados = 0;
  loadingTrabajadores = true;
  topNoHabilitados: { nombre: string; motivo: string }[] = [];

  // Equipos
  totalEquipos = 0;
  loadingEquipos = true;

  // Próximos a vencer (datos mock hasta que haya endpoint)
  proximosVencer: VencerItem[] = [];

  headerTabs: AbrilPageTab[] = [
    { label: 'Panel',        icono: 'ti-layout-dashboard', route: '/habilitacion/dashboard-contratista' },
    { label: 'Trabajadores', icono: 'ti-users',            route: '/habilitacion/gestion/trabajadores' },
    { label: 'Empresa',      icono: 'ti-building',         route: '/habilitacion/gestion/empresa' },
    { label: 'Equipos',      icono: 'ti-truck',            route: '/habilitacion/gestion/equipos' },
    { label: 'SCTR',         icono: 'ti-shield-check',     route: '/habilitacion/gestion/sctr-vidaley' },
    { label: 'Inducciones',  icono: 'ti-school',           route: '/habilitacion/gestion/inducciones' },
    { label: 'Evaluar SSOMA', icono: 'ti-clipboard-check', route: '/habilitacion/evaluar-prevencionista' },
    { label: 'Mi Desempeño', icono: 'ti-report',          route: '/habilitacion/mi-perfil-supervisor' },
    { label: 'Usuarios',     icono: 'ti-users-group',      active: false },
  ];

  onTabClick(tab: AbrilPageTab): void {
    if (tab.label === 'Usuarios') {
      const isActive = this.activeSection === 'usuarios';
      this.activeSection = isActive ? 'resumen' : 'usuarios';
      tab.active = !isActive;
      this.headerTabs.forEach(t => { if (t !== tab) t.active = false; });
      this.cdr.detectChanges();
    }
  }

  get esContratista(): boolean { return this.authService.isContratista(); }
  get empresaNombre(): string {
    if (typeof localStorage === 'undefined') return '';
    try { return JSON.parse(localStorage.getItem('user') ?? '{}').razonSocial ?? ''; } catch { return ''; }
  }

  get proyectoTabActual(): EmpresaProyectoDto | null {
    return this.proyectos[this.proyectoTabSeleccionado] ?? null;
  }

  get entregablesTabActual(): EmpresaEntregableDto[] {
    const p = this.proyectoTabActual;
    if (!p) return [];
    return this.entregablesPorProyecto.get(p.proyectoId) ?? [];
  }

  get entregablesAprobados(): number {
    return this.entregablesTabActual.filter(e => e.estado === 'Aprobado').length;
  }

  get entregablesFalta(): number {
    return this.entregablesTabActual.filter(e => e.estado === 'Falta' || e.estado === 'Rechazado').length;
  }

  get entregablesEnviados(): number {
    return this.entregablesTabActual.filter(e => e.estado === 'Enviado').length;
  }

  get pctEntregables(): number {
    const total = this.entregablesTabActual.length;
    if (!total) return 0;
    return Math.round((this.entregablesAprobados / total) * 100);
  }

  get totalEntregables(): number { return this.entregablesTabActual.length; }

  get pctHabilitados(): number {
    if (!this.totalTrabajadores) return 0;
    return Math.round((this.trabHabilitados / this.totalTrabajadores) * 100);
  }

  get totalProyectosActivos(): number { return this.proyectos.length; }

  get alertasCount(): number {
    return this.trabNoHabilitados + this.proximosVencer.filter(v => v.dias <= 7).length;
  }

  get vencenEstaSemana(): number { return this.proximosVencer.filter(v => v.dias <= 7).length; }
  get vencenEsteMes(): number { return this.proximosVencer.filter(v => v.dias > 7 && v.dias <= 30).length; }

  get ringOffset(): number {
    const circumference = 125.7;
    return circumference - (this.pctEntregables / 100) * circumference;
  }

  get ringOffsetTasa(): number {
    const circumference = 106.8;
    return circumference - (this.pctHabilitados / 100) * circumference;
  }

  diasClass(dias: number): string {
    if (dias <= 7) return 'dias-r';
    if (dias <= 14) return 'dias-o';
    return 'dias-y';
  }

  colorProyecto(idx: number): string {
    const colors = ['#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#ef4444'];
    return colors[idx % colors.length];
  }

  constructor(
    private habEmpresaService: HabEmpresaService,
    private trabajadorService: TrabajadorHabService,
    private equipoService: EquipoHabService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isContratista()) {
      this.router.navigate(['/habilitacion/trabajadores']);
      return;
    }
    this.empresaId = this.authService.getEmpresaId() ?? null;
    const token = this.authService.getToken();
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const sub = decoded.sub ?? decoded.userId ?? decoded.nameid ??
          decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
        this.currentUserId = sub != null ? parseInt(String(sub), 10) : null;
      } catch { /* ignore */ }
    }
    if (!this.empresaId) return;
    this.loadProyectos();
    this.loadTrabajadores();
    this.loadEquipos();
    this.buildProximosVencerMock();
  }

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
        const rechazados = ents.filter(e => e.estado === 'Rechazado').length;
        this.progresoPorProyecto.set(p.proyectoId, {
          total, aprobadosEquiv: aprobados, rechazados,
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
        this.trabPendientes = this.totalTrabajadores - this.trabHabilitados - this.trabNoHabilitados;
        this.topNoHabilitados = workers
          .filter(w => w.estadoHabilitacion === 'No Autorizado')
          .slice(0, 5)
          .map(w => ({ nombre: w.apellidoNombre ?? '—', motivo: 'No autorizado' }));
        this.loadingTrabajadores = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingTrabajadores = false; },
    });
  }

  loadEquipos(): void {
    this.loadingEquipos = true;
    this.equipoService.getEquipos({ empresaId: this.empresaId!, page: 1, pageSize: 200 }).subscribe({
      next: (res) => {
        this.totalEquipos = res.totalRecords ?? (res.data ?? []).length;
        this.loadingEquipos = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingEquipos = false; },
    });
  }

  buildProximosVencerMock(): void {
    // Placeholder hasta que haya endpoint de vencimientos
    this.proximosVencer = [];
  }

  selectTab(idx: number): void {
    this.proyectoTabSeleccionado = idx;
    this.cdr.detectChanges();
  }

  navegarA(ruta: string): void { this.router.navigate([ruta]); }

  iniciales(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  getWhatsappUrl(): string {
    return 'https://chat.whatsapp.com/';
  }
}
