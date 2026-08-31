import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ArquitecturaComercialService } from '../../../core/services/arquitectura-comercial.service';
import {
  ProyectoConActividadesDTO,
  SupervisorAcDTO,
  ActividadListItemDTO,
  ActividadPatchBody,
} from '../../../core/dtos/arquitectura-comercial/actividades.model';
import { RouterModule } from '@angular/router';
import { NuevaConsulta } from './components/nueva-consulta/nueva-consulta';
import { EditarActividad } from './components/editar-actividad/editar-actividad';
import { NuevoHito } from './components/nuevo-hito/nuevo-hito';
import { NuevoEntregable } from './components/nuevo-entregable/nuevo-entregable';

import { AC_TABS } from '../shared/arquitectura-comercial-tabs';
type TipoFiltro = '' | 'ENTREGABLE' | 'HITO' | 'CONSULTA';

interface EtapaGroup {
  nombre: string;
  total: number;
  activas: number;
  items: ActividadListItemDTO[];
}

@Component({
  selector: 'app-arq-comercial-actividades',
  standalone: true,
  imports: [CommonModule, FormsModule, NuevaConsulta, EditarActividad, NuevoHito, NuevoEntregable, RouterModule, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchSelect],
  templateUrl: './actividades.html',
  styleUrl: './actividades.css',
})
export class Actividades implements OnInit {
  readonly tabs = AC_TABS;
  anioActual = new Date().getFullYear();
  readonly etapasFijas = ['PREVENTA', 'OBRA', 'EDIFICIO ENTREGADO', 'POST VENTA Y EXPERIENCIA', 'ALMACEN'];

  proyectos: ProyectoConActividadesDTO[] = [];
  supervisores: SupervisorAcDTO[] = [];

  selectedProyectoId: number | null = null;
  get selectedProyecto(): ProyectoConActividadesDTO | null {
    return this.proyectos.find(p => p.id === this.selectedProyectoId) ?? null;
  }
  get proyectosConActividades(): ProyectoConActividadesDTO[] {
    return this.proyectos.filter(p => !p.sinActividades);
  }
  get proyectosSinActividades(): ProyectoConActividadesDTO[] {
    return this.proyectos.filter(p => p.sinActividades);
  }

  actividades: ActividadListItemDTO[] = [];
  etapasConActividades: EtapaGroup[] = [];
  total = 0;
  loading = false;

  tipoFiltro: TipoFiltro = '';
  etapaNombreFiltro: string | null = null;
  searchQuery = '';
  soloActivas = true;
  excluirCulminadas = false;
  filtroSupervisorId: number | null = null;

  mostrarSinActividades = false;

  filtrosAbiertos = false;

  get filtrosActivos(): number {
    let n = 0;
    if (this.tipoFiltro) n++;
    if (this.etapaNombreFiltro) n++;
    if (this.searchQuery) n++;
    if (!this.soloActivas) n++; // "Solo activas" es el default: solo cuenta si el usuario lo desactivó
    if (this.excluirCulminadas) n++;
    if (this.filtroSupervisorId != null) n++;
    if (this.mostrarSinActividades) n++;
    return n;
  }

  get proyectoOptions(): Array<{ id: number; nombreDisplay: string }> {
    const lista = this.mostrarSinActividades ? this.proyectosSinActividades : this.proyectosConActividades;
    return lista.map(p => ({
      id: p.id,
      nombreDisplay: this.mostrarSinActividades
        ? `${p.nombre} — sin actividades`
        : `${p.nombre} — ${p.totalActividades} actividades · ${p.activas} activas`,
    }));
  }

  get etapaOptions(): Array<{ value: string; label: string }> {
    return this.etapasFijas.map(e => ({ value: e, label: e }));
  }

  mostrarNuevaConsulta = false;
  mostrarNuevoHito = false;
  mostrarNuevoEntregable = false;
  mostrarEditarActividad = false;
  actividadParaEditar: ActividadListItemDTO | null = null;

  constructor(
    private service: ArquitecturaComercialService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProyectos();
    this.loadSupervisores();
  }

  loadProyectos(): void {
    this.service.getProyectosConActividades().subscribe({
      next: data => {
        this.proyectos = [...data].sort((a, b) => {
          const aHas = a.totalActividades > 0 ? 0 : 1;
          const bHas = b.totalActividades > 0 ? 0 : 1;
          if (aHas !== bHas) return aHas - bHas;
          return a.nombre.localeCompare(b.nombre);
        });
        this.cdr.detectChanges();
      },
      error: () => this.showError('No se pudieron cargar los proyectos'),
    });
  }

  loadSupervisores(): void {
    this.service.getSupervisoresAc().subscribe({
      next: data => {
        this.supervisores = data;
        this.cdr.detectChanges();
      },
      error: () => this.showError('No se pudieron cargar los supervisores'),
    });
  }

  selectProyecto(p: ProyectoConActividadesDTO): void {
    if (this.selectedProyectoId === p.id) return;
    this.selectedProyectoId = p.id;
    this.resetFilters();
    this.loadActividades();
  }

  onProyectoSeleccionado(id: number | null): void {
    if (id == null) {
      this.selectedProyectoId = null;
      return;
    }
    const p = this.proyectos.find(pr => pr.id === id);
    if (p) this.selectProyecto(p);
  }

  limpiarFiltros(): void {
    this.resetFilters();
    this.mostrarSinActividades = false;
    this.onFiltroChange();
    this.rebuildGroups();
  }

  resetFilters(): void {
    this.tipoFiltro = '';
    this.etapaNombreFiltro = null;
    this.searchQuery = '';
    this.soloActivas = true;
    this.excluirCulminadas = false;
    this.filtroSupervisorId = null;
  }

  loadActividades(): void {
    if (!this.selectedProyectoId) return;
    this.loading = true;
    this.service
      .getActividades({
        proyectoId: this.selectedProyectoId,
        tipo: this.tipoFiltro || null,
        etapaId: null,
        search: this.searchQuery || null,
        soloActivas: this.soloActivas || null,
        filtroUserId: this.filtroSupervisorId,
        pagina: 1,
        porPagina: 500,
      })
      .subscribe({
        next: data => {
          this.actividades = data.items;
          this.total = data.total;
          this.rebuildGroups();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
          this.showError('No se pudieron cargar las actividades');
        },
      });
  }

  private rebuildGroups(): void {
    let filtered = this.etapaNombreFiltro
      ? this.actividades.filter(a => a.etapaNombre === this.etapaNombreFiltro)
      : this.actividades;
    if (this.excluirCulminadas) filtered = filtered.filter(a => !a.finEfectivo);
    const groups = new Map<string, ActividadListItemDTO[]>();
    for (const a of filtered) {
      const key = a.etapaNombre || 'SIN ETAPA';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    this.etapasConActividades = Array.from(groups.entries()).map(([nombre, items]) => ({
      nombre,
      items,
      total: items.length,
      activas: items.filter(i => i.activo).length,
    }));
  }

  setTipo(t: TipoFiltro): void {
    this.tipoFiltro = t;
    this.loadActividades();
  }

  onSearchEnter(): void {
    this.loadActividades();
  }

  onFiltroChange(): void {
    this.loadActividades();
  }

  onEtapaFiltroChange(): void {
    this.rebuildGroups();
  }

  patchField(id: number, field: keyof ActividadPatchBody, value: any): void {
    const body: ActividadPatchBody = {};
    (body as any)[field] = value === '' ? null : value;
    this.service.patchActividad(id, body).subscribe({
      next: updated => {
        updated.retraso = this.computeRetraso(updated);
        const idx = this.actividades.findIndex(a => a.id === id);
        if (idx >= 0) {
          this.actividades[idx] = updated;
          this.rebuildGroups();
        }
        if (this.selectedProyecto) {
          this.refreshSelectedProyectoCounts();
        }
        this.cdr.detectChanges();
      },
      error: err => {
        const msg = err?.error?.message ?? 'No se pudo guardar el cambio';
        this.showError(msg);
      },
    });
  }

  private computeRetraso(a: ActividadListItemDTO): number | null {
    if (!a.finProgramado) return null;
    const finProg = this.parseDate(a.finProgramado);
    if (a.finEfectivo) {
      const finEf = this.parseDate(a.finEfectivo);
      return this.daysBetween(finProg, finEf);
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (finProg < hoy) return this.daysBetween(finProg, hoy);
    return null;
  }

  private parseDate(iso: string): Date {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private daysBetween(from: Date, to: Date): number {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
  }

  trackByActividad(_: number, a: ActividadListItemDTO): number {
    return a.id;
  }

  trackByEtapaGroup(_: number, g: EtapaGroup): string {
    return g.nombre;
  }

  trackBySupervisor(_: number, s: SupervisorAcDTO): number {
    return s.id;
  }

  private refreshSelectedProyectoCounts(): void {
    if (!this.selectedProyecto) return;
    const activas = this.actividades.filter(a => a.activo).length;
    this.selectedProyecto.activas = activas;
  }

  onDateChange(id: number, field: keyof ActividadPatchBody, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.patchField(id, field, value || null);
  }

  onResponsableChange(a: ActividadListItemDTO, userId: number | null): void {
    this.patchField(a.id, 'userId', userId);
  }

  onResponsable2Change(a: ActividadListItemDTO, userId2: number | null): void {
    this.patchField(a.id, 'userId2', userId2);
  }

  onObservacionesBlur(id: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.patchField(id, 'observaciones', value || null);
  }

  onEncargadoChange(nuevoId: number | null): void {
    if (!this.selectedProyectoId) return;
    const proyecto = this.selectedProyecto;
    if (!proyecto) return;

    const proyectoId = this.selectedProyectoId;

    this.service.patchProyecto(proyectoId, { responsableArqComId: nuevoId }).subscribe({
      next: updated => {
        const idx = this.proyectos.findIndex(p => p.id === proyectoId);
        if (idx !== -1) {
          this.proyectos[idx] = updated;
          this.proyectos = [...this.proyectos];
        }

        const nombre = updated.responsableArqCom ?? null;
        this.actividades = this.actividades.map(a => ({
          ...a,
          encargado1: nombre,
        }));
        this.rebuildGroups();
        this.cdr.detectChanges();
      },
      error: err => {
        const msg = err?.error?.message ?? 'No se pudo guardar el encargado';
        this.showError(msg);
      },
    });
  }

  generarActividades(proyecto: ProyectoConActividadesDTO, event?: Event): void {
    event?.stopPropagation();
    Swal.fire({
      title: '¿Generar actividades desde plantilla?',
      text: `Se crearán las actividades del plantilla en ${proyecto.nombre}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.service.generarActividades(proyecto.id).subscribe({
        next: res => {
          const terminar = () => {
            Swal.fire({
              icon: 'success',
              title: 'Listo',
              text: `${res.generadas} actividades generadas.`,
              timer: 2000,
            });
            this.loadProyectos();
            if (this.selectedProyectoId === proyecto.id) this.loadActividades();
            this.cdr.detectChanges();
          };

          if (proyecto.responsableArqComId) {
            this.service.reasignarEncargado(proyecto.id).subscribe({
              next: terminar,
              error: terminar,
            });
          } else {
            terminar();
          }
        },
        error: err => {
          const msg = err?.error?.message ?? 'No se pudieron generar las actividades';
          this.showError(msg);
        },
      });
    });
  }

  reasignarEncargado(event?: Event): void {
    event?.stopPropagation();
    const proyecto = this.selectedProyecto;
    if (!proyecto || !this.selectedProyectoId) return;

    if (!proyecto.responsableArqComId) {
      this.showError('Primero asigna un Responsable 1 al proyecto.');
      return;
    }

    Swal.fire({
      title: '¿Reasignar encargado?',
      text: `Se asignará a ${proyecto.responsableArqCom ?? 'el responsable del proyecto'} como Responsable 1 en todas las actividades de ${proyecto.nombre} que aún no tengan uno.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reasignar',
      cancelButtonText: 'Cancelar',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.service.reasignarEncargado(proyecto.id).subscribe({
        next: res => {
          Swal.fire({
            icon: 'success',
            title: 'Listo',
            text: `${res.actualizadas} actividades actualizadas.`,
            timer: 2000,
          });
          if (this.selectedProyectoId === proyecto.id) this.loadActividades();
          this.cdr.detectChanges();
        },
        error: err => {
          const msg = err?.error?.message ?? 'No se pudo reasignar el encargado';
          this.showError(msg);
        },
      });
    });
  }

  onToggleActivo(a: ActividadListItemDTO, event: Event): void {
    event.preventDefault();
    if (!a.activo) return;
    Swal.fire({
      title: '¿Resetear actividad?',
      text: '¿Estás segura de resetear esta actividad? Se borrarán todas las fechas y el estado volverá a VACÍO.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, resetear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then(result => {
      if (!result.isConfirmed) return;
      const body: ActividadPatchBody = {
        estado: 'VACIO',
        inicioProgramado: null,
        finProgramado: null,
        inicioEfectivo: null,
        finEfectivo: null,
        activo: false,
      };
      this.service.patchActividad(a.id, body).subscribe({
        next: updated => {
          updated.retraso = this.computeRetraso(updated);
          const idx = this.actividades.findIndex(x => x.id === a.id);
          if (idx >= 0) {
            this.actividades[idx] = updated;
            this.rebuildGroups();
            this.refreshSelectedProyectoCounts();
          }
          this.cdr.detectChanges();
        },
        error: err => {
          const msg = err?.error?.message ?? 'No se pudo resetear la actividad';
          this.showError(msg);
        },
      });
    });
  }

  estadoClass(estado: string): string {
    switch (estado) {
      case 'CULMINADO': return 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]';
      case 'EN PROCESO': return 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]';
      case 'VENCIDO': return 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]';
      case 'PENDIENTE': return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
      case 'VACIO': return 'bg-[#E5E7EB] text-[#6B7280] border-[#E5E7EB]';
      default: return 'bg-[#E5E7EB] text-[#6B7280] border-[#E5E7EB]';
    }
  }

  etapaClass(etapa: string | null): string {
    switch (etapa) {
      case 'PREVENTA': return 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]';
      case 'OBRA': return 'bg-[#DBEAFE] text-[#1E3A8A] border-[#BFDBFE]';
      case 'EDIFICIO ENTREGADO': return 'bg-[#CCFBF1] text-[#115E59] border-[#99F6E4]';
      case 'POST VENTA Y EXPERIENCIA': return 'bg-[#FCE7F3] text-[#9D174D] border-[#FBCFE8]';
      case 'ALMACEN': return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
      default: return 'bg-[#E5E7EB] text-[#6B7280] border-[#E5E7EB]';
    }
  }

  onNuevaConsultaGuardada(): void {
    this.mostrarNuevaConsulta = false;
    this.loadActividades();
  }

  onNuevoHitoGuardado(): void {
    this.mostrarNuevoHito = false;
    this.loadActividades();
  }

  onNuevoEntregableGuardado(): void {
    this.mostrarNuevoEntregable = false;
    this.loadActividades();
  }

  onEditarActividad(a: ActividadListItemDTO): void {
    this.actividadParaEditar = a;
    this.mostrarEditarActividad = true;
  }

  onEditarGuardado(updated: ActividadListItemDTO): void {
    this.mostrarEditarActividad = false;
    updated.retraso = this.computeRetraso(updated);
    const idx = this.actividades.findIndex(a => a.id === updated.id);
    if (idx >= 0) {
      this.actividades[idx] = updated;
      this.rebuildGroups();
    }
    this.cdr.detectChanges();
  }

  onEliminarActividad(id: number): void {
    Swal.fire({
      title: '¿Eliminar actividad?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.service.deleteActividad(id).subscribe({
        next: () => this.loadActividades(),
        error: err => {
          const msg = err?.error?.message ?? 'No se pudo eliminar la actividad';
          this.showError(msg);
        },
      });
    });
  }

  private showError(msg: string): void {
    Swal.fire({ icon: 'error', title: 'Error', text: msg });
  }

  private showWarning(msg: string): void {
    Swal.fire({ icon: 'warning', title: 'Atención', text: msg });
  }

  private showInfo(msg: string): void {
    Swal.fire({ icon: 'info', title: 'Info', text: msg });
  }
}
