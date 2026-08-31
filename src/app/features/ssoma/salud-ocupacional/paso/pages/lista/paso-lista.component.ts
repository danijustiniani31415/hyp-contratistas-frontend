import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { PasoService } from '../../services/paso.service';
import { PasoActividadService } from '../../services/paso-actividad.service';
import { PasoEjecucionService } from '../../services/paso-ejecucion.service';
import { PasoListItemDto, PasoDetalleDto, PasoActividadDto, PasoAuditoriaDto, PasoEjecucionDto, PasoSpiDto, PasoCategoriaDto, CreateActividadDto, PasoResumenMesDto, PasoResumenMesActividadDto, PasoHistoricoAnioDto, PasoEjecucionArchivoDto } from '../../dtos/paso.dtos';
import { SpiBadgeComponent } from '../../components/spi-badge/spi-badge.component';
import { ActividadTreeComponent } from '../../components/actividad-tree/actividad-tree.component';
import { InstanciarModalComponent } from '../../components/instanciar-modal/instanciar-modal.component';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { EjecucionModalComponent } from '../../components/ejecucion-modal/ejecucion-modal.component';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { DocumentViewer } from '../../../../../../shared/components/document-viewer/document-viewer';
import { PropagArActividadComponent } from '../../components/propagar-actividad/propagar-actividad.component';
import { environment } from '../../../../../../../environments/environment';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

import { PASO_TABS } from '../../paso-tabs';
type TabAmbito = 'Seguridad' | 'Salud' | 'Ambiente';

@Component({
  selector: 'app-paso-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, SpiBadgeComponent, ActividadTreeComponent,
            InstanciarModalComponent, AbrilPageHeaderComponent,
            EjecucionModalComponent, DocumentViewer, PropagArActividadComponent, SearchSelect],
  templateUrl: './paso-lista.component.html',
  styleUrl: './paso-lista.component.css',
})
export class PasoListaComponent implements OnInit {
  readonly headerTabs = PASO_TABS;
  programas: PasoListItemDto[] = [];
  selectedPasoId: number | null = null;

  paso: PasoDetalleDto | null = null;
  spi: PasoSpiDto | null = null;
  categorias: PasoCategoriaDto[] = [];

  loading = false;
  loadingDetalle = false;
  tabActiva: TabAmbito = 'Seguridad';
  tabs: TabAmbito[] = ['Seguridad', 'Salud', 'Ambiente'];

  filtroEstado = '';
  verHistoricos = false;
  proyectosActivos = new Set<number>();
  agregarOpen = false;
  agregarForm: Partial<CreateActividadDto> = {};
  saving = false;
  instanciarOpen = false;
  plantillaId: number | null = null;
  plantillaNombre = '';
  exportOpen = false;
  actividadEjecutando: PasoActividadDto | null = null;
  actividadDetalle: PasoActividadDto | null = null;
  detallePestana: 'ejecuciones' | 'historial' = 'ejecuciones';
  auditoria: PasoAuditoriaDto[] = [];
  loadingAuditoria = false;
  eliminarOpen = false;
  eliminarActividad: PasoActividadDto | null = null;
  motivoEliminacion = '';
  reprogramarMesOpen = false;
  actividadAReprogramar: PasoResumenMesActividadDto | null = null;
  nuevaFechaReprogramacion = '';
  motivoReprogramacion = '';

  visorUrl = '';
  visorNombre = '';
  visorArchivos: PasoEjecucionArchivoDto[] = [];
  visorIdx = 0;
  propagarOpen = false;
  actividadParaPropagar: PasoActividadDto | null = null;

  readonly anioActual = new Date().getFullYear();

  vista: 'mes' | 'año' | 'proyecto' = 'mes';
  mesSeleccionado = new Date().getMonth() + 1;
  anioSeleccionado = new Date().getFullYear();
  resumenMes: PasoResumenMesDto | null = null;
  loadingMes = false;
  historicoData: PasoHistoricoAnioDto[] | null = null;
  loadingHistorico = false;

  meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
           'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  constructor(
    private pasoService: PasoService,
    private actividadService: PasoActividadService,
    private pasoEjecucionService: PasoEjecucionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // FIX-F1: Remove anio filter so ALL project PASOs load (not just current year).
    // Auto-select the first PASO of current year if available.
    forkJoin({
      programas: this.pasoService.getAll({ pageSize: 100 }),
      categorias: this.pasoService.getCategorias(),
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200 }),
    }).subscribe({
      next: ({ programas, categorias, proyectos }) => {
        this.proyectosActivos = new Set(
          proyectos.data.filter(p => p.estado === 'ACTIVO').map(p => p.projectId)
        );
        this.programas = programas.items;
        this.categorias = categorias;
        const plantilla = programas.items.find(p => p.esPlantilla);
        if (plantilla) { this.plantillaId = plantilla.id; this.plantillaNombre = plantilla.nombre; }
        const paso2026 = this.programas.find(p => p.anio === this.anioActual && !p.esPlantilla);
        const defaultPaso = paso2026 ?? this.programas.find(p => p.anio === this.anioActual) ?? this.programas[0];
        if (defaultPaso) {
          this.selectedPasoId = defaultPaso.id;
          this.loadDetalle(defaultPaso.id);
          this.loadResumenMes(defaultPaso.id);
        }
        if (sessionStorage.getItem('paso_abrir_instanciar') === '1') {
          sessionStorage.removeItem('paso_abrir_instanciar');
          this.instanciarOpen = true;
        }
        this.cdr.detectChanges();
      },
      error: (err) => this.errorService.handleError(err),
    });
  }

  onProyectoChange(): void {
    this.filtroEstado = '';
    this.vista = 'mes';
    if (this.selectedPasoId) {
      this.loadDetalle(this.selectedPasoId);
      this.loadResumenMes(this.selectedPasoId);
    }
  }

  private loadDetalle(id: number): void {
    this.loadingDetalle = true;
    this.historicoData = null;
    this.loaderService.show();
    forkJoin({
      paso: this.pasoService.getById(id),
      spi: this.pasoService.getSpi(id),
    }).subscribe({
      next: ({ paso, spi }) => {
        this.paso = paso;
        this.spi = spi;
        this.loadingDetalle = false;
        this.loaderService.hide();
        // DEBUG — quitar después de confirmar valores de categoriaAmbito
        console.log('AMBITOS:', [...new Set(paso.actividades?.map(a => a.categoriaAmbito))]);
        console.log('SPI AMBITOS:', spi);
        if (this.vista === 'proyecto' && paso.proyectoId) {
          this.historicoData = null;
          this.loadHistorico(paso.proyectoId);
        }
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDetalle = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get programasFiltrados(): PasoListItemDto[] {
    if (this.verHistoricos) return this.programas;
    const anioMin = this.anioActual - 1;
    return this.programas.filter(p =>
      p.esPlantilla ||
      (p.anio != null && p.anio >= anioMin &&
       (p.proyectoId == null || this.proyectosActivos.has(p.proyectoId)))
    );
  }

  get actividadesTab() {
    if (!this.paso?.actividades) return [];
    return this.paso.actividades.filter(a =>
      a.categoriaAmbito === this.tabActiva && a.activo !== false
    );
  }

  get categoriasFiltradas() {
    return this.categorias.filter(c => c.ambito === (this.tabActiva as string));
  }

  get programasFiltradosOpts() {
    return this.programasFiltrados.map(p => ({ ...p, nombreCompleto: `${p.proyectoNombre ?? p.nombre} · ${p.anio}` }));
  }

  readonly frecuenciaOpts = [
    { id: 'Mensual',    label: 'Mensual' },
    { id: 'Bimestral',  label: 'Bimestral' },
    { id: 'Trimestral', label: 'Trimestral' },
    { id: 'Semestral',  label: 'Semestral' },
    { id: 'Anual',      label: 'Anual' },
    { id: 'Unica',      label: 'Única' },
  ];

  countTab(tab: TabAmbito): number {
    return this.paso?.actividades?.filter(a =>
      a.categoriaAmbito === tab && a.activo !== false
    ).length ?? 0;
  }

  setTab(tab: TabAmbito): void { this.tabActiva = tab; this.exportOpen = false; this.filtroEstado = ''; }

  aprobar(): void {
    if (!this.paso) return;
    Swal.fire({ icon: 'question', title: '¿Aprobar programa?', showCancelButton: true, confirmButtonText: 'Aprobar' }).then(r => {
      if (!r.isConfirmed) return;
      this.pasoService.aprobar(this.paso!.id).subscribe({
        next: (p) => {
          if (this.paso) this.paso = { ...this.paso, estado: p.estado, aprobadoPorNombre: p.aprobadoPorNombre, aprobadoEn: p.aprobadoEn };
          Swal.fire('Aprobado', '', 'success');
          this.cdr.detectChanges();
        },
        error: (err) => this.errorService.handleError(err),
      });
    });
  }

  abrirAgregar(): void {
    this.agregarForm = { pasoId: this.paso?.id, mesInicio: 1, mesFin: 12, cantidadPlanificada: 1 };
    this.agregarOpen = true;
  }

  guardarActividad(): void {
    if (!this.agregarForm.nombre?.trim() || !this.agregarForm.categoriaId) return;
    this.saving = true;
    this.actividadService.create(this.agregarForm as CreateActividadDto).subscribe({
      next: (a) => {
        this.saving = false;
        if (this.paso) this.paso.actividades = [...(this.paso.actividades ?? []), a];
        this.actividadParaPropagar = a;
        this.propagarOpen = true;
        this.agregarOpen = false;
        console.log('propagarOpen:', this.propagarOpen);
        console.log('actividadParaPropagar:', this.actividadParaPropagar);
        console.log('paso:', this.paso);
        this.cdr.detectChanges();
      },
      error: (err) => { this.saving = false; this.errorService.handleError(err); },
    });
  }

  onPropagado(): void {
    this.propagarOpen = false;
    this.actividadParaPropagar = null;
    if (this.selectedPasoId) this.loadDetalle(this.selectedPasoId);
  }

  onEliminada(id: number): void {
    if (this.paso) this.paso.actividades = this.paso.actividades?.filter(a => a.id !== id);
    this.cdr.detectChanges();
  }

  onInstanciaCreada(): void { this.instanciarOpen = false; this.plantillaId = null; this.plantillaNombre = ''; this.ngOnInit(); }

  exportar(format: 'excel' | 'pdf'): void {
    if (!this.paso) return;
    this.exportOpen = false;
    this.pasoService.exportReporte(this.paso.id, format).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PASO-${this.paso!.id}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => this.errorService.handleError(err),
    });
  }

  tabColor(t: TabAmbito): string {
    const m: Record<TabAmbito, string> = { Seguridad: 'tab--seg', Salud: 'tab--sal', Ambiente: 'tab--amb' };
    return m[t];
  }

  tabIcon(t: TabAmbito): string {
    const m: Record<TabAmbito, string> = { Seguridad: 'ti-shield', Salud: 'ti-heart-pulse', Ambiente: 'ti-leaf' };
    return m[t];
  }

  tabLabel(t: TabAmbito): string {
    if (t === 'Salud') return 'Salud Ocupacional';
    return t;
  }

  cambiarVista(v: 'mes' | 'año' | 'proyecto'): void {
    this.vista = v;
    if (v === 'mes' && this.selectedPasoId) this.loadResumenMes(this.selectedPasoId);
    if (v === 'proyecto') {
      const pid = this.paso?.proyectoId;
      if (pid) this.loadHistorico(pid);
    }
  }

  private loadHistorico(proyectoId: number): void {
    this.loadingHistorico = true;
    this.pasoService.getHistorico(proyectoId).subscribe({
      next: (h) => {
        console.log('HISTORICO raw:', h);
        this.historicoData = h;
        this.loadingHistorico = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('HISTORICO error:', err);
        this.loadingHistorico = false;
        this.cdr.detectChanges();
      },
    });
  }

  get historicoDataFiltrada() {
    return this.historicoData ?? [];
  }

  get historicoTotales() {
    const conDatos = this.historicoDataFiltrada;
    if (!conDatos.length) return null;
    const prog = conDatos.reduce((s, a) => s + a.totalProgramadas, 0);
    const ejec = conDatos.reduce((s, a) => s + a.totalEjecutadas, 0);
    const spis = conDatos.filter(a => a.spiGeneral != null && a.spiGeneral > 0);
    return {
      totalProgramadas: prog,
      totalEjecutadas: ejec,
      totalVencidas: conDatos.reduce((s, a) => s + a.totalVencidas, 0),
      porcentajeAvance: prog > 0 ? Math.round((ejec / prog) * 100) : 0,
      spiGeneral: spis.length > 0 ? spis.reduce((s, a) => s + a.spiGeneral, 0) / spis.length : 0,
    };
  }

  get proyectoSinPasoAnioActual(): boolean {
    if (!this.paso) return false;
    if (this.paso.esPlantilla) return true;
    return this.paso.anio !== this.anioActual;
  }

  get kpiLoading(): boolean {
    if (this.vista === 'proyecto') return this.loadingHistorico;
    if (this.vista === 'año') return this.loadingDetalle;
    return false;
  }

  get kpiSpiValue(): number | null {
    if (this.vista === 'año') return this.spi?.spiGeneral ?? null;
    if (this.vista === 'proyecto') return this.historicoTotales?.spiGeneral ?? null;
    return null;
  }

  get kpiAvance(): number | null {
    if (this.vista === 'año') return this.spi?.porcentajeAvance ?? null;
    if (this.vista === 'proyecto') return this.historicoTotales?.porcentajeAvance ?? null;
    return null;
  }

  get kpiEjecutadas(): number | null {
    if (this.vista === 'año') return this.spi?.totalEjecutadas ?? null;
    if (this.vista === 'proyecto') return this.historicoTotales?.totalEjecutadas ?? null;
    return null;
  }

  get kpiVencidas(): number | null {
    if (this.vista === 'año') return this.spi?.totalVencidas ?? null;
    if (this.vista === 'proyecto') return this.historicoTotales?.totalVencidas ?? null;
    return null;
  }

  get kpiProgramadas(): number | null { return null; }

  cambiarMes(delta: number): void {
    this.mesSeleccionado += delta;
    if (this.mesSeleccionado > 12) { this.mesSeleccionado = 1; this.anioSeleccionado++; }
    if (this.mesSeleccionado < 1)  { this.mesSeleccionado = 12; this.anioSeleccionado--; }
    if (this.selectedPasoId) this.loadResumenMes(this.selectedPasoId);
  }

  private loadResumenMes(id: number): void {
    this.loadingMes = true;
    this.pasoService.getResumenMes(id, this.anioSeleccionado, this.mesSeleccionado).subscribe({
      next: (r) => { this.resumenMes = r; this.loadingMes = false; this.cdr.detectChanges(); },
      error: (err) => { this.loadingMes = false; this.errorService.handleError(err); },
    });
  }

  verDetalleActividad(actividadId: number): void {
    const a = this.paso?.actividades?.find(act => act.id === actividadId);
    if (!a) return;
    this.actividadDetalle = a;
    this.detallePestana = 'ejecuciones';
    this.auditoria = [];
    this.loadingAuditoria = true;
    this.pasoService.getAuditoria(a.id).subscribe({
      next: (data) => { this.auditoria = data; this.loadingAuditoria = false; this.cdr.detectChanges(); },
      error: () => { this.loadingAuditoria = false; this.cdr.detectChanges(); },
    });
  }

  auditIcono(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('elimin')) return 'ti-trash';
    if (t.includes('reprog')) return 'ti-calendar-event';
    return 'ti-pencil';
  }

  auditColor(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('elimin')) return '#dc2626';
    if (t.includes('reprog')) return '#d97706';
    return '#2563eb';
  }

  registrarDesdeResumen(item: PasoResumenMesActividadDto): void {
    const a = this.paso?.actividades?.find(act => act.id === item.actividadId);
    if (a) this.actividadEjecutando = a;
  }

  eliminarDesdeResumen(actividadId: number): void {
    const a = this.paso?.actividades?.find(act => act.id === actividadId);
    if (a) this.abrirEliminar(a);
  }

  abrirReprogramarDesdeResumen(a: PasoResumenMesActividadDto): void {
    this.actividadAReprogramar = a;
    this.nuevaFechaReprogramacion = '';
    this.motivoReprogramacion = '';
    this.reprogramarMesOpen = true;
  }

  confirmarReprogramarDesdeResumen(): void {
    if (!this.actividadAReprogramar || !this.nuevaFechaReprogramacion ||
        this.motivoReprogramacion.trim().length < 10) return;

    if (this.actividadAReprogramar.ejecucionId) {
      this.pasoEjecucionService.reprogramar(
        this.actividadAReprogramar.ejecucionId,
        { nuevaFecha: this.nuevaFechaReprogramacion, motivo: this.motivoReprogramacion.trim() }
      ).subscribe({
        next: () => {
          this.reprogramarMesOpen = false;
          this.actividadAReprogramar = null;
          if (this.selectedPasoId) this.loadResumenMes(this.selectedPasoId);
          this.cdr.detectChanges();
        },
        error: (err) => this.errorService.handleError(err),
      });
    } else {
      // SinProgramar → crear ejecución programada directamente
      this.pasoEjecucionService.programar({
        actividadId: this.actividadAReprogramar.actividadId,
        fechaProgramada: this.nuevaFechaReprogramacion,
      }).subscribe({
        next: () => {
          this.reprogramarMesOpen = false;
          this.actividadAReprogramar = null;
          if (this.selectedPasoId) this.loadResumenMes(this.selectedPasoId);
          this.cdr.detectChanges();
        },
        error: (err) => this.errorService.handleError(err),
      });
    }
  }

  abrirEliminar(a: PasoActividadDto): void {
    this.eliminarActividad = a;
    this.motivoEliminacion = '';
    this.eliminarOpen = true;
  }

  confirmarEliminar(): void {
    if (!this.eliminarActividad || this.motivoEliminacion.trim().length < 10) return;
    this.actividadService.delete(this.eliminarActividad.id, this.motivoEliminacion.trim()).subscribe({
      next: () => {
        this.onEliminada(this.eliminarActividad!.id);
        if (this.selectedPasoId && this.vista === 'mes') this.loadResumenMes(this.selectedPasoId);
        this.eliminarOpen = false;
        this.eliminarActividad = null;
        this.motivoEliminacion = '';
        this.cdr.detectChanges();
      },
      error: () => Swal.fire('Error', 'No se pudo eliminar la actividad', 'error'),
    });
  }

  abrirEjecucion(a: PasoActividadDto): void { this.actividadEjecutando = a; }
  abrirDetalle(a: PasoActividadDto): void { this.actividadDetalle = a; }

  abrirVisorArchivos(archivos: PasoEjecucionArchivoDto[], idx = 0): void {
    this.visorArchivos = archivos;
    this.visorIdx = idx;
    this.visorUrl = archivos[idx]?.archivoUrl ?? '';
    this.visorNombre = archivos[idx]?.archivoNombre ?? '';
  }

  visorSiguiente(): void {
    if (this.visorIdx < this.visorArchivos.length - 1) {
      this.visorIdx++;
      this.visorUrl = this.visorArchivos[this.visorIdx].archivoUrl;
      this.visorNombre = this.visorArchivos[this.visorIdx].archivoNombre;
    }
  }

  visorAnterior(): void {
    if (this.visorIdx > 0) {
      this.visorIdx--;
      this.visorUrl = this.visorArchivos[this.visorIdx].archivoUrl;
      this.visorNombre = this.visorArchivos[this.visorIdx].archivoNombre;
    }
  }

  onVisorClosed(): void {
    this.visorUrl = '';
    this.visorArchivos = [];
    this.visorIdx = 0;
  }

  verEvidencia(url: string): void {
    const token = localStorage.getItem('access_token');
    const apiUrl = `${environment.apiUrl}api/v1/habilitacion/archivos/ver?url=${encodeURIComponent(url)}`;
    fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      })
      .catch(() => Swal.fire('Error', 'No se pudo abrir el archivo', 'error'));
  }

  onEjecucionCreada(e: PasoEjecucionDto): void {
    this.actividadEjecutando = null;
    if (this.selectedPasoId && this.vista === 'mes') this.loadResumenMes(this.selectedPasoId);
    this.cdr.detectChanges();
  }

  ejecutadas(a: PasoActividadDto): number {
    return (a.ejecuciones ?? []).filter(e => e.estado === 'Ejecutado').length;
  }

  spiActividad(a: PasoActividadDto): number | null {
    if (!a.cantidadPlanificada) return null;
    return Math.min(1, this.ejecutadas(a) / a.cantidadPlanificada);
  }

  ejecucionMesActual(a: PasoActividadDto): { estado: string; label: string } {
    const ejeMes = (a.ejecuciones ?? []).filter(e => {
      const d = new Date(e.fechaProgramada);
      return d.getMonth() + 1 === this.mesSeleccionado;
    });
    if (!ejeMes.length) return { estado: 'sin', label: 'Sin ejecución' };
    const ej = ejeMes[ejeMes.length - 1];
    switch (ej.estado) {
      case 'Ejecutado':  return { estado: 'ejecutado',  label: 'Ejecutada' };
      case 'Vencido':    return { estado: 'vencido',    label: 'Vencida' };
      case 'Programado': return { estado: 'programado', label: 'Programada' };
      default:           return { estado: 'sin',        label: 'Sin ejecución' };
    }
  }

  frecuenciaClass(f: string): string {
    const m: Record<string, string> = {
      Mensual: 'freq-badge--mensual', Bimestral: 'freq-badge--bimestral',
      Trimestral: 'freq-badge--trimestral', Semestral: 'freq-badge--semestral',
      Anual: 'freq-badge--anual', Unica: 'freq-badge--unica',
    };
    return m[f] ?? 'freq-badge--unica';
  }
}
