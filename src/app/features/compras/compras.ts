import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { FabButton } from '../../shared/components/fab-button/fab-button';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbNav } from '../../shared/components/lb-nav/lb-nav';
import {
  ComprasService,
  Proveedor,
  ProveedorCreate,
  OrdenCompraListItem,
  OrdenCompraDetalle,
  OrdenCompraCreate,
} from '../../core/services/compras.service';
import { PersonasService, AlmacenCatalogoItem } from '../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../core/services/catalogo.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

const ESTADOS = ['PENDIENTE', 'RECIBIDA_PARCIAL', 'RECIBIDA', 'CANCELADA'];

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, BaseModal, FabButton, Paginator, LbNav],
  templateUrl: './compras.html',
  styleUrl: './compras.css',
})
export class Compras implements OnInit {
  ordenes = signal<OrdenCompraListItem[]>([]);
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

  constructor(
    private service: ComprasService,
    private personasService: PersonasService,
    private catalogoService: CatalogoService,
    public authService: LbAuthService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarProveedores();
    this.personasService.getCatalogos().subscribe((c) => this.almacenes.set(c.almacenes));
    this.catalogoService.listProductos('', 1, 200).subscribe((r) => this.productos.set(r.data));
  }

  cargar(): void {
    this.loading.set(true);
    this.service.list(this.estadoFiltro, this.page(), this.pageSize).subscribe({
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
    this.form.items.push({ productoId: 0, talla: '', cantidadSolicitada: 1, costoUnitario: 0 });
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
    return { proveedorId: 0, almacenId: 0, observacion: '', items: [{ productoId: 0, talla: '', cantidadSolicitada: 1, costoUnitario: 0 }] };
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
      title: 'Cantidad recibida',
      input: 'number',
      inputValue: pendiente,
      inputAttributes: { min: '0.01', max: String(pendiente), step: '0.01' },
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed || !res.value) return;
      this.service.recibirItem(ordenId, itemId, Number(res.value)).subscribe({
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
