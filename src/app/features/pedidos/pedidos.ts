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
  PedidosService,
  PedidoListItem,
  PedidoDetalle,
  PedidoCreate,
  PedidoItemCreate,
  PedidoDestinatarios,
} from '../../core/services/pedidos.service';
import { PersonasService, CatalogoItem } from '../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../core/services/catalogo.service';
import { CatalogoValorService } from '../../core/services/catalogo-valor.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

const ESTADOS = ['PENDIENTE', 'PENDIENTE_GERENTE', 'APROBADO', 'RECHAZADO', 'ENTREGADO', 'CANCELADO'];

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, BaseModal, FabButton, Paginator, LbPageHeader],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css',
})
export class Pedidos implements OnInit {
  pedidos = signal<PedidoListItem[]>([]);
  estadoFiltro = '';
  estados = ESTADOS;
  page = signal(1);
  pageSize = 20;
  totalRecords = signal(0);
  totalPages = signal(1);
  loading = signal(false);

  proyectos = signal<CatalogoItem[]>([]);
  almacenes = signal<CatalogoItem[]>([]);
  productos = signal<ProductoListItem[]>([]);
  tallasPorTipo = signal<Record<string, string[]>>({});
  colores = signal<string[]>([]);

  showModal = signal(false);
  error = signal('');
  guardando = signal(false);
  form: PedidoCreate = this.formVacio();
  destinatarios = signal<PedidoDestinatarios | null>(null);

  showDetalle = signal(false);
  detalle = signal<PedidoDetalle | null>(null);
  accionando = signal(false);

  constructor(
    private service: PedidosService,
    private personasService: PersonasService,
    private catalogoService: CatalogoService,
    private catalogoValorService: CatalogoValorService,
    public authService: LbAuthService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.personasService.getCatalogos().subscribe((c) => {
      this.proyectos.set(c.proyectos);
      this.almacenes.set(c.almacenes);
    });
    this.catalogoService.listProductos('', 1, 5000).subscribe((r) => this.productos.set(r.data));
    // Catálogo fijo de tallas (ROPA/CALZADO/GUANTES) — chico, se precarga entero de una vez.
    for (const tipo of ['ROPA', 'CALZADO', 'GUANTES']) {
      this.catalogoService.listTallas(tipo).subscribe((r) => {
        this.tallasPorTipo.update((m) => ({ ...m, [tipo]: r.map((t) => t.valor) }));
      });
    }
    this.catalogoValorService.list('COLOR').subscribe((r) => this.colores.set(r.map((c) => c.valor)));
  }

  productoDe(productoId: number): ProductoListItem | undefined {
    return this.productos().find((p) => p.id === productoId);
  }

  requiereTalla(item: PedidoItemCreate): boolean {
    return !!this.productoDe(item.productoId)?.requiereTalla;
  }

  tallasDe(item: PedidoItemCreate): string[] {
    const tipo = this.productoDe(item.productoId)?.tipoTalla;
    return tipo ? (this.tallasPorTipo()[tipo] ?? []) : [];
  }

  requiereColor(item: PedidoItemCreate): boolean {
    return !!this.productoDe(item.productoId)?.requiereColor;
  }

  onProductoChange(item: PedidoItemCreate): void {
    // Al cambiar de producto, la talla/color escritos ya no aplican.
    item.talla = '';
    item.color = '';
  }

  onProyectoChange(): void {
    this.destinatarios.set(null);
    if (!this.form.proyectoId) return;
    this.service.getDestinatarios(this.form.proyectoId).subscribe((d) => this.destinatarios.set(d));
  }

  cargar(): void {
    this.loading.set(true);
    this.service.list(this.estadoFiltro, this.page(), this.pageSize).subscribe({
      next: (res) => {
        this.pedidos.set(res.data);
        this.totalRecords.set(res.totalRecords);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFiltroChange(): void {
    this.page.set(1);
    this.cargar();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.cargar();
  }

  // ── Crear pedido ────────────────────────────────────────────────────
  abrirNuevo(): void {
    this.form = this.formVacio();
    this.error.set('');
    this.destinatarios.set(null);
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
  }

  agregarItem(): void {
    this.form.items.push({ productoId: 0, talla: '', color: '', observacion: '', cantidadSolicitada: 1 });
  }

  quitarItem(i: number): void {
    this.form.items.splice(i, 1);
  }

  guardar(): void {
    if (!this.form.proyectoId || !this.form.almacenId || !this.form.items.length) return;
    const faltaTalla = this.form.items.some((i) => this.requiereTalla(i) && !i.talla);
    if (faltaTalla) {
      this.error.set('Selecciona la talla de todos los productos que la requieren.');
      return;
    }
    const faltaColor = this.form.items.some((i) => this.requiereColor(i) && !i.color);
    if (faltaColor) {
      this.error.set('Selecciona el color de todos los productos que lo requieren.');
      return;
    }
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
        this.error.set(err?.error?.message ?? 'No se pudo crear el pedido.');
      },
    });
  }

  private formVacio(): PedidoCreate {
    return { proyectoId: 0, almacenId: 0, observacion: '', items: [{ productoId: 0, talla: '', color: '', observacion: '', cantidadSolicitada: 1 }] };
  }

  // ── Detalle y acciones ──────────────────────────────────────────────
  verDetalle(id: number): void {
    this.service.getById(id).subscribe((d) => {
      this.detalle.set(d);
      this.showDetalle.set(true);
    });
  }

  cerrarDetalle(): void {
    this.showDetalle.set(false);
  }

  get esMiPedido(): boolean {
    const d = this.detalle();
    const user = this.authService.getUser();
    return !!d && !!user && d.solicitanteUsuarioSistemaId === user.usuarioSistemaId;
  }

  visar(): void {
    const id = this.detalle()?.id;
    if (!id) return;
    this.accionando.set(true);
    this.service.visar(id).subscribe({
      next: (d) => {
        this.accionando.set(false);
        this.detalle.set(d);
        this.cargar();
      },
      error: (err) => {
        this.accionando.set(false);
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo visar.' });
      },
    });
  }

  rechazarVisado(): void {
    const id = this.detalle()?.id;
    if (!id) return;
    Swal.fire({
      icon: 'question',
      title: 'Motivo de rechazo',
      input: 'text',
      inputPlaceholder: 'Ej: no hay presupuesto este mes',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed || !res.value) return;
      this.accionando.set(true);
      this.service.rechazarVisado(id, res.value).subscribe({
        next: (d) => {
          this.accionando.set(false);
          this.detalle.set(d);
          this.cargar();
        },
        error: (err) => {
          this.accionando.set(false);
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo rechazar.' });
        },
      });
    });
  }

  aprobar(): void {
    const id = this.detalle()?.id;
    if (!id) return;
    this.accionando.set(true);
    this.service.aprobar(id).subscribe({
      next: (d) => {
        this.accionando.set(false);
        this.detalle.set(d);
        this.cargar();
      },
      error: (err) => {
        this.accionando.set(false);
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo aprobar.' });
      },
    });
  }

  rechazar(): void {
    const id = this.detalle()?.id;
    if (!id) return;
    Swal.fire({
      icon: 'question',
      title: 'Motivo de rechazo',
      input: 'text',
      inputPlaceholder: 'Ej: no hay presupuesto este mes',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed || !res.value) return;
      this.accionando.set(true);
      this.service.rechazar(id, res.value).subscribe({
        next: (d) => {
          this.accionando.set(false);
          this.detalle.set(d);
          this.cargar();
        },
        error: (err) => {
          this.accionando.set(false);
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo rechazar.' });
        },
      });
    });
  }

  entregar(): void {
    const id = this.detalle()?.id;
    if (!id) return;
    Swal.fire({
      icon: 'question',
      title: '¿Entregar este pedido?',
      text: 'Esto descuenta el stock del almacén de inmediato.',
      showCancelButton: true,
      confirmButtonText: 'Entregar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.accionando.set(true);
      this.service.entregar(id).subscribe({
        next: (d) => {
          this.accionando.set(false);
          this.detalle.set(d);
          this.cargar();
        },
        error: (err) => {
          this.accionando.set(false);
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo entregar.' });
        },
      });
    });
  }

  cancelar(): void {
    const id = this.detalle()?.id;
    if (!id) return;
    Swal.fire({
      icon: 'question',
      title: '¿Cancelar este pedido?',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.accionando.set(true);
      this.service.cancelar(id).subscribe({
        next: (d) => {
          this.accionando.set(false);
          this.detalle.set(d);
          this.cargar();
        },
        error: (err) => {
          this.accionando.set(false);
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo cancelar.' });
        },
      });
    });
  }
}
