import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { ViewToggle } from '../../../../../shared/components/view-toggle/view-toggle';
import { ViewToggleMode } from '../../../../../shared/components/view-toggle/view-toggle.model';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { Roles } from '../../../../../core/constants/roles';

import { InvoiceService } from '../services/invoice.service';
import {
  InvoiceDto,
  InvoiceSupplierDto,
  InvoicePaymentFormDto,
  InvoiceCurrencyDto,
  InvoiceObservationReasonDto,
  InvoiceDetailDto,
  InvoiceBlockGroupDto,
  InvoiceFilterDto,
} from '../dtos/invoice.dtos';
import { FacturaCreate } from './create/create';
import { FacturaImport } from './import/import';
import { FacturaDetail } from './detail/detail';
import { FacturaEdit } from './edit/edit';
import { FacturaAttach } from './attach/attach';
import { FacturaObserve } from './observe/observe';

import { CONTABILIDAD_TABS } from '../../../shared/contabilidad-tabs';
@Component({
  selector: 'app-facturas',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, SearchSelect, ViewToggle, StatusBadge, DatePicker, FacturaCreate, FacturaImport, FacturaDetail, FacturaEdit, FacturaAttach, FacturaObserve, AbrilPageHeaderComponent],
  templateUrl: './facturas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class Facturas implements OnInit {
  readonly tabs = CONTABILIDAD_TABS;
  anioActual = new Date().getFullYear();

  invoices: InvoiceDto[] = [];
  suppliers: InvoiceSupplierDto[] = [];
  paymentForms: InvoicePaymentFormDto[] = [];
  abrilCompanies: InvoiceSupplierDto[] = [];
  currencies: InvoiceCurrencyDto[] = [];
  observationReasons: InvoiceObservationReasonDto[] = [];

  // ── Selección múltiple (vista de tabla) ────────────────────────────
  /** IDs de facturas seleccionadas para acciones en bloque. */
  selectedIds = new Set<number>();
  /** Índice de la última fila clickeada (ancla para selección por rango con Shift). */
  private lastClickedIndex: number | null = null;

  // Modal de observación
  showObserveModal = false;
  /** IDs objetivo de la observación: la selección de la tabla o la factura del menú contextual. */
  observeIds: number[] = [];

  filters: InvoiceFilterDto = {
    search: null,
    serie: null,
    correlativo: null,
    contributorId: null,
    contributorRuc: null,
    abrilContributorId: null,
    abrilContributorRuc: null,
    invoicePaymentFormId: null,
    currencyId: null,
    totalMin: null,
    totalMax: null,
    issueDateFrom: null,
    issueDateTo: null,
    page: 1,
    sortBy: null,
    sortDir: null,
  };
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  showCreateModal = false;
  showImportModal = false;
  showAdvanced = false;

  // Ver detalle / editar
  detailInvoiceId: number | null = null;
  editDetail: InvoiceDetailDto | null = null;

  // Adjuntar documento (factura sin documento)
  attachInvoice: InvoiceDto | null = null;

  // Menú contextual (clic derecho sobre una factura)
  ctxInvoice: InvoiceDto | null = null;
  ctxX = 0;
  ctxY = 0;

  // Hover de bloques
  hoveredInvoice: InvoiceDto | null = null;
  popX = 0;
  popY = 0;

  onBlockEnter(inv: InvoiceDto, event: MouseEvent): void {
    this.hoveredInvoice = inv;
    this.movePopover(event);
  }

  movePopover(event: MouseEvent): void {
    // Posición fija junto al cursor, sin salir del viewport.
    const w = 300, h = 230, margin = 14;
    let x = event.clientX + margin;
    let y = event.clientY + margin;
    if (typeof window !== 'undefined') {
      if (x + w > window.innerWidth) x = event.clientX - w - margin;
      if (y + h > window.innerHeight) y = window.innerHeight - h - margin;
    }
    this.popX = Math.max(margin, x);
    this.popY = Math.max(margin, y);
  }

  onBlockLeave(): void {
    this.hoveredInvoice = null;
  }

  /** Clic en un bloque: si tiene documento lo abre en otra pestaña; si no, abre el modal para adjuntar. */
  onBlockClick(inv: InvoiceDto): void {
    this.hoveredInvoice = null;
    if (inv.documentUrl) {
      window.open(inv.documentUrl, '_blank', 'noopener');
    } else {
      this.attachInvoice = inv;
    }
  }

  closeAttach(): void {
    this.attachInvoice = null;
  }

  onAttached(): void {
    this.attachInvoice = null;
    this.loadBlocks();
  }

  // ── Menú contextual (clic derecho → Firmar) ────────────────────────
  onInvoiceContextMenu(inv: InvoiceDto, event: MouseEvent): void {
    event.preventDefault();
    // Evitar que este mismo contextmenu burbujee a document y cierre el menú recién abierto.
    event.stopPropagation();
    this.hoveredInvoice = null;
    this.ctxInvoice = inv;
    // Posición junto al cursor, sin salir del viewport.
    const w = 230, h = 250, margin = 8;
    let x = event.clientX;
    let y = event.clientY;
    if (typeof window !== 'undefined') {
      if (x + w > window.innerWidth) x = window.innerWidth - w - margin;
      if (y + h > window.innerHeight) y = window.innerHeight - h - margin;
    }
    this.ctxX = Math.max(margin, x);
    this.ctxY = Math.max(margin, y);
  }

  @HostListener('document:click')
  @HostListener('document:contextmenu')
  @HostListener('document:scroll')
  @HostListener('window:resize')
  closeCtxMenu(): void {
    this.ctxInvoice = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.ctxInvoice = null;
  }

  /** Firma la factura: genera un PDF firmado (sin tocar el original). */
  signInvoice(inv: InvoiceDto): void {
    this.ctxInvoice = null;
    if (!this.canSign) return;
    if (!inv.documentUrl) {
      Swal.fire({ icon: 'info', title: 'Sin documento', text: 'Esta factura no tiene un documento que firmar.' });
      return;
    }

    Swal.fire({
      title: '¿Firmar esta factura?',
      text: `Se generará un PDF firmado de ${inv.invoiceNumber} (el documento original se conserva).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Firmar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.sign(inv.invoiceId).subscribe({
        next: (res) => {
          this.loaderService.hide();
          inv.signedDocumentUrl = res.signedDocumentUrl;
          Swal.fire({
            icon: 'success',
            title: 'Factura firmada',
            html: `Se generó el documento firmado. <a href="${res.signedDocumentUrl}" target="_blank" rel="noopener" style="color:#64BC04;text-decoration:underline">Abrir documento firmado</a>`,
            confirmButtonColor: '#64BC04',
          });
          if (this.viewMode === 'blocks') this.loadBlocks();
          else this.loadTable(this.currentPage);
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  /** Abre el documento firmado en una pestaña nueva. */
  openSigned(inv: InvoiceDto): void {
    this.ctxInvoice = null;
    if (inv.signedDocumentUrl && typeof window !== 'undefined') {
      window.open(inv.signedDocumentUrl, '_blank', 'noopener');
    }
  }

  // Vista bloques / tabla / tarjetas
  viewMode: 'blocks' | 'table' | 'cards' = 'blocks';
  blockGroups: InvoiceBlockGroupDto[] = [];
  readonly viewModes: ViewToggleMode[] = [
    {
      value: 'blocks',
      label: 'Bloques',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v5H4V4Zm0 7h16v5H4v-5Zm0 7h16v3H4v-3Z" stroke="currentColor" stroke-width="1.4"/></svg>',
    },
    {
      value: 'table',
      label: 'Tabla',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 5h18v14H3V5Zm0 5h18M3 15h18M9 5v14" stroke="currentColor" stroke-width="1.6"/></svg>',
    },
    {
      value: 'cards',
      label: 'Tarjetas',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="currentColor" stroke-width="1.6"/></svg>',
    },
  ];

  /** Solo quienes tienen el rol firmante pueden firmar facturas (menú contextual en las 3 vistas). */
  canSign = false;

  constructor(
    private service: InvoiceService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
  ) {
    this.canSign = this.authService.hasRole(Roles.CONTABILIDAD_FIRMANTE);
  }

  ngOnInit(): void {
    this.loadInit();
  }

  /** Primera carga: desplegables + tabla en una sola petición. */
  private loadInit(): void {
    this.loaderService.show();
    this.service.getInit(this.filters).subscribe({
      next: (res) => {
        this.suppliers = res.suppliers;
        this.paymentForms = res.paymentForms;
        this.abrilCompanies = res.abrilCompanies;
        this.currencies = res.currencies;
        this.observationReasons = res.observationReasons;
        this.applyPaged(res.invoices);
        this.loaderService.hide();
        this.loadBlocks();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Recarga solo la tabla (al filtrar o paginar). */
  loadTable(page: number = 1): void {
    this.filters.page = page;
    this.loaderService.show();
    this.service.getPaged(this.filters).subscribe({
      next: (res) => {
        this.applyPaged(res);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private applyPaged(res: { data: InvoiceDto[]; page: number; totalPages: number; totalRecords: number }): void {
    this.invoices = res.data;
    this.currentPage = res.page;
    this.totalPages = res.totalPages;
    this.totalRecords = res.totalRecords;
    // La selección no sobrevive a un cambio de página / filtrado.
    this.selectedIds.clear();
    this.lastClickedIndex = null;
  }

  /** Carga las facturas agrupadas por razón social de Abril (vista de bloques). */
  loadBlocks(): void {
    this.loaderService.show();
    this.service.getBlocks(this.filters).subscribe({
      next: (groups) => {
        this.blockGroups = groups;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onViewModeChange(mode: string): void {
    this.viewMode = mode as 'blocks' | 'table' | 'cards';
    if (mode === 'blocks') this.loadBlocks();
  }

  onSearch(): void {
    if (this.viewMode === 'blocks') this.loadBlocks();
    else this.loadTable(1);
  }

  onPageChange(page: number): void {
    this.loadTable(page);
  }

  // ── Ordenamiento de columnas (server-side) ──────────────────────────
  /**
   * Cicla el orden de una columna: sin orden → ascendente → descendente → orden original.
   * El orden se aplica en el servidor sobre todos los registros (no solo la página visible).
   */
  toggleSort(column: string): void {
    if (this.filters.sortBy !== column) {
      this.filters.sortBy = column;
      this.filters.sortDir = 'asc';
    } else if (this.filters.sortDir === 'asc') {
      this.filters.sortDir = 'desc';
    } else {
      // Estaba en descendente → volver al orden original.
      this.filters.sortBy = null;
      this.filters.sortDir = null;
    }
    this.loadTable(1);
  }

  /** Dirección de orden activa para una columna (o null si no está ordenada por ella). */
  sortDirOf(column: string): 'asc' | 'desc' | null {
    return this.filters.sortBy === column ? this.filters.sortDir ?? null : null;
  }

  openCreate(): void {
    this.showImportModal = true;
  }

  openManualCreate(): void {
    this.showCreateModal = true;
  }

  onImported(): void {
    this.showImportModal = false;
    this.loadInit();
  }

  onCreateClosed(): void {
    this.showCreateModal = false;
  }

  /** Tras guardar una factura: recarga tabla y desplegables (puede haber un proveedor nuevo). */
  onCreated(): void {
    this.showCreateModal = false;
    this.loadInit();
  }

  // ── Ver detalle / editar ───────────────────────────────────────────
  openDetail(invoiceId: number): void {
    this.detailInvoiceId = invoiceId;
  }

  closeDetail(): void {
    this.detailInvoiceId = null;
  }

  onDetailEdit(detail: InvoiceDetailDto): void {
    this.detailInvoiceId = null;
    this.editDetail = detail;
  }

  closeEdit(): void {
    this.editDetail = null;
  }

  onEdited(): void {
    this.editDetail = null;
    this.loadTable(this.currentPage);
  }

  // ── Selección múltiple (estilo Outlook: clic + Shift+clic para rangos) ──
  /**
   * Maneja el clic sobre la casilla de selección de una fila.
   * Con Shift presionado selecciona todo el rango entre la última fila clickeada
   * y la actual; sin Shift alterna solo esa fila.
   */
  /**
   * Clic sobre una fila de la tabla. Con Shift presionado selecciona el registro
   * (o el rango, como en la casilla) en vez de abrir el detalle.
   */
  onRowClick(event: MouseEvent, index: number): void {
    if (event.shiftKey) {
      // Evita que Shift+clic resalte texto de la fila.
      if (typeof window !== 'undefined') window.getSelection()?.removeAllRanges();
      this.onSelectClick(event, index);
      return;
    }
    this.openDetail(this.invoices[index].invoiceId);
  }

  onSelectClick(event: MouseEvent, index: number): void {
    event.stopPropagation();

    if (event.shiftKey && this.lastClickedIndex !== null) {
      const [desde, hasta] = [this.lastClickedIndex, index].sort((a, b) => a - b);
      for (let k = desde; k <= hasta; k++) this.selectedIds.add(this.invoices[k].invoiceId);
      return; // el ancla se mantiene
    }

    const id = this.invoices[index].invoiceId;
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
    this.lastClickedIndex = index;
  }

  get allSelected(): boolean {
    return this.invoices.length > 0 && this.invoices.every((i) => this.selectedIds.has(i.invoiceId));
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      this.selectedIds.clear();
    } else {
      this.selectedIds = new Set(this.invoices.map((i) => i.invoiceId));
    }
    this.lastClickedIndex = null;
  }

  private get selectedIdsArray(): number[] {
    return Array.from(this.selectedIds);
  }

  // ── Acciones: aprobar / rechazar / observar ──────────────────────────
  // Operan sobre la selección de la tabla (bulk) o sobre una sola factura
  // desde el menú contextual (disponible en bloques, tabla y tarjetas).

  /** Recarga la vista activa tras aplicar una acción. */
  private reloadCurrentView(): void {
    if (this.viewMode === 'blocks') this.loadBlocks();
    else this.loadTable(this.currentPage);
  }

  aprobarBulk(): void {
    this.aprobar(this.selectedIdsArray);
  }

  /** Aprueba la factura del menú contextual. */
  aprobarCtx(inv: InvoiceDto): void {
    this.ctxInvoice = null;
    this.aprobar([inv.invoiceId]);
  }

  private aprobar(ids: number[]): void {
    if (ids.length === 0) return;

    Swal.fire({
      icon: 'question',
      title: `¿Aprobar ${ids.length} factura(s)?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64BC04',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.approve(ids).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ title: res.message, icon: 'success', timer: 1500, showConfirmButton: false });
          this.reloadCurrentView();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  rechazarBulk(): void {
    this.rechazar(this.selectedIdsArray);
  }

  /** Rechaza la factura del menú contextual. */
  rechazarCtx(inv: InvoiceDto): void {
    this.ctxInvoice = null;
    this.rechazar([inv.invoiceId]);
  }

  private rechazar(ids: number[]): void {
    if (ids.length === 0) return;

    Swal.fire({
      icon: 'warning',
      title: `¿Rechazar ${ids.length} factura(s)?`,
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.reject(ids).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ title: res.message, icon: 'success', timer: 1500, showConfirmButton: false });
          this.reloadCurrentView();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  /** Abre el modal de motivo de observación para la selección de la tabla. */
  openObserve(): void {
    if (this.selectedIds.size === 0) return;
    this.observeIds = this.selectedIdsArray;
    this.showObserveModal = true;
  }

  /** Abre el modal de motivo de observación para la factura del menú contextual. */
  observarCtx(inv: InvoiceDto): void {
    this.ctxInvoice = null;
    this.observeIds = [inv.invoiceId];
    this.showObserveModal = true;
  }

  closeObserve(): void {
    this.showObserveModal = false;
  }

  /** Confirma la observación con el motivo elegido en el modal. */
  onObserveConfirm(reasonId: number): void {
    const ids = this.observeIds;
    if (ids.length === 0) return;

    this.loaderService.show();
    this.service.observe(ids, reasonId).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.showObserveModal = false;
        Swal.fire({ title: res.message, icon: 'success', timer: 1500, showConfirmButton: false });
        this.reloadCurrentView();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Colores del badge de estado ──────────────────────────────────────
  estadoColors(estado?: string | null): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      case 'Observado': return { bg: '#FEF3C7', text: '#92400E' };
      default:          return { bg: '#F3F4F6', text: '#6B7280' }; // Pendiente / sin estado
    }
  }
}
