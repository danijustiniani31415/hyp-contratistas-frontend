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
  GuiasRemisionService,
  GuiaRemisionListItem,
  GuiaRemisionDetalle,
  GuiaRemisionCreate,
  ConfirmarRecepcionItem,
} from '../../core/services/guias-remision.service';
import { PersonasService, AlmacenCatalogoItem } from '../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../core/services/catalogo.service';
import { PedidosService, PendienteDespacho } from '../../core/services/pedidos.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

const ESTADOS = ['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'ANULADA'];
const MOTIVOS = [
  { value: '04', label: 'Traslado entre establecimientos de la misma empresa' },
  { value: '02', label: 'Compra (devolución a proveedor)' },
  { value: '13', label: 'Otros' },
];
const UNIDADES = ['NIU', 'KGM', 'MTR', 'ZZ'];

/** [REVISADO] Estado en signals — mismo motivo que compras.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-guias-remision',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, BaseModal, FabButton, Paginator, LbPageHeader],
  templateUrl: './guias-remision.html',
  styleUrl: './guias-remision.css',
})
export class GuiasRemision implements OnInit {
  guias = signal<GuiaRemisionListItem[]>([]);
  search = '';
  estadoFiltro = '';
  estados = ESTADOS;
  motivos = MOTIVOS;
  unidades = UNIDADES;
  page = signal(1);
  pageSize = 20;
  totalRecords = signal(0);
  totalPages = signal(1);
  loading = signal(false);

  almacenes = signal<AlmacenCatalogoItem[]>([]);
  productos = signal<ProductoListItem[]>([]);

  showModal = signal(false);
  error = signal('');
  guardando = signal(false);
  form: GuiaRemisionCreate = this.formVacio();
  esTrasladoPropio = true;

  showDetalle = signal(false);
  detalle = signal<GuiaRemisionDetalle | null>(null);
  enviando = signal(false);
  confirmando = signal(false);

  // ── Despachar pedido (liga los ítems de la guía a un pedido) ────────
  showDespacharModal = signal(false);
  pendientesDespacho = signal<PendienteDespacho[]>([]);
  cargandoDespacho = signal(false);
  seleccionadosDespacho = new Set<number>();
  codigosPedidoPorItem: Record<number, string> = {};

  constructor(
    private service: GuiasRemisionService,
    private personasService: PersonasService,
    private catalogoService: CatalogoService,
    private pedidosService: PedidosService,
    public authService: LbAuthService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.personasService.getCatalogos().subscribe((c) => this.almacenes.set(c.almacenes));
    this.catalogoService.listProductos('', 1, 5000).subscribe((r) => this.productos.set(r.data));
  }

  cargar(): void {
    this.loading.set(true);
    this.service.list(this.search, this.estadoFiltro, this.page(), this.pageSize).subscribe({
      next: (res) => {
        this.guias.set(res.data);
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

  private buscarDebounce?: ReturnType<typeof setTimeout>;
  onSearchInput(): void {
    clearTimeout(this.buscarDebounce);
    this.buscarDebounce = setTimeout(() => this.onFiltroChange(), 350);
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.cargar();
  }

  // ── Nueva guía ───────────────────────────────────────────────────────
  abrirNuevo(): void {
    this.form = this.formVacio();
    this.esTrasladoPropio = true;
    this.codigosPedidoPorItem = {};
    this.error.set('');
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
  }

  onTrasladoPropioChange(): void {
    if (this.esTrasladoPropio) {
      this.form.motivoTraslado = '04';
      this.form.destinatarioRuc = '';
      this.form.destinatarioRazonSocial = '';
    } else {
      this.form.motivoTraslado = '13';
      this.form.almacenDestinoId = undefined;
    }
  }

  onModalidadChange(): void {
    if (this.form.modalidadTraslado === '01') {
      this.form.vehiculoPlaca = '';
      this.form.conductorNombres = '';
      this.form.conductorLicencia = '';
    } else {
      this.form.transportistaRuc = '';
      this.form.transportistaRazonSocial = '';
    }
  }

  agregarItem(): void {
    this.form.items.push({ productoId: 0, talla: '', color: '', cantidad: 1, unidadMedida: 'NIU' });
  }

  quitarItem(i: number): void {
    this.form.items.splice(i, 1);
  }

  // ── Despachar pedido ──────────────────────────────────────────────────
  abrirDespacharPedido(): void {
    if (!this.form.almacenOrigenId) {
      Swal.fire({ icon: 'info', title: 'Selecciona primero el almacén de origen', text: 'Así solo te muestro los pedidos que se despachan desde ahí.' });
      return;
    }
    this.seleccionadosDespacho.clear();
    this.cargandoDespacho.set(true);
    this.showDespacharModal.set(true);
    this.pedidosService.listPendientesDeDespacho().subscribe({
      next: (data) => {
        this.pendientesDespacho.set(data.filter((p) => p.almacenId === this.form.almacenOrigenId));
        this.cargandoDespacho.set(false);
      },
      error: () => this.cargandoDespacho.set(false),
    });
  }

  cerrarDespacharPedido(): void {
    this.showDespacharModal.set(false);
  }

  toggleSeleccionadoDespacho(pedidoItemId: number): void {
    if (this.seleccionadosDespacho.has(pedidoItemId)) this.seleccionadosDespacho.delete(pedidoItemId);
    else this.seleccionadosDespacho.add(pedidoItemId);
  }

  get haySeleccionadosDespacho(): boolean {
    return this.seleccionadosDespacho.size > 0;
  }

  agregarSeleccionadosAlaGuia(): void {
    const seleccionados = this.pendientesDespacho().filter((p) => this.seleccionadosDespacho.has(p.pedidoItemId));
    if (!seleccionados.length) return;

    // El primer ítem que agrega el form vacío es descartable si nunca se tocó.
    const primeroVacio = this.form.items.length === 1 && !this.form.items[0].productoId && !this.form.items[0].pedidoItemId;
    if (primeroVacio) this.form.items = [];

    for (const p of seleccionados) {
      this.form.items.push({
        productoId: p.productoId,
        talla: p.talla,
        color: p.color,
        cantidad: p.cantidadPendienteDeDespacho,
        unidadMedida: p.unidadMedida === 'UND' || !p.unidadMedida ? 'NIU' : p.unidadMedida,
        pedidoItemId: p.pedidoItemId,
      });
      this.codigosPedidoPorItem[p.pedidoItemId] = p.pedidoCodigo;
    }
    this.showDespacharModal.set(false);
  }

  /** SUNAT exige transportista (público) o vehículo+conductor (privado) para que la guía sea válida. */
  get formValido(): boolean {
    if (!this.form.almacenOrigenId || !this.form.items.length || !this.form.fechaTraslado) return false;
    if (this.form.modalidadTraslado === '01') return !!this.form.transportistaRuc;
    return !!this.form.vehiculoPlaca && !!this.form.conductorNombres && !!this.form.conductorLicencia;
  }

  guardar(): void {
    if (!this.formValido) return;
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
        this.error.set(err?.error?.message ?? 'No se pudo crear la guía de remisión.');
      },
    });
  }

  private formVacio(): GuiaRemisionCreate {
    return {
      motivoTraslado: '04',
      modalidadTraslado: '02',
      fechaTraslado: new Date().toISOString().slice(0, 10),
      pesoBrutoTotal: 0,
      pesoBrutoUnidad: 'KGM',
      almacenOrigenId: 0,
      observacion: '',
      items: [{ productoId: 0, talla: '', color: '', cantidad: 1, unidadMedida: 'NIU' }],
    };
  }

  // ── Detalle y envío a SUNAT ──────────────────────────────────────────
  verDetalle(id: number): void {
    this.service.getById(id).subscribe((d) => {
      this.detalle.set(d);
      this.showDetalle.set(true);
    });
  }

  cerrarDetalle(): void {
    this.showDetalle.set(false);
  }

  enviar(): void {
    const id = this.detalle()?.id;
    if (!id) return;
    Swal.fire({
      icon: 'question',
      title: '¿Transmitir esta guía al SEE de SUNAT?',
      text: 'Se firmará y enviará el XML electrónicamente. No se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, transmitir',
      cancelButtonText: 'Volver',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.enviando.set(true);
      this.service.enviar(id).subscribe({
        next: (d) => {
          this.enviando.set(false);
          this.detalle.set(d);
          this.cargar();
          if (d.estado === 'RECHAZADA') {
            Swal.fire({ icon: 'error', title: 'SUNAT rechazó la guía', text: d.cdrDescripcion ?? 'Revisa el detalle del CDR.' });
          } else {
            Swal.fire({ icon: 'success', title: 'Guía aceptada por SUNAT' });
          }
        },
        error: (err) => {
          this.enviando.set(false);
          Swal.fire({ icon: 'error', title: 'No se pudo transmitir', text: err?.error?.message ?? 'Error al conectar con SUNAT.' });
        },
      });
    });
  }

  consultarEstado(): void {
    const id = this.detalle()?.id;
    if (!id) return;
    this.enviando.set(true);
    this.service.consultarEstado(id).subscribe({
      next: (d) => {
        this.enviando.set(false);
        this.detalle.set(d);
        this.cargar();
        if (d.estado === 'ENVIADA') {
          Swal.fire({ icon: 'info', title: 'SUNAT todavía no genera el CDR', text: 'Vuelve a intentar en unos segundos.' });
        } else if (d.estado === 'RECHAZADA') {
          Swal.fire({ icon: 'error', title: 'SUNAT rechazó la guía', text: d.cdrDescripcion ?? 'Revisa el detalle del CDR.' });
        } else {
          Swal.fire({ icon: 'success', title: 'Guía aceptada por SUNAT' });
        }
      },
      error: (err) => {
        this.enviando.set(false);
        Swal.fire({ icon: 'error', title: 'No se pudo consultar', text: err?.error?.message ?? 'Error al conectar con SUNAT.' });
      },
    });
  }

  // ── Confirmación de recepción en destino (mina) ─────────────────────
  confirmarRecepcion(): void {
    const d = this.detalle();
    if (!d) return;

    const camposHtml = d.items
      .map(
        (it, idx) => `
        <label style="display:block;text-align:left;font-size:12px;margin:8px 0 2px">
          ${it.productoNombre}${it.talla ? ' (' + it.talla + ')' : ''} — despachado: ${it.cantidad}
        </label>
        <input id="swal-confirmar-${idx}" type="number" class="swal2-input" style="margin:0" min="0" max="${it.cantidad}" step="0.01" value="${it.cantidad}">
      `,
      )
      .join('');

    Swal.fire({
      title: 'Confirmar recepción en destino',
      html: `<p style="font-size:12.5px;color:#64748B;margin-bottom:8px">Indica cuánto llegó realmente de cada ítem — si llega menos, la diferencia se ajusta sola.</p>${camposHtml}`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Confirmar recepción',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const items: ConfirmarRecepcionItem[] = [];
        for (let idx = 0; idx < d.items.length; idx++) {
          const input = document.getElementById(`swal-confirmar-${idx}`) as HTMLInputElement;
          const cantidadConfirmada = Number(input.value);
          if (cantidadConfirmada < 0 || cantidadConfirmada > d.items[idx].cantidad) {
            Swal.showValidationMessage(`La cantidad de "${d.items[idx].productoNombre}" debe estar entre 0 y ${d.items[idx].cantidad}`);
            return false;
          }
          items.push({ itemId: d.items[idx].id, cantidadConfirmada });
        }
        return items;
      },
    }).then((res) => {
      if (!res.isConfirmed || !res.value) return;
      this.confirmando.set(true);
      this.service.confirmarRecepcion(d.id, res.value).subscribe({
        next: (detalle) => {
          this.confirmando.set(false);
          this.detalle.set(detalle);
          this.cargar();
          Swal.fire({ icon: 'success', title: 'Recepción confirmada' });
        },
        error: (err) => {
          this.confirmando.set(false);
          Swal.fire({ icon: 'error', title: 'No se pudo confirmar', text: err?.error?.message ?? 'Error al confirmar la recepción.' });
        },
      });
    });
  }
}
