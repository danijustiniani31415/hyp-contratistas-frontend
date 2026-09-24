import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { FabButton } from '../../shared/components/fab-button/fab-button';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import {
  ComprasService,
  Proveedor,
  ProveedorCreate,
  OrdenCompraListItem,
  OrdenCompraDetalle,
  OrdenCompraCreate,
  PendienteCompra,
} from '../../core/services/compras.service';
import { PersonasService, AlmacenCatalogoItem } from '../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../core/services/catalogo.service';
import { PedidosService } from '../../core/services/pedidos.service';
import { AlmacenService, ReposicionSugerida } from '../../core/services/almacen.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

const ESTADOS = ['PENDIENTE', 'RECIBIDA_PARCIAL', 'RECIBIDA', 'CANCELADA'];

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, BaseModal, FabButton, Paginator, LbPageHeader],
  templateUrl: './compras.html',
  styleUrl: './compras.css',
})
export class Compras implements OnInit {
  ordenes = signal<OrdenCompraListItem[]>([]);
  search = '';
  estadoFiltro = '';
  estados = ESTADOS;
  page = signal(1);
  pageSize = 20;
  totalRecords = signal(0);
  totalPages = signal(1);
  loading = signal(false);

  proveedores = signal<Proveedor[]>([]);
  almacenes = signal<AlmacenCatalogoItem[]>([]);
  productos = signal<ProductoListItem[]>([]);

  showModal = signal(false);
  error = signal('');
  guardando = signal(false);
  form: OrdenCompraCreate = this.formVacio();

  showProveedorModal = signal(false);
  proveedorForm: ProveedorCreate = { razonSocial: '' };
  proveedorError = signal('');
  guardandoProveedor = signal(false);

  showDetalle = signal(false);
  detalle = signal<OrdenCompraDetalle | null>(null);

  // ── Pendientes de compra (panel de Logística) ───────────────────────
  showPendientesModal = signal(false);
  pendientes = signal<PendienteCompra[]>([]);
  reposiciones = signal<ReposicionSugerida[]>([]);
  cargandoPendientes = signal(false);
  seleccionados = new Set<number>();
  costosPorItem: Record<number, number> = {};
  seleccionadosReposicion = new Set<string>();
  cantidadesReposicion: Record<string, number> = {};
  costosReposicion: Record<string, number> = {};
  generarForm: { proveedorId: number; almacenId: number; observacion: string } = {
    proveedorId: 0,
    almacenId: 0,
    observacion: '',
  };
  generarError = signal('');
  generando = signal(false);

  constructor(
    private service: ComprasService,
    private personasService: PersonasService,
    private catalogoService: CatalogoService,
    private pedidosService: PedidosService,
    private almacenService: AlmacenService,
    public authService: LbAuthService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarProveedores();
    this.personasService.getCatalogos().subscribe((c) => this.almacenes.set(c.almacenes));
    this.catalogoService.listProductos('', 1, 5000).subscribe((r) => this.productos.set(r.data));
  }

  cargar(): void {
    this.loading.set(true);
    this.service.list(this.search, this.estadoFiltro, this.page(), this.pageSize).subscribe({
      next: (res) => {
        this.ordenes.set(res.data);
        this.totalRecords.set(res.totalRecords);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  cargarProveedores(): void {
    this.service.listProveedores().subscribe((p) => this.proveedores.set(p));
  }

  onFiltroChange(): void {
    this.page.set(1);
    this.cargar();
  }

  private buscarDebounce?: ReturnType<typeof setTimeout>;
  onSearchInput(): void {
    clearTimeout(this.buscarDebounce);
    this.buscarDebounce = setTimeout(() => this.onFiltroChange(), 350);
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.cargar();
  }

  // ── Proveedor ────────────────────────────────────────────────────────
  abrirNuevoProveedor(): void {
    this.proveedorForm = { razonSocial: '' };
    this.proveedorError.set('');
    this.showProveedorModal.set(true);
  }

  cerrarProveedorModal(): void {
    this.showProveedorModal.set(false);
  }

  guardarProveedor(): void {
    if (!this.proveedorForm.razonSocial) return;
    this.guardandoProveedor.set(true);
    this.service.crearProveedor(this.proveedorForm).subscribe({
      next: (p) => {
        this.guardandoProveedor.set(false);
        this.showProveedorModal.set(false);
        this.proveedores.update((list) => [...list, p]);
        this.form.proveedorId = p.id;
      },
      error: (err) => {
        this.guardandoProveedor.set(false);
        this.proveedorError.set(err?.error?.message ?? 'No se pudo guardar el proveedor.');
      },
    });
  }

  // ── Orden de compra ──────────────────────────────────────────────────
  abrirNuevo(): void {
    this.form = this.formVacio();
    this.error.set('');
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
  }

  agregarItem(): void {
    this.form.items.push({ productoId: 0, talla: '', color: '', cantidadSolicitada: 1, costoUnitario: 0 });
  }

  quitarItem(i: number): void {
    this.form.items.splice(i, 1);
  }

  guardar(): void {
    if (!this.form.proveedorId || !this.form.almacenId || !this.form.items.length) return;
    this.error.set('');
    this.guardando.set(true);
    this.service.crear(this.form).subscribe({
      next: () => {
        this.guardando.set(false);
        this.showModal.set(false);
        this.page.set(1);
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo crear la orden.');
      },
    });
  }

  private formVacio(): OrdenCompraCreate {
    return { proveedorId: 0, almacenId: 0, observacion: '', items: [{ productoId: 0, talla: '', color: '', cantidadSolicitada: 1, costoUnitario: 0 }] };
  }

  // ── Detalle y recepción ─────────────────────────────────────────────
  verDetalle(id: number): void {
    this.service.getById(id).subscribe((d) => {
      this.detalle.set(d);
      this.showDetalle.set(true);
    });
  }

  cerrarDetalle(): void {
    this.showDetalle.set(false);
  }

  recibir(itemId: number, pendiente: number): void {
    const ordenId = this.detalle()?.id;
    if (!ordenId) return;
    Swal.fire({
      title: 'Registrar recepción',
      html: `
        <label style="display:block;text-align:left;font-size:12px;margin:8px 0 2px">Cantidad recibida</label>
        <input id="swal-cantidad" type="number" class="swal2-input" style="margin:0" min="0.01" max="${pendiente}" step="0.01" value="${pendiente}">
        <label style="display:block;text-align:left;font-size:12px;margin:8px 0 2px">N° de factura (opcional)</label>
        <input id="swal-factura-numero" type="text" class="swal2-input" style="margin:0">
        <label style="display:block;text-align:left;font-size:12px;margin:8px 0 2px">Monto de factura (opcional)</label>
        <input id="swal-factura-monto" type="number" class="swal2-input" style="margin:0" min="0" step="0.01">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const cantidad = Number((document.getElementById('swal-cantidad') as HTMLInputElement).value);
        const facturaNumero = (document.getElementById('swal-factura-numero') as HTMLInputElement).value || undefined;
        const facturaMontoStr = (document.getElementById('swal-factura-monto') as HTMLInputElement).value;
        const facturaMonto = facturaMontoStr ? Number(facturaMontoStr) : undefined;
        if (!cantidad || cantidad <= 0 || cantidad > pendiente) {
          Swal.showValidationMessage(`La cantidad debe estar entre 0.01 y ${pendiente}`);
          return false;
        }
        return { cantidad, facturaNumero, facturaMonto };
      },
    }).then((res) => {
      if (!res.isConfirmed || !res.value) return;
      const { cantidad, facturaNumero, facturaMonto } = res.value;
      this.service.recibirItem(ordenId, itemId, cantidad, facturaNumero, facturaMonto).subscribe({
        next: (d) => {
          this.detalle.set(d);
          this.cargar();
        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo registrar la recepción.' });
        },
      });
    });
  }

  // ── Pendientes de compra ─────────────────────────────────────────────
  abrirPendientes(): void {
    this.seleccionados.clear();
    this.costosPorItem = {};
    this.seleccionadosReposicion.clear();
    this.cantidadesReposicion = {};
    this.costosReposicion = {};
    this.generarForm = { proveedorId: 0, almacenId: 0, observacion: '' };
    this.generarError.set('');
    this.cargandoPendientes.set(true);
    this.showPendientesModal.set(true);
    this.pedidosService.listPendientesDeCompra().subscribe({
      next: (data) => {
        this.pendientes.set(data);
        this.cargandoPendientes.set(false);
      },
      error: () => this.cargandoPendientes.set(false),
    });
    this.almacenService.listReposicionSugerida().subscribe({
      next: (data) => {
        this.reposiciones.set(data);
        for (const r of data) this.cantidadesReposicion[this.claveReposicion(r)] = r.cantidadSugerida;
      },
    });
  }

  cerrarPendientes(): void {
    this.showPendientesModal.set(false);
  }

  toggleSeleccionado(pedidoItemId: number): void {
    if (this.seleccionados.has(pedidoItemId)) this.seleccionados.delete(pedidoItemId);
    else this.seleccionados.add(pedidoItemId);
  }

  claveReposicion(r: ReposicionSugerida): string {
    return `${r.productoId}|${r.talla}|${r.color}`;
  }

  toggleSeleccionadoReposicion(clave: string): void {
    if (this.seleccionadosReposicion.has(clave)) this.seleccionadosReposicion.delete(clave);
    else this.seleccionadosReposicion.add(clave);
  }

  get haySeleccionados(): boolean {
    return this.seleccionados.size > 0 || this.seleccionadosReposicion.size > 0;
  }

  generarOrdenDesdePendientes(): void {
    if (!this.generarForm.proveedorId || !this.generarForm.almacenId || !this.haySeleccionados) return;
    this.generarError.set('');
    this.generando.set(true);

    const itemsDePedido = Array.from(this.seleccionados).map((pedidoItemId) => ({
      pedidoItemId,
      costoUnitario: this.costosPorItem[pedidoItemId] || 0,
    }));

    const itemsDeReposicion = this.reposiciones()
      .filter((r) => this.seleccionadosReposicion.has(this.claveReposicion(r)))
      .map((r) => {
        const clave = this.claveReposicion(r);
        return {
          productoId: r.productoId,
          talla: r.talla,
          color: r.color,
          cantidad: this.cantidadesReposicion[clave] || r.cantidadSugerida,
          costoUnitario: this.costosReposicion[clave] || 0,
        };
      });

    this.service
      .generarDesdePedidos({ ...this.generarForm, items: [...itemsDePedido, ...itemsDeReposicion] })
      .subscribe({
        next: () => {
          this.generando.set(false);
          this.showPendientesModal.set(false);
          this.page.set(1);
          this.cargar();
          Swal.fire({ icon: 'success', title: 'Orden de compra creada' });
        },
        error: (err) => {
          this.generando.set(false);
          this.generarError.set(err?.error?.message ?? 'No se pudo generar la orden de compra.');
        },
      });
  }

  devolver(itemId: number, cantidadRecibida: number): void {
    const ordenId = this.detalle()?.id;
    if (!ordenId) return;
    Swal.fire({
      title: 'Devolver al proveedor',
      html: `
        <p style="font-size:12px;color:#64748B;text-align:left;margin:0 0 8px">Se genera una Guía de Remisión real de salida (motivo: devolución a proveedor).</p>
        <label style="display:block;text-align:left;font-size:12px;margin:8px 0 2px">Cantidad a devolver</label>
        <input id="swal-dev-cantidad" type="number" class="swal2-input" style="margin:0" min="0.01" max="${cantidadRecibida}" step="0.01" value="${cantidadRecibida}">
        <label style="display:block;text-align:left;font-size:12px;margin:8px 0 2px">Fecha de traslado</label>
        <input id="swal-dev-fecha" type="date" class="swal2-input" style="margin:0" value="${new Date().toISOString().slice(0, 10)}">
        <label style="display:block;text-align:left;font-size:12px;margin:8px 0 2px">Peso bruto total (kg)</label>
        <input id="swal-dev-peso" type="number" class="swal2-input" style="margin:0" min="0" step="0.01">
        <label style="display:block;text-align:left;font-size:12px;margin:8px 0 2px">Placa del vehículo</label>
        <input id="swal-dev-placa" type="text" class="swal2-input" style="margin:0">
        <label style="display:block;text-align:left;font-size:12px;margin:8px 0 2px">Nombres del conductor</label>
        <input id="swal-dev-conductor" type="text" class="swal2-input" style="margin:0">
        <label style="display:block;text-align:left;font-size:12px;margin:8px 0 2px">Licencia del conductor</label>
        <input id="swal-dev-licencia" type="text" class="swal2-input" style="margin:0">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Devolver',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const cantidad = Number((document.getElementById('swal-dev-cantidad') as HTMLInputElement).value);
        const fechaTraslado = (document.getElementById('swal-dev-fecha') as HTMLInputElement).value;
        const pesoBrutoTotal = Number((document.getElementById('swal-dev-peso') as HTMLInputElement).value);
        const vehiculoPlaca = (document.getElementById('swal-dev-placa') as HTMLInputElement).value;
        const conductorNombres = (document.getElementById('swal-dev-conductor') as HTMLInputElement).value;
        const conductorLicencia = (document.getElementById('swal-dev-licencia') as HTMLInputElement).value;
        if (!cantidad || cantidad <= 0 || cantidad > cantidadRecibida) {
          Swal.showValidationMessage(`La cantidad debe estar entre 0.01 y ${cantidadRecibida}`);
          return false;
        }
        if (!fechaTraslado || !pesoBrutoTotal || !vehiculoPlaca || !conductorNombres || !conductorLicencia) {
          Swal.showValidationMessage('Completa fecha, peso, placa y datos del conductor — SUNAT los exige para la guía.');
          return false;
        }
        return { cantidad, fechaTraslado, pesoBrutoTotal, vehiculoPlaca, conductorNombres, conductorLicencia };
      },
    }).then((res) => {
      if (!res.isConfirmed || !res.value) return;
      const v = res.value;
      this.service
        .devolverItem(ordenId, itemId, {
          cantidad: v.cantidad,
          modalidadTraslado: '02',
          fechaTraslado: v.fechaTraslado,
          pesoBrutoTotal: v.pesoBrutoTotal,
          pesoBrutoUnidad: 'KGM',
          vehiculoPlaca: v.vehiculoPlaca,
          conductorNombres: v.conductorNombres,
          conductorLicencia: v.conductorLicencia,
        })
        .subscribe({
          next: (r) => {
            this.detalle.set(r.orden);
            this.cargar();
            Swal.fire({ icon: 'success', title: 'Devolución registrada', text: `Guía generada: ${r.guiaCodigo}` });
          },
          error: (err) => {
            Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo registrar la devolución.' });
          },
        });
    });
  }

  cancelarOrden(): void {
    const ordenId = this.detalle()?.id;
    if (!ordenId) return;
    Swal.fire({
      icon: 'question',
      title: '¿Cancelar esta orden de compra?',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.service.cancelar(ordenId).subscribe({
        next: (d) => {
          this.detalle.set(d);
          this.cargar();
        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo cancelar.' });
        },
      });
    });
  }
}
