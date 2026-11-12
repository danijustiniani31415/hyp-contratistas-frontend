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
  Contrato,
  Partida,
  PedidoItemDecision,
  PedidoItemHistorial,
} from '../../core/services/pedidos.service';
import { PersonasService, CatalogoItem } from '../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../core/services/catalogo.service';
import { CatalogoValorService } from '../../core/services/catalogo-valor.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

const ESTADOS = ['PENDIENTE', 'PENDIENTE_GERENTE', 'APROBADO', 'RECHAZADO', 'ENTREGADO', 'CANCELADO'];

/** Fila editable de la decisión (Visar/Aprobar) para un ítem puntual — `tope` es el máximo que se
 * puede aprobar en esta etapa (CantidadSolicitada en Visar, lo que el Residente ya visó en
 * Aprobar; el backend valida esto mismo, esto es solo para no dejar escribir de más en el input). */
interface DecisionRow {
  itemId: number;
  productoNombre: string;
  unidadMedida: string;
  tope: number;
  rechazado: boolean;
  cantidadAprobada: number;
  motivoRechazo: string;
}

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
  contratos = signal<Contrato[]>([]);
  partidas = signal<Partida[]>([]);

  showModal = signal(false);
  error = signal('');
  guardando = signal(false);
  form: PedidoCreate = this.formVacio();
  destinatarios = signal<PedidoDestinatarios | null>(null);

  showDetalle = signal(false);
  detalle = signal<PedidoDetalle | null>(null);
  accionando = signal(false);
  decisiones = signal<DecisionRow[]>([]);
  historial = signal<PedidoItemHistorial[]>([]);
  showHistorial = signal(false);

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
    this.contratos.set([]);
    this.partidas.set([]);
    this.form.contratoId = null;
    for (const item of this.form.items) item.partidaId = null;
    if (!this.form.proyectoId) return;
    this.service.getDestinatarios(this.form.proyectoId).subscribe((d) => this.destinatarios.set(d));
    this.service.listContratos(this.form.proyectoId).subscribe((c) => this.contratos.set(c));
    this.service.listPartidas(this.form.proyectoId).subscribe((p) => this.partidas.set(p));
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
    this.contratos.set([]);
    this.partidas.set([]);
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
  }

  agregarItem(): void {
    this.form.items.push({ productoId: 0, talla: '', color: '', observacion: '', cantidadSolicitada: 1, partidaId: null });
  }

  quitarItem(i: number): void {
    this.form.items.splice(i, 1);
  }

  editarObservacionItem(item: PedidoItemCreate): void {
    Swal.fire({
      title: 'Observación del producto',
      input: 'textarea',
      inputValue: item.observacion ?? '',
      inputPlaceholder: 'Ej. cualquier marca, urgente...',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (res.isConfirmed) item.observacion = (res.value ?? '').trim();
    });
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
    return {
      proyectoId: 0,
      almacenId: 0,
      contratoId: null,
      observacion: '',
      items: [{ productoId: 0, talla: '', color: '', observacion: '', cantidadSolicitada: 1, partidaId: null }],
    };
  }

  // ── Detalle y acciones ──────────────────────────────────────────────
  verDetalle(id: number): void {
    this.service.getById(id).subscribe((d) => {
      this.detalle.set(d);
      this.showDetalle.set(true);
      this.showHistorial.set(false);
      this.historial.set([]);
      this.iniciarDecision(d);
    });
  }

  cerrarDetalle(): void {
    this.showDetalle.set(false);
  }

  toggleHistorial(): void {
    const abrir = !this.showHistorial();
    this.showHistorial.set(abrir);
    const id = this.detalle()?.id;
    if (abrir && id && !this.historial().length) {
      this.service.getHistorial(id).subscribe((h) => this.historial.set(h));
    }
  }

  get esMiPedido(): boolean {
    const d = this.detalle();
    const user = this.authService.getUser();
    return !!d && !!user && d.solicitanteUsuarioSistemaId === user.usuarioSistemaId;
  }

  /** Etapa que corresponde decidir ahora mismo, según el estado del pedido y el permiso del
   * usuario logueado — null si no hay nada que decidir (ya resuelto, o no le toca a este usuario). */
  etapaActual(d: PedidoDetalle | null): 'VISAR' | 'APROBAR' | null {
    if (!d) return null;
    if (d.estado === 'PENDIENTE' && this.authService.hasPermiso('PEDIDO_VISAR')) return 'VISAR';
    if (d.estado === 'PENDIENTE_GERENTE' && this.authService.hasPermiso('PEDIDO_APROBAR')) return 'APROBAR';
    return null;
  }

  private iniciarDecision(d: PedidoDetalle): void {
    const etapa = this.etapaActual(d);
    if (!etapa) {
      this.decisiones.set([]);
      return;
    }
    const estadoOrigen = etapa === 'VISAR' ? 'PENDIENTE' : 'VISADO';
    const itemsPorDecidir = d.items.filter((i) => i.estado === estadoOrigen);
    this.decisiones.set(
      itemsPorDecidir.map((i) => ({
        itemId: i.id,
        productoNombre: i.productoNombre,
        unidadMedida: i.unidadMedida,
        tope: etapa === 'VISAR' ? i.cantidadSolicitada : (i.cantidadAprobada ?? i.cantidadSolicitada),
        rechazado: false,
        cantidadAprobada: etapa === 'VISAR' ? i.cantidadSolicitada : (i.cantidadAprobada ?? i.cantidadSolicitada),
        motivoRechazo: '',
      })),
    );
  }

  guardarDecision(): void {
    const d = this.detalle();
    const etapa = this.etapaActual(d);
    if (!d || !etapa) return;

    const filas = this.decisiones();
    const faltaMotivo = filas.some((f) => f.rechazado && !f.motivoRechazo.trim());
    if (faltaMotivo) {
      Swal.fire({ icon: 'warning', title: 'Falta el motivo', text: 'Todo ítem rechazado necesita un motivo.' });
      return;
    }
    const cantidadInvalida = filas.some(
      (f) => !f.rechazado && (!(f.cantidadAprobada > 0) || f.cantidadAprobada > f.tope),
    );
    if (cantidadInvalida) {
      Swal.fire({ icon: 'warning', title: 'Cantidad inválida', text: 'La cantidad aprobada debe ser mayor a 0 y no mayor a lo solicitado/visado.' });
      return;
    }

    const decisiones: PedidoItemDecision[] = filas.map((f) => ({
      pedidoItemId: f.itemId,
      rechazado: f.rechazado,
      cantidadAprobada: f.rechazado ? null : f.cantidadAprobada,
      motivoRechazo: f.rechazado ? f.motivoRechazo.trim() : null,
    }));

    this.accionando.set(true);
    const obs = etapa === 'VISAR' ? this.service.visar(d.id, decisiones) : this.service.aprobar(d.id, decisiones);
    obs.subscribe({
      next: (nuevo) => {
        this.accionando.set(false);
        this.detalle.set(nuevo);
        this.iniciarDecision(nuevo);
        this.cargar();
      },
      error: (err) => {
        this.accionando.set(false);
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo guardar la decisión.' });
      },
    });
  }

  entregar(): void {
    const d = this.detalle();
    if (!d) return;
    const items = d.items.filter((i) => i.estado === 'APROBADO' && (i.cantidadAprobada ?? 0) - (i.cantidadEntregada ?? 0) > 0);
    const filas = items
      .map((i) => {
        const pend = (i.cantidadAprobada ?? 0) - (i.cantidadEntregada ?? 0);
        const nombre = `${i.productoNombre}${i.talla ? ' (' + i.talla + ')' : ''}`;
        return `<tr><td style="text-align:left;padding:4px 6px">${nombre}</td><td style="padding:4px 6px">${pend}</td>
          <td style="padding:4px 6px"><input class="swal2-input" style="margin:0;width:90px;height:34px" type="number" min="0" max="${pend}" step="0.01" value="${pend}" data-item="${i.id}" data-pend="${pend}"></td></tr>`;
      })
      .join('');
    Swal.fire({
      title: 'Entregar pedido',
      html: `<p style="font-size:13px;color:#64748b;margin:0 0 8px">Descuenta el stock del almacén. Si no hay todo, entrega solo lo que hay: el resto queda pendiente.</p>
        <table style="width:100%;font-size:13px"><thead><tr><th style="text-align:left">Producto</th><th>Falta</th><th>Entregar ahora</th></tr></thead><tbody>${filas}</tbody></table>
        <label style="display:flex;gap:8px;align-items:center;justify-content:flex-start;font-size:13px;margin-top:12px"><input id="swal-cerrar" type="checkbox"> Lo que falte ya no se entregará (cerrar el pedido)</label>`,
      width: 640,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Entregar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-item]'));
        const lista: { itemId: number; cantidad: number }[] = [];
        for (const inp of inputs) {
          const cant = Number(inp.value || 0);
          const pend = Number(inp.dataset['pend']);
          if (cant < 0 || cant > pend) {
            Swal.showValidationMessage(`La cantidad debe estar entre 0 y ${pend}`);
            return false;
          }
          if (cant > 0) lista.push({ itemId: Number(inp.dataset['item']), cantidad: cant });
        }
        if (!lista.length) {
          Swal.showValidationMessage('Indica cuánto entregas de al menos un ítem');
          return false;
        }
        return { items: lista, cerrarConSaldo: (document.getElementById('swal-cerrar') as HTMLInputElement).checked };
      },
    }).then((res) => {
      if (!res.isConfirmed || !res.value) return;
      this.accionando.set(true);
      this.service.entregar(d.id, res.value).subscribe({
        next: (det) => {
          this.accionando.set(false);
          this.detalle.set(det);
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
