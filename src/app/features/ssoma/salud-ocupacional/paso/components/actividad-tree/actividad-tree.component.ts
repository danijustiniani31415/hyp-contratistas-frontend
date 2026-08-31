import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { SpiBadgeComponent } from '../spi-badge/spi-badge.component';
import { EjecucionModalComponent } from '../ejecucion-modal/ejecucion-modal.component';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { PasoActividadService } from '../../services/paso-actividad.service';
import { PasoService } from '../../services/paso.service';
import { PasoEjecucionService } from '../../services/paso-ejecucion.service';
import { PasoActividadDto, PasoAuditoriaDto, PasoEjecucionDto } from '../../dtos/paso.dtos';

interface CategoriaGroup {
  id: number;
  nombre: string;
  icono: string;
  actividades: PasoActividadDto[];
}

@Component({
  selector: 'app-actividad-tree',
  standalone: true,
  imports: [CommonModule, FormsModule, SpiBadgeComponent, EjecucionModalComponent, AbrilModalPanel],
  templateUrl: './actividad-tree.component.html',
  styleUrl: './actividad-tree.component.css',
})
export class ActividadTreeComponent {
  @Input() set actividades(list: PasoActividadDto[]) {
    this._actividades = list;
    this.buildGroups();
  }
  get actividades(): PasoActividadDto[] { return this._actividades; }

  @Input() set filtroEstado(val: string) {
    this._filtroEstado = val;
    this.buildGroups();
  }
  get filtroEstado(): string { return this._filtroEstado; }

  @Input() pasoId!: number;
  @Input() ambito: 'Seguridad' | 'Salud' | 'Ambiente' = 'Seguridad';
  @Input() mesSeleccionado: number = new Date().getMonth() + 1;
  @Input() anioSeleccionado: number = new Date().getFullYear();
  @Output() actividadEditarClick = new EventEmitter<PasoActividadDto>();
  @Output() actividadEliminada = new EventEmitter<number>();
  @Output() ejecucionRegistrada = new EventEmitter<PasoEjecucionDto>();

  private _actividades: PasoActividadDto[] = [];
  private _filtroEstado = '';
  groups: CategoriaGroup[] = [];
  collapsedGroups = new Set<number>();
  actividadEjecutando: PasoActividadDto | null = null;
  actividadDetalle: PasoActividadDto | null = null;
  detallePestana: 'ejecuciones' | 'historial' = 'ejecuciones';
  auditoria: PasoAuditoriaDto[] = [];
  loadingAuditoria = false;
  eliminarOpen = false;
  eliminarActividad: PasoActividadDto | null = null;
  motivoEliminacion = '';
  reprogramarOpen = false;
  ejecucionAReprogramar: PasoEjecucionDto | null = null;
  nuevaFechaReprogramacion = '';
  motivoReprogramacion = '';

  readonly mesActual = new Date().getMonth() + 1;

  constructor(
    private actividadService: PasoActividadService,
    private pasoService: PasoService,
    private ejecucionService: PasoEjecucionService,
    private cdr: ChangeDetectorRef,
  ) {}

  private buildGroups(): void {
    const filtered = this._actividades.filter(a => {
      if (!this._filtroEstado) return true;
      const mes = this.ejecucionMesActual(a);
      if (this._filtroEstado === 'pendiente') return mes.estado === 'sin' || mes.estado === 'programado';
      if (this._filtroEstado === 'ejecutado') return mes.estado === 'ejecutado';
      if (this._filtroEstado === 'vencido')   return mes.estado === 'vencido';
      return true;
    });
    const map = new Map<number, CategoriaGroup>();
    for (const a of filtered) {
      if (!map.has(a.categoriaId)) {
        map.set(a.categoriaId, { id: a.categoriaId, nombre: a.categoriaNombre, icono: 'ti-tag', actividades: [] });
      }
      map.get(a.categoriaId)!.actividades.push(a);
    }
    this.groups = Array.from(map.values());
  }

  toggleGroup(id: number): void {
    if (this.collapsedGroups.has(id)) this.collapsedGroups.delete(id);
    else this.collapsedGroups.add(id);
  }

  isCollapsed(id: number): boolean { return this.collapsedGroups.has(id); }

  ejecutadas(a: PasoActividadDto): number {
    return (a.ejecuciones ?? []).filter(e => e.estado === 'Ejecutado').length;
  }

  spiActividad(a: PasoActividadDto): number | null {
    const total = a.cantidadPlanificada;
    if (!total) return null;
    return Math.min(1, this.ejecutadas(a) / total);
  }

  spiBarColor(a: PasoActividadDto): string {
    const spi = this.spiActividad(a);
    if (spi === null) return 'sin';
    if (spi >= 0.9) return 'verde';
    if (spi >= 0.7) return 'amarillo';
    return 'rojo';
  }

  ejecucionMesActual(a: PasoActividadDto): { estado: string; label: string } {
    const ejecuciones = a.ejecuciones ?? [];
    const ahora = new Date();

    // Buscar ejecución del mes actual
    const ejeMes = ejecuciones.filter(e => {
      const d = new Date(e.fechaProgramada);
      return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
    });

    if (ejeMes.length) {
      const ej = ejeMes[ejeMes.length - 1];
      switch (ej.estado) {
        case 'Ejecutado':  return { estado: 'ejecutado',  label: 'Ejecutada' };
        case 'Vencido':    return { estado: 'vencido',    label: 'Vencida' };
        case 'Programado': return { estado: 'programado', label: 'Programada' };
        default:           return { estado: 'sin',        label: 'Sin ejecución' };
      }
    }

    // Si no hay en el mes actual, buscar la próxima ejecución vigente (reprogramada)
    const proxima = ejecuciones
      .filter(e => e.estado === 'Programado')
      .sort((a, b) => new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime())[0];

    if (proxima) {
      const d = new Date(proxima.fechaProgramada);
      const mesNombre = d.toLocaleDateString('es-PE', { month: 'long' });
      return { estado: 'programado', label: `Reprog. ${mesNombre}` };
    }

    return { estado: 'sin', label: 'Sin ejecución' };
  }

  frecuenciaClass(f: string): string {
    const m: Record<string, string> = {
      Mensual: 'freq-badge--mensual', Bimestral: 'freq-badge--bimestral',
      Trimestral: 'freq-badge--trimestral', Semestral: 'freq-badge--semestral',
      Anual: 'freq-badge--anual', Unica: 'freq-badge--unica',
    };
    return m[f] ?? 'freq-badge--unica';
  }

  ambitoClass(): string {
    const m: Record<string, string> = { Seguridad: 'seg', Salud: 'sal', Ambiente: 'amb' };
    return m[this.ambito] ?? 'default';
  }

  abrirEjecucion(a: PasoActividadDto): void { this.actividadEjecutando = a; }

  abrirDetalle(a: PasoActividadDto): void {
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

  onEjecucionCreada(e: PasoEjecucionDto): void {
    this.actividadEjecutando = null;
    this.ejecucionRegistrada.emit(e);
    this.cdr.detectChanges();
  }

  onEditar(a: PasoActividadDto): void { this.actividadEditarClick.emit(a); }

  abrirEliminar(a: PasoActividadDto): void {
    this.eliminarActividad = a;
    this.motivoEliminacion = '';
    this.eliminarOpen = true;
  }

  abrirReprogramar(e: PasoEjecucionDto): void {
    this.ejecucionAReprogramar = e;
    this.nuevaFechaReprogramacion = '';
    this.motivoReprogramacion = '';
    this.reprogramarOpen = true;
  }

  confirmarReprogramar(): void {
    if (!this.ejecucionAReprogramar || !this.nuevaFechaReprogramacion || this.motivoReprogramacion.trim().length < 10) return;
    this.ejecucionService.reprogramar(this.ejecucionAReprogramar.id, {
      nuevaFecha: this.nuevaFechaReprogramacion,
      motivo: this.motivoReprogramacion.trim(),
    }).subscribe({
      next: (updated) => {
        if (this.actividadDetalle) {
          const idx = this.actividadDetalle.ejecuciones.findIndex(e => e.id === updated.id);
          if (idx >= 0) this.actividadDetalle.ejecuciones[idx] = updated;
          this.pasoService.getAuditoria(this.actividadDetalle.id).subscribe({
            next: (data) => { this.auditoria = data; this.cdr.detectChanges(); },
            error: () => {},
          });
        }
        this.ejecucionRegistrada.emit(updated);
        this.reprogramarOpen = false;
        this.ejecucionAReprogramar = null;
        this.nuevaFechaReprogramacion = '';
        this.motivoReprogramacion = '';
        this.cdr.detectChanges();
      },
      error: () => Swal.fire('Error', 'No se pudo reprogramar la ejecución', 'error'),
    });
  }

  confirmarEliminar(): void {
    if (!this.eliminarActividad || this.motivoEliminacion.trim().length < 10) return;
    this.actividadService.delete(this.eliminarActividad.id, this.motivoEliminacion.trim()).subscribe({
      next: () => {
        this.actividadEliminada.emit(this.eliminarActividad!.id);
        this.eliminarOpen = false;
        this.eliminarActividad = null;
        this.motivoEliminacion = '';
        this.cdr.detectChanges();
      },
      error: () => Swal.fire('Error', 'No se pudo eliminar la actividad', 'error'),
    });
  }
}
