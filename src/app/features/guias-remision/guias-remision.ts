import { ChangeDetectorRef, Component, OnInit, computed, signal } from '@angular/core';
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
  Transportista,
  Vehiculo,
  Conductor,
} from '../../core/services/guias-remision.service';
import { PersonasService, AlmacenCatalogoItem } from '../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../core/services/catalogo.service';
import { PedidosService, PendienteDespacho } from '../../core/services/pedidos.service';
import { LbAuthService } from '../../core/services/lb-auth.service';
import { generarPdfGuia } from './guia-remision-pdf';
import { AlmacenService, StockListItem } from '../../core/services/almacen.service';
import { buscarProducto, extraerTalla, leerExcel } from './guia-excel-import';
import { DocumentosService } from '../../core/services/documentos.service';

/** Fila del listado importado desde Excel, antes de pasar a la guía. */
interface FilaImport {
  incluir: boolean;
  cantidad: number;
  descripcion: string;
  talla: string;
  productoId: number | null;
  libre: boolean;
  disponible: number | null;
  /** Producto parecido (no idéntico) del catálogo: se ofrece pero no se asigna solo. */
  sugerido: { id: number; nombre: string; porcentaje: number } | null;
}

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
  eliminando = signal(false);

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
    private almacenService: AlmacenService,
    private documentosService: DocumentosService,
    public authService: LbAuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── Consulta RENIEC por DNI (la misma que usa Personas): rellena apellidos y nombres del conductor ──
  reniecBuscando = signal(false);
  reniecAviso = signal('');

  /** Al completar los 8 dígitos consulta RENIEC; si no responde, quedan los campos para escribirlos a mano. */
  private consultarReniec(dni: string, aplicar: (apellidos: string, nombres: string) => void): void {
    if (!/^\d{8}$/.test(dni)) {
      this.reniecAviso.set('');
      return;
    }
    this.reniecBuscando.set(true);
    this.reniecAviso.set('');
    // Primero entre los trabajadores registrados; si no es uno, consulta RENIEC.
    this.documentosService.buscarDni(dni).subscribe({
      next: (p) => {
        aplicar((p.apellidos ?? '').trim().toUpperCase(), (p.nombres ?? '').trim().toUpperCase());
        this.reniecBuscando.set(false);
        this.reniecAviso.set(
          (p.origen === 'TRABAJADOR' ? 'Es trabajador registrado: datos tomados de Personas.' : 'Datos obtenidos de RENIEC.') +
            (p.aviso ? ` ${p.aviso}` : ''),
        );
        this.cdr.detectChanges();
      },
      error: () => {
        this.reniecBuscando.set(false);
        this.reniecAviso.set('No se pudo consultar el DNI: escribe los apellidos y nombres.');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Reconocimiento de empresas por RUC (transportista y destinatario): razón social automática ──
  rucBuscando = signal(false);
  rucAviso = signal('');

  private consultarRuc(ruc: string, aplicar: (razonSocial: string) => void): void {
    if (!/^\d{11}$/.test(ruc)) {
      this.rucAviso.set('');
      return;
    }
    this.rucBuscando.set(true);
    this.rucAviso.set('');
    this.documentosService.buscarRuc(ruc).subscribe({
      next: (e) => {
        aplicar((e.razonSocial ?? '').trim());
        this.rucBuscando.set(false);
        this.rucAviso.set(e.origen === 'SUNAT' ? 'Razón social obtenida de SUNAT.' : (e.aviso ?? 'Razón social tomada de tus registros.'));
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.rucBuscando.set(false);
        this.rucAviso.set(err?.error?.message ?? 'No se pudo consultar el RUC: escribe la razón social.');
        this.cdr.detectChanges();
      },
    });
  }

  onRucTransportistaGuia(ruc: string): void {
    this.consultarRuc(ruc, (r) => (this.form.transportistaRazonSocial = r));
  }

  onRucDestinatarioGuia(ruc: string): void {
    this.consultarRuc(ruc, (r) => (this.form.destinatarioRazonSocial = r));
  }

  onRucTransportistaMaestro(ruc: string): void {
    this.consultarRuc(ruc, (r) => (this.fTransportista.razonSocial = r));
  }

  onDniConductorGuia(dni: string): void {
    this.consultarReniec(dni, (apellidos, nombres) => {
      this.form.conductorApellidos = apellidos;
      this.form.conductorNombres = nombres;
    });
  }

  onDniConductorMaestro(dni: string): void {
    this.consultarReniec(dni, (apellidos, nombres) => {
      this.fConductor.apellidos = apellidos;
      this.fConductor.nombres = nombres;
    });
  }

  ngOnInit(): void {
    this.cargar();
    this.personasService.getCatalogos().subscribe((c) => this.almacenes.set(c.almacenes));
    this.catalogoService.listProductos('', 1, 5000).subscribe((r) => this.productos.set(r.data));
    this.cargarMaestros();
  }

  // ── Datos maestros de transporte (se eligen al crear la guía y rellenan sus campos) ──
  transportistas = signal<Transportista[]>([]);
  vehiculos = signal<Vehiculo[]>([]);
  conductores = signal<Conductor[]>([]);
  transportistaOpts = computed(() =>
    this.transportistas().filter((t) => t.activo).map((t) => ({ id: t.id, label: `${t.razonSocial} (${t.ruc})` })));
  vehiculoOpts = computed(() =>
    this.vehiculos().filter((v) => v.activo).map((v) => ({ id: v.id, label: v.placa })));
  conductorOpts = computed(() =>
    this.conductores().filter((c) => c.activo).map((c) => ({ id: c.id, label: `${c.apellidos} ${c.nombres} - DNI ${c.numDoc}` })));
  transportistaSel: number | null = null;
  vehiculoSel: number | null = null;
  conductorSel: number | null = null;

  cargarMaestros(): void {
    // Sin permiso de lectura el backend responde 403: simplemente no hay listas para elegir.
    this.service.listTransportistas().subscribe({ next: (r) => this.transportistas.set(r), error: () => {} });
    this.service.listVehiculos().subscribe({ next: (r) => this.vehiculos.set(r), error: () => {} });
    this.service.listConductores().subscribe({ next: (r) => this.conductores.set(r), error: () => {} });
  }

  elegirTransportista(id: number | null): void {
    const t = this.transportistas().find((x) => x.id === id);
    if (!t) return;
    this.form.transportistaRuc = t.ruc;
    this.form.transportistaRazonSocial = t.razonSocial;
  }

  elegirVehiculo(id: number | null): void {
    const v = this.vehiculos().find((x) => x.id === id);
    if (!v) return;
    this.form.vehiculoPlaca = v.placa;
    this.form.vehiculoNroCirculacion = v.nroCirculacion ?? '';
  }

  // ── Conductores y vehículos adicionales (la guía admite principal + secundarios) ──
  secConductorSel: number | null = null;
  secVehiculoSel: number | null = null;

  agregarConductorSec(): void {
    const c = this.conductores().find((x) => x.id === this.secConductorSel);
    if (!c) return;
    if (c.numDoc === this.form.conductorDni || this.form.conductoresSecundarios.some((s) => s.numDoc === c.numDoc)) {
      Swal.fire({ icon: 'info', title: 'Ese conductor ya está en la guía' });
      return;
    }
    this.form.conductoresSecundarios.push({ numDoc: c.numDoc, nombres: c.nombres, apellidos: c.apellidos, licencia: c.licencia });
    this.secConductorSel = null;
  }

  quitarConductorSec(i: number): void {
    this.form.conductoresSecundarios.splice(i, 1);
  }

  agregarVehiculoSec(): void {
    const v = this.vehiculos().find((x) => x.id === this.secVehiculoSel);
    if (!v) return;
    if (v.placa === this.form.vehiculoPlaca || this.form.vehiculosSecundarios.some((s) => s.placa === v.placa)) {
      Swal.fire({ icon: 'info', title: 'Ese vehículo ya está en la guía' });
      return;
    }
    this.form.vehiculosSecundarios.push({ placa: v.placa, nroCirculacion: v.nroCirculacion });
    this.secVehiculoSel = null;
  }

  quitarVehiculoSec(i: number): void {
    this.form.vehiculosSecundarios.splice(i, 1);
  }

  elegirConductor(id: number | null): void {
    const c = this.conductores().find((x) => x.id === id);
    if (!c) return;
    this.form.conductorApellidos = c.apellidos;
    this.form.conductorNombres = c.nombres;
    this.form.conductorDni = c.numDoc;
    this.form.conductorLicencia = c.licencia;
  }

  // ── Gestionar datos maestros ──
  showMaestros = signal(false);
  maestroTab = signal<'conductores' | 'vehiculos' | 'transportistas'>('conductores');
  maestroEditando = signal<number | null | 'nuevo'>(null);
  maestroError = signal('');
  maestroGuardando = signal(false);
  fConductor = { numDoc: '', nombres: '', apellidos: '', licencia: '', activo: true };
  fVehiculo = { placa: '', nroCirculacion: '', activo: true };
  fTransportista = { ruc: '', razonSocial: '', nroMtc: '', activo: true };

  abrirMaestros(): void {
    this.maestroEditando.set(null);
    this.maestroError.set('');
    this.showMaestros.set(true);
  }

  cerrarMaestros(): void {
    this.showMaestros.set(false);
    this.cargarMaestros();
  }

  cambiarTabMaestro(tab: 'conductores' | 'vehiculos' | 'transportistas'): void {
    this.maestroTab.set(tab);
    this.maestroEditando.set(null);
    this.maestroError.set('');
  }

  nuevoMaestro(): void {
    this.fConductor = { numDoc: '', nombres: '', apellidos: '', licencia: '', activo: true };
    this.fVehiculo = { placa: '', nroCirculacion: '', activo: true };
    this.fTransportista = { ruc: '', razonSocial: '', nroMtc: '', activo: true };
    this.maestroError.set('');
    this.maestroEditando.set('nuevo');
  }

  editarConductor(c: Conductor): void {
    this.fConductor = { numDoc: c.numDoc, nombres: c.nombres, apellidos: c.apellidos, licencia: c.licencia, activo: c.activo };
    this.maestroError.set('');
    this.maestroEditando.set(c.id);
  }

  editarVehiculo(v: Vehiculo): void {
    this.fVehiculo = { placa: v.placa, nroCirculacion: v.nroCirculacion ?? '', activo: v.activo };
    this.maestroError.set('');
    this.maestroEditando.set(v.id);
  }

  editarTransportista(t: Transportista): void {
    this.fTransportista = { ruc: t.ruc, razonSocial: t.razonSocial, nroMtc: t.nroMtc ?? '', activo: t.activo };
    this.maestroError.set('');
    this.maestroEditando.set(t.id);
  }

  guardarMaestro(): void {
    const ed = this.maestroEditando();
    if (ed === null) return;
    const id = ed === 'nuevo' ? null : ed;
    this.maestroError.set('');
    this.maestroGuardando.set(true);
    const fin = {
      next: () => {
        this.maestroGuardando.set(false);
        this.maestroEditando.set(null);
        this.cargarMaestros();
      },
      error: (err: { error?: { message?: string } }) => {
        this.maestroGuardando.set(false);
        this.maestroError.set(err?.error?.message ?? 'No se pudo guardar.');
      },
    };
    switch (this.maestroTab()) {
      case 'conductores':
        this.service.guardarConductor(id, this.fConductor).subscribe(fin);
        break;
      case 'vehiculos':
        this.service.guardarVehiculo(id, { ...this.fVehiculo, nroCirculacion: this.fVehiculo.nroCirculacion || null }).subscribe(fin);
        break;
      default:
        this.service.guardarTransportista(id, { ...this.fTransportista, nroMtc: this.fTransportista.nroMtc || null }).subscribe(fin);
    }
  }

  /** Activar/desactivar sin borrar: las guías ya emitidas conservan su copia de los datos. */
  alternarActivo(tipo: 'conductor' | 'vehiculo' | 'transportista', item: Conductor | Vehiculo | Transportista): void {
    const fin = { next: () => this.cargarMaestros(), error: () => {} };
    if (tipo === 'conductor') {
      const { id, ...c } = item as Conductor;
      this.service.guardarConductor(id, { ...c, activo: !c.activo }).subscribe(fin);
    } else if (tipo === 'vehiculo') {
      const { id, ...v } = item as Vehiculo;
      this.service.guardarVehiculo(id, { ...v, activo: !v.activo }).subscribe(fin);
    } else {
      const { id, ...t } = item as Transportista;
      this.service.guardarTransportista(id, { ...t, activo: !t.activo }).subscribe(fin);
    }
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
    this.transportistaSel = this.vehiculoSel = this.conductorSel = null;
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
      this.form.conductorDni = '';
      this.form.conductorApellidos = '';
      this.form.vehiculoNroCirculacion = '';
      this.form.conductoresSecundarios = [];
      this.form.vehiculosSecundarios = [];
      this.vehiculoSel = this.conductorSel = this.secConductorSel = this.secVehiculoSel = null;
    } else {
      this.transportistaSel = null;
      this.form.transportistaRuc = '';
      this.form.transportistaRazonSocial = '';
    }
  }

  /** Dirección, ubigeo y código de establecimiento SUNAT del almacén elegido (vacío si falta alguno). */
  textoAlmacen(id: number | null | undefined): string {
    const a = this.almacenes().find((x) => x.id === id);
    if (!a) return '';
    if (!a.direccion || !a.ubigeo) return `${a.nombre}: falta la dirección o el ubigeo (Almacén / Kardex → Gestionar almacenes)`;
    return `${a.direccion} · ubigeo ${a.ubigeo} · establecimiento ${a.codigoEstablecimientoSunat ?? '0000'}`;
  }

  // ── Importar el listado desde Excel ──────────────────────────────────
  showImport = signal(false);
  importFilas = signal<FilaImport[]>([]);
  importCargando = signal(false);
  private stockOrigen: StockListItem[] = [];

  async onExcelElegido(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    if (!this.form.almacenOrigenId) {
      Swal.fire({ icon: 'info', title: 'Elige primero el almacén de origen', text: 'Hace falta para comprobar el stock de cada producto.' });
      return;
    }
    this.importCargando.set(true);
    try {
      const filas = leerExcel(await archivo.arrayBuffer());
      if (!filas.length) {
        Swal.fire({ icon: 'warning', title: 'No encontré productos', text: 'El Excel debe tener una columna de cantidad y otra con la descripción del producto.' });
        return;
      }
      this.almacenService.listStock(this.form.almacenOrigenId, '', 1, 5000).subscribe({
        next: (r) => this.prepararImport(filas, r.data),
        error: () => this.prepararImport(filas, []),
      });
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo leer el Excel', text: 'Verifica que sea un archivo .xlsx válido.' });
    } finally {
      this.importCargando.set(false);
    }
  }

  private prepararImport(filas: { cantidad: number; descripcion: string }[], stock: StockListItem[]): void {
    this.stockOrigen = stock;
    const catalogo = this.productos();
    this.importFilas.set(
      filas.map((f) => {
        const { base, talla } = extraerTalla(f.descripcion);
        const { exacto: productoId, sugerido } = buscarProducto(base, catalogo);
        const fila: FilaImport = {
          incluir: true, cantidad: f.cantidad, descripcion: f.descripcion, talla,
          productoId, libre: productoId === null, disponible: null, sugerido,
        };
        this.actualizarDisponible(fila);
        return fila;
      }),
    );
    this.showImport.set(true);
  }

  private actualizarDisponible(f: FilaImport): void {
    if (!f.productoId) {
      f.disponible = null;
      return;
    }
    const p = this.productos().find((x) => x.id === f.productoId);
    const talla = p?.requiereTalla ? f.talla : '';
    f.disponible = this.stockOrigen
      .filter((s) => s.productoId === f.productoId && (s.talla || '') === talla && !s.color)
      .reduce((acc, s) => acc + s.cantidadActual, 0);
  }

  usarSugerido(f: FilaImport): void {
    if (!f.sugerido) return;
    f.productoId = f.sugerido.id;
    f.sugerido = null;
    this.onProductoImportCambiado(f);
  }

  onProductoImportCambiado(f: FilaImport): void {
    f.libre = f.productoId === null;
    this.actualizarDisponible(f);
    this.importFilas.update((l) => [...l]);
  }

  get importIncluidas(): number {
    return this.importFilas().filter((f) => f.incluir).length;
  }

  cerrarImport(): void {
    this.showImport.set(false);
  }

  agregarImportadas(): void {
    const unidad = (um: string | undefined) => (um === 'KG' || um === 'KGM' ? 'KGM' : 'NIU');
    const nuevas: GuiaRemisionCreate['items'] = [];
    for (const f of this.importFilas().filter((x) => x.incluir && x.cantidad > 0)) {
      const p = f.productoId ? this.productos().find((x) => x.id === f.productoId) : undefined;
      if (f.libre || !p) {
        nuevas.push({ productoId: null, libre: true, descripcion: f.descripcion, esBienTercero: false, talla: '', color: '', cantidad: f.cantidad, unidadMedida: 'NIU' });
      } else {
        nuevas.push({ productoId: p.id, talla: p.requiereTalla ? f.talla : '', color: '', cantidad: f.cantidad, unidadMedida: unidad(p.unidadMedida) });
      }
    }
    if (!nuevas.length) return;
    // Si la guía solo tenía la fila vacía inicial, se reemplaza.
    const soloVacia = this.form.items.length === 1 && !this.form.items[0].productoId && !this.form.items[0].libre && !this.form.items[0].pedidoItemId;
    this.form.items = soloVacia ? nuevas : [...this.form.items, ...nuevas];
    this.showImport.set(false);
  }

  agregarLineaLibre(): void {
    this.form.items.push({
      productoId: null, libre: true, descripcion: '', esBienTercero: false,
      talla: '', color: '', cantidad: 1, unidadMedida: 'NIU',
    });
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
    const itemsOk = this.form.items.every((i) =>
      i.cantidad > 0 && (i.libre ? !!i.descripcion?.trim() : !!i.productoId));
    if (!itemsOk) return false;
    if (this.form.modalidadTraslado === '01') return !!this.form.transportistaRuc;
    return !!this.form.vehiculoPlaca && !!this.form.conductorNombres?.trim() && !!this.form.conductorApellidos?.trim()
      && !!this.form.conductorLicencia && /^\d{8}$/.test(this.form.conductorDni ?? '');
  }

  guardar(): void {
    if (!this.formValido) return;
    this.error.set('');
    this.guardando.set(true);
    // Las líneas libres viajan sin producto: el backend las trata como "sin inventario".
    const payload: GuiaRemisionCreate = {
      ...this.form,
      items: this.form.items.map((i) =>
        i.libre ? { ...i, productoId: null, talla: '', color: '' } : { ...i, descripcion: undefined, esBienTercero: false }),
    };
    this.service.crear(payload).subscribe({
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
      conductoresSecundarios: [],
      vehiculosSecundarios: [],
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

  descargarPdf(): void {
    const d = this.detalle();
    if (!d) return;
    generarPdfGuia(d).catch(() =>
      Swal.fire({ icon: 'error', title: 'No se pudo generar el PDF', text: 'Intenta de nuevo.' }),
    );
  }

  eliminar(): void {
    const id = this.detalle()?.id;
    if (!id) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar esta guía?',
      text: 'Se devuelve el stock que movió la guía y se borra. No se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Volver',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.eliminando.set(true);
      this.service.eliminar(id).subscribe({
        next: () => {
          this.eliminando.set(false);
          this.showDetalle.set(false);
          this.cargar();
          Swal.fire({ icon: 'success', title: 'Guía eliminada' });
        },
        error: (err) => {
          this.eliminando.set(false);
          Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: err?.error?.message ?? 'Error del servidor.' });
        },
      });
    });
  }

  anular(): void {
    const id = this.detalle()?.id;
    if (!id) return;
    Swal.fire({
      icon: 'warning',
      title: 'Anular guía',
      html: `
        <p style="font-size:12.5px;text-align:left;margin:0 0 8px">
          <b>Primero</b> da la baja en SUNAT (SOL → Empresas → Guía de Remisión electrónica → Baja de GRE).
          SUNAT no permite hacerla desde el sistema ni verificarla, así que acá se registra con la constancia que te entregue.
        </p>
        <p style="font-size:12.5px;text-align:left;margin:0 0 8px">
          Al anular se devuelve el stock y el avance del pedido; la guía queda <b>ANULADA</b> y no se borra.
        </p>
        <label style="display:block;text-align:left;font-size:12px;margin:8px 0 2px">N.º de constancia de baja de SOL</label>
        <input id="swal-anu-constancia" type="text" class="swal2-input" style="margin:0" maxlength="60">
        <label style="display:block;text-align:left;font-size:12px;margin:8px 0 2px">Motivo de la anulación</label>
        <input id="swal-anu-motivo" type="text" class="swal2-input" style="margin:0" maxlength="300">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Anular guía',
      cancelButtonText: 'Volver',
      preConfirm: () => {
        const constanciaBaja = (document.getElementById('swal-anu-constancia') as HTMLInputElement).value.trim();
        const motivo = (document.getElementById('swal-anu-motivo') as HTMLInputElement).value.trim();
        if (constanciaBaja.length < 3 || motivo.length < 5) {
          Swal.showValidationMessage('Completa la constancia de baja y el motivo (mínimo 5 caracteres).');
          return false;
        }
        return { constanciaBaja, motivo };
      },
    }).then((res) => {
      if (!res.isConfirmed || !res.value) return;
      this.eliminando.set(true);
      this.service.anular(id, res.value).subscribe({
        next: () => {
          this.eliminando.set(false);
          this.showDetalle.set(false);
          this.cargar();
          Swal.fire({ icon: 'success', title: 'Guía anulada' });
        },
        error: (err) => {
          this.eliminando.set(false);
          Swal.fire({ icon: 'error', title: 'No se pudo anular', text: err?.error?.message ?? 'Error del servidor.' });
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
