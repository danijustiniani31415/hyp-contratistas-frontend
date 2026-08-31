import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { SolicitudSalidaCreate } from './create/create';
import { SolicitudSalidasService } from '../services/solicitud-salidas.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudSalidaListItemDto } from '../dtos/solicitud-salida-list-item.dto';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SolicitudSalidaDetalleModal } from './solicitud-salida-detalle-modal/solicitud-salida-detalle-modal';
import { SolicitudSalidaCapturasModal } from './solicitud-salida-capturas-modal/solicitud-salida-capturas-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../shared/components/fab-button/fab-button';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { ConsolidadoS10Modal } from '../../../shared/components/consolidado-s10-modal/consolidado-s10-modal';
import {
  ConsolidadoS10Ambito,
  ConsolidadoS10Dto,
} from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';

import { GESTION_ADMINISTRATIVA_TABS } from '../../../shared/gestion-administrativa-tabs';
@Component({
  standalone: true,
  selector: 'app-solicitud-salidas',
  imports: [CommonModule, DatePipe, SolicitudSalidaCreate, StatusBadge, SolicitudSalidaDetalleModal, SolicitudSalidaCapturasModal, SearchSelect, AbrilPageHeaderComponent, FabButton, TitleCasePipe, FilterTriggerButton, FilterModal, AbrilBulkActionDirective, ConsolidadoS10Modal],
  templateUrl: './solicitud-salidas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class SolicitudSalidas implements OnInit {
  readonly tabs = GESTION_ADMINISTRATIVA_TABS;
  anioActual = new Date().getFullYear();
  solicitudes: SolicitudSalidaListItemDto[] = [];
  showModal = false;
  /** true cuando el formulario se abrió desde el atajo del boletín (?nuevo=1) → pantalla completa. */
  modalFullScreen = false;

  /** ID de la solicitud cuyo modal de detalle (read-only) está abierto. null = cerrado. */
  detalleId: number | null = null;

  /** ID de la solicitud cuyo modal de subir capturas está abierto. null = cerrado. */
  capturasId: number | null = null;

  /** Solicitud cuyo modal de Consolidado del S10 está abierto. null = cerrado. */
  consolidadoDe: SolicitudSalidaListItemDto | null = null;

  /** IDs seleccionados para la acción bulk de rendición. */
  selectedIds = new Set<number>();
  /** Índice de la última fila clickeada (ancla para la selección por rango con Shift). */
  private lastClickedIndex: number | null = null;

  // ── Filtros ────────────────────────────────────────────────────────
  lugarProyectoOptions: any[] = [];
  readonly estadoAprobacionOptions = [
    { value: null,        label: 'Todas' },
    { value: 'Pendiente', label: 'Pendientes' },
    { value: 'Aprobado',  label: 'Aprobadas' },
    { value: 'Rechazado', label: 'Rechazadas' },
    { value: 'Cancelado', label: 'Canceladas' },
  ];
  readonly estadoRendicionOptions = [
    { value: null,         label: 'Todas' },
    { value: 'No rendido', label: 'No rendidas' },
    { value: 'Rendido',    label: 'Rendidas' },
  ];
  filters = {
    lugarProyectoId:  null as number | null,
    estadoAprobacion: null as string | null,
    estadoRendicion:  null as string | null,
  };

  /** Modal de filtros (mismo patrón que Gestión de Salidas). */
  filtrosAbiertos = false;

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.lugarProyectoId != null)  n++;
    if (this.filters.estadoAprobacion != null) n++;
    if (this.filters.estadoRendicion != null)  n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters = { lugarProyectoId: null, estadoAprobacion: null, estadoRendicion: null };
    this.onSearch();
  }

  constructor(
    private service: SolicitudSalidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFilterData();
    this.load();
    // Atajo desde el boletín (?nuevo=1): abre el formulario directo, sin pasos extra.
    if (this.route.snapshot.queryParamMap.get('nuevo') === '1') {
      this.showModal = true;
      this.modalFullScreen = true;
    }

    // Enlace directo de los correos del reembolso ("Ver mi solicitud" / "Subsanar observaciones"):
    // abre el detalle de esa solicitud sin que el trabajador tenga que buscarla en la tabla.
    const solicitudId = Number(this.route.snapshot.queryParamMap.get('solicitud'));
    if (solicitudId > 0) this.detalleId = solicitudId;
  }

  loadFilterData(): void {
    this.service.getFilterData().subscribe({
      next: (data) => {
        this.lugarProyectoOptions = [
          { id: null, nombreDisplay: 'Todos los proyectos' },
          ...[...data.lugaresProyecto].sort((a, b) => a.nombreDisplay.localeCompare(b.nombreDisplay)),
        ];
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  load(): void {
    this.loaderService.show();
    this.selectedIds.clear();
    this.lastClickedIndex = null;
    this.service.getMySolicitudes(
      this.filters.lugarProyectoId,
      this.filters.estadoAprobacion,
      this.filters.estadoRendicion,
    ).subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onSearch(): void {
    this.load();
  }

  onSaved(): void {
    this.showModal = false;
    this.load();
  }

  abrirDetalle(s: SolicitudSalidaListItemDto): void {
    this.detalleId = s.id;
  }

  cerrarDetalle(): void {
    this.detalleId = null;
  }

  // ── Selección de filas (estilo Outlook: click abre detalle, shift+click selecciona) ──

  /** Solo se pueden rendir: Aprobadas + No rendidas + con TODOS los trayectos cubiertos. */
  esSeleccionable(s: SolicitudSalidaListItemDto): boolean {
    return s.estadoAprobacion === 'Aprobado'
      && s.estadoRendicion === 'No rendido'
      && s.puedeRendirse;
  }

  /** Click sobre una fila: con Shift selecciona (o rango); sin Shift abre el detalle. */
  onRowClick(event: MouseEvent, index: number): void {
    if (event.shiftKey) {
      if (typeof window !== 'undefined') window.getSelection()?.removeAllRanges();
      this.onSelectClick(event, index);
      return;
    }
    this.abrirDetalle(this.solicitudes[index]);
  }

  /**
   * Click sobre la casilla de una fila. Con Shift selecciona todo el rango entre la última
   * fila clickeada y la actual (como en Outlook); sin Shift alterna solo esa fila.
   */
  onSelectClick(event: MouseEvent, index: number): void {
    event.stopPropagation();

    if (event.shiftKey && this.lastClickedIndex !== null) {
      const [desde, hasta] = [this.lastClickedIndex, index].sort((a, b) => a - b);
      for (let k = desde; k <= hasta; k++) this.selectedIds.add(this.solicitudes[k].id);
      return; // el ancla se mantiene
    }

    const id = this.solicitudes[index].id;
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else                          this.selectedIds.add(id);
    this.lastClickedIndex = index;
  }

  get allSelected(): boolean {
    return this.solicitudes.length > 0 && this.solicitudes.every((s) => this.selectedIds.has(s.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      this.selectedIds.clear();
    } else {
      this.selectedIds = new Set(this.solicitudes.map((s) => s.id));
    }
    this.lastClickedIndex = null;
  }

  get selectedSolicitudes(): SolicitudSalidaListItemDto[] {
    return this.solicitudes.filter((s) => this.selectedIds.has(s.id));
  }

  /** Seleccionadas que pueden rendirse (aplican a "Rendir"). */
  get selectedRendibles(): SolicitudSalidaListItemDto[] {
    return this.selectedSolicitudes.filter((s) => this.esSeleccionable(s));
  }

  /** Seleccionadas que se pueden cancelar: solo las que siguen Pendientes (todas son propias aquí). */
  get selectedCancelables(): SolicitudSalidaListItemDto[] {
    return this.selectedSolicitudes.filter((s) => s.estadoAprobacion === 'Pendiente');
  }

  /** Cancela en bloque las solicitudes pendientes seleccionadas. */
  async cancelarBulk(): Promise<void> {
    const items = this.selectedCancelables;
    if (items.length === 0) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: items.length === 1 ? '¿Cancelar esta solicitud?' : `¿Cancelar ${items.length} solicitudes?`,
      text: 'Se anularán tus solicitudes pendientes seleccionadas. Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#D30000',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    forkJoin(items.map((s) => this.service.cancelar(s.id))).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: `${items.length} solicitud(es) cancelada(s)`, icon: 'success', timer: 1500, showConfirmButton: false });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Acción bulk: rendir + descargar planilla ─────────────────────────
  rendirBulk(): Promise<void> {
    return this.rendir(this.selectedRendibles.map((s) => s.id));
  }

  /** Rinde una sola solicitud desde el botón "Rendir" de la columna de acciones. */
  rendirUna(s: SolicitudSalidaListItemDto, ev: Event): Promise<void> {
    ev.stopPropagation(); // no abrir el modal de detalle
    return this.rendir([s.id]);
  }

  /** Confirma, marca como rendidas las solicitudes indicadas y descarga la planilla. */
  private async rendir(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    const result = await Swal.fire({
      icon: 'question',
      title: ids.length === 1 ? '¿Rendir esta solicitud?' : `¿Rendir ${ids.length} solicitudes?`,
      text: 'Se marcará como rendida y se descargará tu planilla de gasto por movilidad.',
      showCancelButton: true,
      confirmButtonText: 'Sí, rendir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0086A5',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.marcarRendidasBulk(ids).subscribe({
      next: (response) => this.descargarPlanilla(response, ids.length),
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Rendición del mes anterior ───────────────────────────────────────

  /** Nombre del mes anterior al actual, para nombrar la acción sin ambigüedad. */
  get mesAnteriorLabel(): string {
    const hoy = new Date();
    const mes = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const nombre = mes.toLocaleDateString('es-PE', { month: 'long' });
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  }

  /**
   * Rinde de una vez todas las salidas propias del mes anterior que estén listas. El backend
   * resuelve qué entra (aprobadas, no rendidas y con capturas en todos sus trayectos) e ignora
   * el resto, así que no depende de lo que esté cargado en la tabla.
   */
  async rendirMesAnterior(): Promise<void> {
    const result = await Swal.fire({
      icon: 'question',
      title: `¿Rendir tus salidas de ${this.mesAnteriorLabel}?`,
      text: 'Solo entran las aprobadas con las capturas de todos sus trayectos.',
      showCancelButton: true,
      confirmButtonText: 'Sí, rendir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0086A5',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.rendirMesAnterior().subscribe({
      next: (response) => this.descargarPlanilla(response),
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /** Descarga el PDF devuelto por una rendición y refresca la tabla. */
  private descargarPlanilla(response: HttpResponse<Blob>, countFallback = 0): void {
    const blob = response.body as Blob;
    const count = Number(response.headers.get('X-Rendidas-Count') ?? countFallback);
    const filename = this.extractFilename(response.headers.get('Content-Disposition'))
                  ?? `Planilla_Rendicion_${new Date().toISOString().slice(0, 10)}.pdf`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    this.loaderService.hide();
    Swal.fire({
      title: `${count} solicitud(es) rendida(s)`,
      text: 'Se descargó la planilla de gasto por movilidad.',
      icon: 'success',
    });
    this.load();
  }

  // ── Consolidado del S10 (solo salidas rendidas) ──────────────────────

  /** El consolidado solo aplica cuando la salida ya fue rendida. */
  puedeAdjuntarConsolidado(s: SolicitudSalidaListItemDto): boolean {
    return s.estadoRendicion === 'Rendido';
  }

  abrirConsolidado(s: SolicitudSalidaListItemDto, ev: Event): void {
    ev.stopPropagation(); // no abrir el modal de detalle
    this.consolidadoDe = s;
  }

  /** Función de subida que consume el modal compartido (ya sabe a qué endpoint pegarle). */
  readonly subirConsolidado = (file: File, ambito: ConsolidadoS10Ambito) =>
    this.service.uploadConsolidadoS10(this.consolidadoDe!.id, file, ambito);

  /** Consolidado vigente de la salida abierta, para mostrarlo dentro del modal. */
  get consolidadoActual(): ConsolidadoS10Dto | null {
    const s = this.consolidadoDe;
    if (!s?.consolidadoS10Url) return null;
    return {
      id: 0,
      ambito: s.consolidadoS10Ambito ?? 'Rendicion',
      pdfUrl: s.consolidadoS10Url,
      pdfFilename: s.consolidadoS10Filename ?? 'Consolidado del S10',
      uploadedAt: '',
    };
  }

  /** Cierra el modal; si se subió algo recarga para reflejarlo en toda la planilla. */
  cerrarConsolidado(subido: ConsolidadoS10Dto | null): void {
    this.consolidadoDe = null;
    if (subido) this.load();
    else        this.cdr.detectChanges();
  }

  private extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
    return m ? decodeURIComponent(m[1]) : null;
  }

  /** Visible solo cuando la solicitud está Aprobada y aún no rendida. */
  puedeSubirCapturas(s: SolicitudSalidaListItemDto): boolean {
    return s.estadoAprobacion === 'Aprobado' && s.estadoRendicion !== 'Rendido';
  }

  abrirCapturas(s: SolicitudSalidaListItemDto, ev: Event): void {
    ev.stopPropagation(); // no abrir el modal de detalle
    this.capturasId = s.id;
  }

  /**
   * Cierra el modal de capturas. Si se subió al menos una captura (`recargar`), recarga el listado
   * para refrescar `puedeRendirse` — de lo contrario el botón "Rendir" seguiría deshabilitado con
   * datos viejos. No recarga si el usuario solo abrió y cerró sin subir nada.
   */
  cerrarCapturas(recargar: boolean): void {
    this.capturasId = null;
    if (recargar) this.load();
  }

  aprobacionColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      case 'Cancelado': return { bg: '#E5E7EB', text: '#4B5563' };
      default:          return { bg: '#FEF9C3', text: '#92400E' }; // Pendiente
    }
  }

  rendicionColors(estado: string): { bg: string; text: string } {
    return estado === 'Rendido'
      ? { bg: '#DBEAFE', text: '#0086A5' }
      : { bg: '#F3F4F6', text: '#6B7280' };
  }

  // ── Reembolso ────────────────────────────────────────────────────────

  reembolsoColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      case 'Firmado':   return { bg: '#E0E7FF', text: '#4338CA' };
      case 'Pagado':    return { bg: '#DCFCE7', text: '#15803D' };
      default:          return { bg: '#FEF9C3', text: '#92400E' }; // Pendiente
    }
  }

  /**
   * Avisa al jefe/revisor que el Consolidado del S10 ya está adjunto. Se puede repetir a
   * propósito (un correo se pierde, el jefe lo archiva sin leer): la fecha del último aviso queda
   * a la vista en el botón para que no se convierta en insistencia a ciegas.
   */
  async notificarRevisor(s: SolicitudSalidaListItemDto, ev: Event): Promise<void> {
    ev.stopPropagation(); // no abrir el detalle

    if (s.revisorNotificadoAt) {
      const result = await Swal.fire({
        icon: 'question',
        title: '¿Volver a avisar?',
        text: 'Ya le avisaste a tu revisor por esta salida. Se le enviará el correo otra vez.',
        showCancelButton: true,
        confirmButtonText: 'Sí, avisar de nuevo',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#0F6E56',
      });
      if (!result.isConfirmed) return;
    }

    this.loaderService.show();
    this.service.notificarRevisor(s.id).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message, timer: 2000, showConfirmButton: false });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }
}
