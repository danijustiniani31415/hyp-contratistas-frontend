import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../../environments/environment';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { LimpiezasCalendar } from '../limpiezas-calendar/limpiezas-calendar';
import {
  CroquisGestionDTO,
  CroquisGestionLoteDTO,
  VecinoListItemDTO,
} from '../../dtos/gestion-vecinos.dto';

@Component({
  selector: 'app-gestion-croquis-view',
  standalone: true,
  imports: [CommonModule, BaseModal, SectionTabs, LimpiezasCalendar],
  templateUrl: './gestion-croquis-view.html',
})
export class GestionCroquisView implements OnChanges {
  @Input() croquis: CroquisGestionDTO[] = [];

  /**
   * Al recargar los croquis (ej. tras añadir vecinos con este modal abierto),
   * re-apunta el croquis/lote seleccionados a los objetos frescos para no
   * mostrar contadores/vecinos desactualizados.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['croquis'] || !this.selected) return;
    const fresh = this.croquis.find((c) => c.projectId === this.selected!.projectId) ?? null;
    this.selected = fresh;
    if (fresh && this.selectedLote) {
      this.selectedLote =
        fresh.lotes.find(
          (l) => l.projectCroquisLoteId === this.selectedLote!.projectCroquisLoteId,
        ) ?? null;
    } else {
      this.selectedLote = null;
    }
  }

  // ── Secciones del modal del croquis ──────────────────────────────────────
  readonly sectionTabs: SectionTab[] = [
    { id: 'resumen', label: 'Resumen del proyecto' },
    { id: 'limpiezas', label: 'Calendario de limpiezas' },
  ];
  activeSection: 'resumen' | 'limpiezas' = 'resumen';

  /** Base del backend (sin slash final) para componer URLs de imágenes. */
  get apiBase(): string {
    return environment.apiUrl.replace(/\/$/, '');
  }

  /** Filtro de proyecto (cliente), controlado por el padre. */
  @Input() filterProjectId: number | null = null;
  /** Pide al padre abrir el detalle del vecino. */
  @Output() viewVecino = new EventEmitter<VecinoListItemDTO>();
  /** Pide al padre abrir el alta de vecinos, preseleccionando proyecto y (opcionalmente) lote. */
  @Output() addVecino = new EventEmitter<{ projectId: number; loteId: number | null }>();

  selected: CroquisGestionDTO | null = null;
  selectedLote: CroquisGestionLoteDTO | null = null;
  /**
   * Lote bajo el cursor. Solo se dibuja la etiqueta de este lote (y la del
   * seleccionado) para que los nombres no se solapen entre sí en el croquis.
   */
  hoverLoteId: number | null = null;

  imageSrc(url: string): string {
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  /** Croquis filtrados por proyecto. */
  get filteredCroquis(): CroquisGestionDTO[] {
    if (!this.filterProjectId) return this.croquis;
    return this.croquis.filter((c) => c.projectId === this.filterProjectId);
  }

  /** Cuántos lotes del croquis tienen al menos un vecino registrado. */
  countAssigned(c: CroquisGestionDTO): number {
    return c.lotes.filter((l) => l.vecinosCount > 0).length;
  }

  /** Todos los vecinos/departamentos del proyecto (aplanando los lotes). */
  allVecinos(c: CroquisGestionDTO): VecinoListItemDTO[] {
    return c.lotes.reduce<VecinoListItemDTO[]>((acc, l) => acc.concat(l.vecinos), []);
  }

  /** % de entregables aprobados sobre los evaluables (Falta + Enviado + Aprobado). */
  aprobadosPct(item: { entregablesAprobados: number; entregablesEvaluables: number }): number {
    if (!item.entregablesEvaluables) return 0;
    return Math.round((item.entregablesAprobados / item.entregablesEvaluables) * 100);
  }

  /** % de solicitudes aprobadas (Aceptada) sobre las evaluables (Aceptada + Por responder). */
  solicitudesAprobadasPct(item: { solicitudesAprobadas: number; solicitudesEvaluables: number }): number {
    if (!item.solicitudesEvaluables) return 0;
    return Math.round((item.solicitudesAprobadas / item.solicitudesEvaluables) * 100);
  }

  /** % de requisitos subidos sobre los evaluables (Subido + No subido, sin "No aplica"). */
  requisitosSubidosPct(item: { requisitosSubidos: number; requisitosEvaluables: number }): number {
    if (!item.requisitosEvaluables) return 0;
    return Math.round((item.requisitosSubidos / item.requisitosEvaluables) * 100);
  }

  /** Total de compromisos con fecha límite por municipalidad/fiscalización. */
  compromisosLimiteTotal(c: CroquisGestionDTO): number {
    return c.compromisosLimitePendientes + c.compromisosLimiteEnProceso + c.compromisosLimiteCulminados;
  }

  /** Ancho (% exacto, sin redondear) de un segmento sobre un total, para la barra apilada. */
  segWidth(count: number, total: number): number {
    if (!total) return 0;
    return (count / total) * 100;
  }

  /** % redondeado de un segmento sobre un total (para las etiquetas). */
  segPct(count: number, total: number): number {
    if (!total) return 0;
    return Math.round((count / total) * 100);
  }

  // ── Apertura del croquis agrandado (solo lectura) ──────────────────────
  open(c: CroquisGestionDTO): void {
    this.selected = c;
    this.selectedLote = null;
    this.hoverLoteId = null;
    this.activeSection = 'resumen';
  }

  close(): void {
    this.selected = null;
    this.selectedLote = null;
    this.hoverLoteId = null;
    this.activeSection = 'resumen';
  }

  // ── Lotes ──────────────────────────────────────────────────────────────
  selectLote(lote: CroquisGestionLoteDTO): void {
    this.selectedLote = lote;
  }

  /** Clic fuera de un lote: deselecciona y vuelve al resumen del proyecto. */
  clearLote(): void {
    this.selectedLote = null;
  }

  pointsToSvg(puntos: number[][]): string {
    return puntos.map((p) => `${p[0] * 100},${p[1] * 100}`).join(' ');
  }

  centroid(puntos: number[][]): { x: number; y: number } {
    const n = puntos.length || 1;
    return {
      x: (puntos.reduce((a, p) => a + p[0], 0) / n) * 100,
      y: (puntos.reduce((a, p) => a + p[1], 0) / n) * 100,
    };
  }

  /** La etiqueta solo se muestra al pasar el mouse por el lote o si está seleccionado. */
  labelVisible(lote: CroquisGestionLoteDTO): boolean {
    return (
      this.hoverLoteId === lote.projectCroquisLoteId ||
      this.selectedLote?.projectCroquisLoteId === lote.projectCroquisLoteId
    );
  }

  loteFill(lote: CroquisGestionLoteDTO): string {
    if (this.selectedLote === lote) return 'rgba(0,134,165,0.45)';
    return lote.vecinosCount > 0 ? 'rgba(76,175,80,0.35)' : 'rgba(156,163,175,0.25)';
  }

  loteStroke(lote: CroquisGestionLoteDTO): string {
    if (this.selectedLote === lote) return '#0086A5';
    return lote.vecinosCount > 0 ? '#4CAF50' : '#9CA3AF';
  }

  /** Abre el detalle de un vecino/departamento del lote seleccionado. */
  verVecino(v: VecinoListItemDTO): void {
    this.viewVecino.emit(v);
  }

  /** Abre el alta de vecinos con el proyecto (y el lote seleccionado, si hay) precargados. */
  agregarVecinos(): void {
    if (!this.selected) return;
    this.addVecino.emit({
      projectId: this.selected.projectId,
      loteId: this.selectedLote?.projectCroquisLoteId ?? null,
    });
  }
}
