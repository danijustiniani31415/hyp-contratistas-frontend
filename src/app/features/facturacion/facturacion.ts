import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { FabButton } from '../../shared/components/fab-button/fab-button';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import {
  CpeAviso,
  CpeCreate,
  CpeDetalle,
  CpeItem,
  CpeListItem,
  CpeSerie,
  FacturacionService,
} from '../../core/services/facturacion.service';
import { generarPdfCpe } from './cpe-pdf';
import { PersonasService } from '../../core/services/personas.service';
import { Contrato, PedidosService } from '../../core/services/pedidos.service';
import { DocumentosService } from '../../core/services/documentos.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

const ESTADOS = [
  { id: 'BORRADOR', nombre: 'Borrador' },
  { id: 'ACEPTADO', nombre: 'Aceptado' },
  { id: 'ACEPTADO_OBS', nombre: 'Aceptado con observaciones' },
  { id: 'RECHAZADO', nombre: 'Rechazado' },
  { id: 'BAJA_PENDIENTE', nombre: 'Baja pendiente' },
  { id: 'ANULADO', nombre: 'Anulado' },
];

const TIPOS = [
  { id: '01', nombre: 'Factura' },
  { id: '07', nombre: 'Nota de crédito' },
  { id: '08', nombre: 'Nota de débito' },
];

/** Catálogo 09 (notas de crédito) y 10 (notas de débito) de SUNAT. */
const MOTIVOS_NC = [
  { id: '01', nombre: 'Anulación de la operación' },
  { id: '02', nombre: 'Anulación por error en el RUC' },
  { id: '03', nombre: 'Corrección por error en la descripción' },
  { id: '04', nombre: 'Descuento global' },
  { id: '05', nombre: 'Descuento por ítem' },
  { id: '06', nombre: 'Devolución total' },
  { id: '07', nombre: 'Devolución por ítem' },
  { id: '08', nombre: 'Bonificación' },
  { id: '09', nombre: 'Disminución en el valor' },
  { id: '10', nombre: 'Otros conceptos' },
  { id: '13', nombre: 'Ajustes de montos y/o fechas de pago' },
];
const MOTIVOS_ND = [
  { id: '01', nombre: 'Intereses por mora' },
  { id: '02', nombre: 'Aumento en el valor' },
  { id: '03', nombre: 'Penalidades / otros conceptos' },
];

const UNIDADES = [
  { id: 'NIU', nombre: 'Unidad (NIU)' },
  { id: 'ZZ', nombre: 'Servicio (ZZ)' },
  { id: 'KGM', nombre: 'Kilogramo (KGM)' },
  { id: 'MTR', nombre: 'Metro (MTR)' },
  { id: 'MTK', nombre: 'Metro cuadrado (MTK)' },
  { id: 'MTQ', nombre: 'Metro cúbico (MTQ)' },
  { id: 'LTR', nombre: 'Litro (LTR)' },
  { id: 'GLL', nombre: 'Galón (GLL)' },
  { id: 'BX', nombre: 'Caja (BX)' },
  { id: 'PR', nombre: 'Par (PR)' },
  { id: 'TNE', nombre: 'Tonelada (TNE)' },
  { id: 'HUR', nombre: 'Hora (HUR)' },
  { id: 'DAY', nombre: 'Día (DAY)' },
  { id: 'MON', nombre: 'Mes (MON)' },
];

const AFECTACIONES = [
  { id: '10', nombre: 'Gravado (IGV 18%)' },
  { id: '20', nombre: 'Exonerado' },
  { id: '30', nombre: 'Inafecto' },
  { id: '40', nombre: 'Exportación' },
];

/** Catálogo 54 de SUNAT: solo los más usados por una constructora. [VERIFICAR] porcentajes vigentes en los anexos de detracciones. */
const DETRACCIONES = [
  { codigo: '037', nombre: 'Demás servicios gravados con el IGV', porcentaje: 12 },
  { codigo: '025', nombre: 'Contratos de construcción', porcentaje: 4 },
  { codigo: '019', nombre: 'Arrendamiento de bienes', porcentaje: 10 },
  { codigo: '022', nombre: 'Otros servicios empresariales', porcentaje: 12 },
];

const TIPOS_DOC_CLIENTE = [
  { id: '6', nombre: 'RUC' },
  { id: '1', nombre: 'DNI' },
  { id: '4', nombre: 'Carnet de extranjería' },
  { id: '7', nombre: 'Pasaporte' },
  { id: '0', nombre: 'Sin documento' },
];

const IGV = 0.18;
const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

function hoyPeru(): string {
  const d = new Date(Date.now() - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function itemVacio(): CpeItem {
  return { codigo: '', descripcion: '', unidadMedida: 'ZZ', cantidad: 1, precioUnitario: 0, descuento: 0, afectacionIgv: '10' };
}

function formVacio(): CpeCreate {
  return {
    tipoDocumento: '01',
    fechaEmision: hoyPeru(),
    fechaVencimiento: null,
    moneda: 'PEN',
    tipoCambio: null,
    tipoOperacion: '0101',
    clienteTipoDoc: '6',
    clienteNumeroDoc: '',
    clienteRazon: '',
    clienteDireccion: '',
    clientePais: '',
    preciosIncluyenIgv: false,
    formaPago: 'CONTADO',
    cuotas: [],
    detraccionCodigo: null,
    detraccionPorcentaje: null,
    detraccionCuenta: '',
    refCpeId: null,
    motivoCodigo: null,
    motivoDescripcion: '',
    observacion: '',
    ordenCompraRef: '',
    guiaRef: '',
    items: [itemVacio()],
  };
}

/**
 * Facturación electrónica SUNAT: factura, nota de crédito, nota de débito y baja. El backend calcula y valida
 * todo de verdad; los totales de esta pantalla son una vista previa con las mismas reglas.
 */
@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, FabButton, Paginator, LbPageHeader],
  templateUrl: './facturacion.html',
  styleUrl: './facturacion.css',
})
export class Facturacion implements OnInit {
  readonly estados = ESTADOS;
  readonly tipos = TIPOS;
  readonly unidades = UNIDADES;
  readonly afectaciones = AFECTACIONES;
  readonly detracciones = DETRACCIONES;
  readonly tiposDocCliente = TIPOS_DOC_CLIENTE;

  comprobantes = signal<CpeListItem[]>([]);
  loading = signal(false);
  page = signal(1);
  pageSize = 20;
  totalRecords = signal(0);
  totalPages = signal(1);
  search = '';
  estadoFiltro = '';
  tipoFiltro = '';
  private buscarTimer: ReturnType<typeof setTimeout> | null = null;

  // Formulario
  showForm = signal(false);
  form: CpeCreate = formVacio();
  editandoId: number | null = null;
  refIdentificador = '';
  guardando = signal(false);
  error = signal('');
  avisosForm = signal<CpeAviso[]>([]);
  rucBuscando = signal(false);
  rucAviso = signal('');

  // Detalle
  showDetalle = signal(false);
  detalle = signal<CpeDetalle | null>(null);
  trabajando = signal(false);

  // Series
  showSeries = signal(false);
  series = signal<CpeSerie[]>([]);
  serieNueva = { tipoDocumento: '01', serie: '', ultimoNumero: 0 };
  errorSeries = signal('');

  constructor(
    private service: FacturacionService,
    private documentosService: DocumentosService,
    private personasService: PersonasService,
    private pedidosService: PedidosService,
    public authService: LbAuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  proyectos = signal<{ id: number; nombre: string }[]>([]);
  contratos = signal<Contrato[]>([]);

  ngOnInit(): void {
    this.cargar();
    this.personasService.getCatalogos().subscribe((c) => this.proyectos.set(c.proyectos.map((p: any) => ({ id: p.id, nombre: p.nombre }))));
  }

  /** Al elegir proyecto se cargan sus contratos; el contrato es opcional y permite luego cruzar facturación con costos. */
  onProyecto(id: number | null): void {
    this.form.proyectoId = id;
    this.form.contratoId = null;
    this.contratos.set([]);
    if (id) this.pedidosService.listContratos(id).subscribe((c) => this.contratos.set(c.filter((x) => x.activo)));
  }

  // ── Lista ───────────────────────────────────────────────────────────────
  cargar(): void {
    this.loading.set(true);
    this.service.list(this.search.trim(), this.estadoFiltro, this.tipoFiltro, this.page(), this.pageSize).subscribe({
      next: (r) => {
        this.comprobantes.set(r.data);
        this.totalRecords.set(r.totalRecords);
        this.totalPages.set(Math.max(1, Math.ceil(r.totalRecords / this.pageSize)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearchInput(): void {
    if (this.buscarTimer) clearTimeout(this.buscarTimer);
    this.buscarTimer = setTimeout(() => {
      this.page.set(1);
      this.cargar();
    }, 350);
  }

  onFiltroChange(): void {
    this.page.set(1);
    this.cargar();
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.cargar();
  }

  nombreTipo(id: string): string {
    return TIPOS.find((t) => t.id === id)?.nombre ?? id;
  }

  nombreEstado(id: string): string {
    return ESTADOS.find((e) => e.id === id)?.nombre ?? id;
  }

  private msg(err: any, porDefecto: string): string {
    return err?.error?.message ?? porDefecto;
  }

  // ── Formulario ──────────────────────────────────────────────────────────
  abrirNuevo(): void {
    this.form = formVacio();
    this.editandoId = null;
    this.refIdentificador = '';
    this.error.set('');
    this.avisosForm.set([]);
    this.rucAviso.set('');
    this.contratos.set([]);
    this.showForm.set(true);
  }

  abrirEditar(d: CpeDetalle): void {
    this.form = {
      tipoDocumento: d.tipoDocumento,
      serie: d.serie,
      fechaEmision: d.fechaEmision,
      fechaVencimiento: d.fechaVencimiento,
      moneda: d.moneda,
      tipoCambio: d.tipoCambio,
      tipoOperacion: d.tipoOperacion === '1001' ? '0101' : d.tipoOperacion,
      clienteTipoDoc: d.clienteTipoDoc,
      clienteNumeroDoc: d.clienteNumeroDoc,
      clienteRazon: d.clienteRazon,
      clienteDireccion: d.clienteDireccion ?? '',
      clientePais: d.clientePais ?? '',
      preciosIncluyenIgv: d.preciosIncluyenIgv,
      formaPago: d.formaPago,
      cuotas: d.cuotas.map((c) => ({ ...c })),
      detraccionCodigo: d.detraccionCodigo,
      detraccionPorcentaje: d.detraccionPorcentaje,
      detraccionCuenta: d.detraccionCuenta ?? '',
      refCpeId: d.refCpeId,
      motivoCodigo: d.motivoCodigo,
      motivoDescripcion: d.motivoDescripcion ?? '',
      observacion: d.observacion ?? '',
      ordenCompraRef: d.ordenCompraRef ?? '',
      guiaRef: d.guiaRef ?? '',
      contratoId: d.contratoId,
      proyectoId: d.proyectoId,
      items: d.items.map((i) => ({
        codigo: i.codigo ?? '',
        descripcion: i.descripcion,
        unidadMedida: i.unidadMedida,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        descuento: i.descuento,
        afectacionIgv: i.afectacionIgv,
        productoId: i.productoId,
        partidaId: i.partidaId,
      })),
    };
    this.editandoId = d.id;
    this.refIdentificador = d.refIdentificador ?? '';
    this.error.set('');
    this.avisosForm.set(d.avisos);
    this.rucAviso.set('');
    this.showDetalle.set(false);
    this.contratos.set([]);
    if (d.proyectoId) this.pedidosService.listContratos(d.proyectoId).subscribe((c) => this.contratos.set(c.filter((x) => x.activo)));
    this.showForm.set(true);
  }

  /** Nota de crédito o de débito sobre una factura aceptada: nace con los datos y las líneas de la factura. */
  abrirNota(d: CpeDetalle, tipo: '07' | '08'): void {
    this.form = {
      ...formVacio(),
      tipoDocumento: tipo,
      moneda: d.moneda,
      tipoCambio: d.tipoCambio,
      clienteTipoDoc: d.clienteTipoDoc,
      clienteNumeroDoc: d.clienteNumeroDoc,
      clienteRazon: d.clienteRazon,
      clienteDireccion: d.clienteDireccion ?? '',
      preciosIncluyenIgv: d.preciosIncluyenIgv,
      refCpeId: d.id,
      contratoId: d.contratoId,
      proyectoId: d.proyectoId,
      items: d.items.map((i) => ({
        codigo: i.codigo ?? '',
        descripcion: i.descripcion,
        unidadMedida: i.unidadMedida,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        descuento: i.descuento,
        afectacionIgv: i.afectacionIgv,
      })),
    };
    this.editandoId = null;
    this.refIdentificador = d.identificador;
    this.error.set('');
    this.avisosForm.set([]);
    this.rucAviso.set('');
    this.rucBuscando.set(false);
    this.contratos.set([]);
    this.showDetalle.set(false);
    this.showForm.set(true);
  }

  cerrarForm(): void {
    this.showForm.set(false);
  }

  get esNota(): boolean {
    return this.form.tipoDocumento === '07' || this.form.tipoDocumento === '08';
  }

  get motivos() {
    return this.form.tipoDocumento === '08' ? MOTIVOS_ND : MOTIVOS_NC;
  }

  get esExportacion(): boolean {
    return this.form.tipoOperacion === '0200';
  }

  cambioTipoOperacion(): void {
    // En exportación todo va con afectación 40 y el cliente no usa RUC.
    const exp = this.esExportacion;
    this.form.items.forEach((i) => (i.afectacionIgv = exp ? '40' : i.afectacionIgv === '40' ? '10' : i.afectacionIgv));
    if (exp && this.form.clienteTipoDoc === '6') this.form.clienteTipoDoc = '4';
    if (!exp && this.form.clienteTipoDoc !== '6') this.form.clienteTipoDoc = '6';
  }

  agregarLinea(): void {
    const l = itemVacio();
    if (this.esExportacion) l.afectacionIgv = '40';
    this.form.items.push(l);
  }

  quitarLinea(i: number): void {
    if (this.form.items.length > 1) this.form.items.splice(i, 1);
  }

  /** Vista previa con las mismas reglas del backend (el backend recalcula al guardar). */
  linea(i: CpeItem): { valorUnitario: number; valorVenta: number; igv: number } {
    const gravada = i.afectacionIgv.startsWith('1');
    const valorUnitario = gravada && this.form.preciosIncluyenIgv ? i.precioUnitario / (1 + IGV) : i.precioUnitario;
    const valorVenta = r2((i.cantidad || 0) * valorUnitario - (i.descuento || 0));
    return { valorUnitario, valorVenta, igv: gravada ? r2(valorVenta * IGV) : 0 };
  }

  get resumen() {
    let gravado = 0, exonerado = 0, inafecto = 0, exportacion = 0, igv = 0;
    for (const it of this.form.items) {
      const l = this.linea(it);
      switch (it.afectacionIgv[0]) {
        case '1': gravado += l.valorVenta; break;
        case '2': exonerado += l.valorVenta; break;
        case '3': inafecto += l.valorVenta; break;
        default: exportacion += l.valorVenta;
      }
      igv += l.igv;
    }
    const total = r2(gravado + exonerado + inafecto + exportacion + igv);
    const soles = this.form.moneda === 'USD' && this.form.tipoCambio ? total * this.form.tipoCambio : total;
    const detraccion = this.form.detraccionCodigo && this.form.detraccionPorcentaje
      ? Math.round((soles * this.form.detraccionPorcentaje) / 100)
      : null;
    return { gravado: r2(gravado), exonerado: r2(exonerado), inafecto: r2(inafecto), exportacion: r2(exportacion), igv: r2(igv), total, detraccion };
  }

  get totalCuotas(): number {
    return r2((this.form.cuotas ?? []).reduce((s, c) => s + (Number(c.monto) || 0), 0));
  }

  /** Lo que se paga a crédito: el total menos la detracción en soles (cuando factura en soles). */
  get montoCredito(): number {
    const r = this.resumen;
    return r2(r.total - (this.form.moneda === 'PEN' ? (r.detraccion ?? 0) : 0));
  }

  cuotaUnica(dias: number): void {
    const f = new Date(`${this.form.fechaEmision ?? hoyPeru()}T00:00:00`);
    f.setDate(f.getDate() + dias);
    this.form.cuotas = [{ monto: this.montoCredito, fecha: f.toISOString().slice(0, 10) }];
  }

  agregarCuota(): void {
    (this.form.cuotas ??= []).push({ monto: 0, fecha: this.form.fechaEmision ?? hoyPeru() });
  }

  quitarCuota(i: number): void {
    this.form.cuotas?.splice(i, 1);
  }

  cambioFormaPago(): void {
    if (this.form.formaPago !== 'CREDITO') this.form.cuotas = [];
  }

  cambioDetraccion(activa: boolean): void {
    if (activa) {
      const d = DETRACCIONES[0];
      this.form.detraccionCodigo = d.codigo;
      this.form.detraccionPorcentaje = d.porcentaje;
    } else {
      this.form.detraccionCodigo = null;
      this.form.detraccionPorcentaje = null;
    }
  }

  elegirDetraccion(codigo: string): void {
    const d = DETRACCIONES.find((x) => x.codigo === codigo);
    this.form.detraccionCodigo = codigo;
    if (d) this.form.detraccionPorcentaje = d.porcentaje;
  }

  onRucCliente(ruc: string): void {
    if (this.form.clienteTipoDoc !== '6' || !/^\d{11}$/.test(ruc)) {
      this.rucAviso.set('');
      return;
    }
    this.rucBuscando.set(true);
    this.rucAviso.set('');
    this.documentosService.buscarRuc(ruc).subscribe({
      next: (e) => {
        if (e.razonSocial) this.form.clienteRazon = e.razonSocial;
        this.rucBuscando.set(false);
        this.rucAviso.set('Razón social obtenida de SUNAT. Completa la dirección si hace falta.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.rucBuscando.set(false);
        this.rucAviso.set(err?.error?.message ?? 'No se pudo consultar el RUC: escribe la razón social.');
        this.cdr.detectChanges();
      },
    });
  }

  /** Datos que viajan al backend: sin vacíos que no significan nada. */
  private payload(): CpeCreate {
    const f = this.form;
    return {
      ...f,
      serie: f.serie || null,
      fechaVencimiento: f.fechaVencimiento || null,
      tipoCambio: f.moneda === 'USD' ? f.tipoCambio : null,
      clienteDireccion: f.clienteDireccion || null,
      clientePais: this.esExportacion ? f.clientePais || null : null,
      cuotas: f.formaPago === 'CREDITO' ? f.cuotas : null,
      detraccionCuenta: f.detraccionCodigo ? f.detraccionCuenta || null : null,
      motivoDescripcion: this.esNota ? f.motivoDescripcion || null : null,
      motivoCodigo: this.esNota ? f.motivoCodigo : null,
      refCpeId: this.esNota ? f.refCpeId : null,
      observacion: f.observacion || null,
      ordenCompraRef: f.ordenCompraRef || null,
      guiaRef: f.guiaRef || null,
      items: f.items.map((i) => ({ ...i, codigo: i.codigo || null })),
    };
  }

  guardar(emitirDespues: boolean): void {
    if (this.guardando()) return;
    this.error.set('');
    this.guardando.set(true);
    const dto = this.payload();
    const req = this.editandoId ? this.service.actualizar(this.editandoId, dto) : this.service.crear(dto);
    req.subscribe({
      next: (d) => {
        this.guardando.set(false);
        this.cargar();
        this.cdr.detectChanges();
        const errores = d.avisos.filter((a) => a.nivel === 'ERROR');
        if (emitirDespues) {
          if (errores.length) {
            // Queda guardado como borrador, pero no se puede emitir todavía.
            this.editandoId = d.id;
            this.avisosForm.set(d.avisos);
            this.error.set('Se guardó el borrador, pero no se puede emitir: corrige lo marcado en rojo.');
            return;
          }
          this.showForm.set(false);
          this.emitir(d);
        } else {
          this.editandoId = d.id;
          this.avisosForm.set(d.avisos);
          this.showForm.set(false);
          this.abrirDetalleDe(d);
        }
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(this.msg(err, 'No se pudo guardar el comprobante.'));
        this.cdr.detectChanges();
      },
    });
  }

  // ── Detalle ─────────────────────────────────────────────────────────────
  verDetalle(id: number): void {
    this.service.get(id).subscribe({
      next: (d) => this.abrirDetalleDe(d),
      error: (err) => Swal.fire({ icon: 'error', title: 'No se pudo abrir', text: this.msg(err, 'Intenta de nuevo.') }),
    });
  }

  private abrirDetalleDe(d: CpeDetalle): void {
    this.detalle.set(d);
    this.showDetalle.set(true);
    this.cdr.detectChanges();
  }

  cerrarDetalle(): void {
    this.showDetalle.set(false);
  }

  get puedeCrear(): boolean {
    return this.authService.hasPermiso('FACTURACION_CREAR');
  }

  get puedeEmitir(): boolean {
    return this.authService.hasPermiso('FACTURACION_EMITIR');
  }

  async emitir(d: CpeDetalle): Promise<void> {
    const prod = d.ambiente === 'Produccion';
    const r = await Swal.fire({
      icon: prod ? 'warning' : 'question',
      title: prod ? 'Emitir comprobante REAL' : 'Emitir en ambiente de pruebas',
      html: prod
        ? `Se emitirá <b>${this.nombreTipo(d.tipoDocumento)}</b> por <b>${d.moneda} ${d.total.toFixed(2)}</b> a <b>${d.clienteRazon}</b>.<br><br>Tiene valor tributario y <b>no se puede borrar</b>: solo se anula con baja o nota de crédito.`
        : `Se enviará al <b>Beta de SUNAT</b> (pruebas, sin valor tributario).<br>${this.nombreTipo(d.tipoDocumento)} por ${d.moneda} ${d.total.toFixed(2)}.`,
      showCancelButton: true,
      confirmButtonText: prod ? 'Sí, emitir' : 'Enviar a pruebas',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;
    this.trabajando.set(true);
    this.service.emitir(d.id).subscribe({
      next: (res) => {
        this.trabajando.set(false);
        this.cargar();
        this.abrirDetalleDe(res);
        const ok = res.estado === 'ACEPTADO' || res.estado === 'ACEPTADO_OBS';
        Swal.fire({
          icon: ok ? 'success' : 'error',
          title: ok ? `${res.identificador} aceptada` : `${res.identificador} rechazada`,
          text: res.sunatDescripcion ?? '',
        });
      },
      error: (err) => {
        this.trabajando.set(false);
        Swal.fire({ icon: 'error', title: 'No se pudo emitir', text: this.msg(err, 'Intenta de nuevo.') });
        this.cdr.detectChanges();
      },
    });
  }

  async pedirNumeroNuevo(d: CpeDetalle): Promise<void> {
    const r = await Swal.fire({
      icon: 'question',
      title: '¿Pedir un número nuevo?',
      html: `SUNAT rechazó <b>${d.identificador}</b>. Se liberará ese número y, al reenviar, el comprobante tomará el <b>siguiente libre</b>.<br><br>Úsalo cuando el rechazo sea porque el número ya existe (otro sistema usa la misma serie). Si fue por un dato mal puesto, mejor corrige y reenvía con el mismo número.`,
      showCancelButton: true,
      confirmButtonText: 'Pedir número nuevo',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;
    this.trabajando.set(true);
    this.service.numeroNuevo(d.id).subscribe({
      next: (res) => {
        this.trabajando.set(false);
        this.cargar();
        this.abrirDetalleDe(res);
      },
      error: (err) => {
        this.trabajando.set(false);
        Swal.fire({ icon: 'error', title: 'No se pudo', text: this.msg(err, 'Intenta de nuevo.') });
        this.cdr.detectChanges();
      },
    });
  }

  async eliminar(d: CpeDetalle): Promise<void> {
    const r = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar el borrador?',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;
    this.service.eliminar(d.id).subscribe({
      next: () => {
        this.showDetalle.set(false);
        this.cargar();
      },
      error: (err) => Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: this.msg(err, 'Intenta de nuevo.') }),
    });
  }

  async darDeBaja(d: CpeDetalle): Promise<void> {
    const r = await Swal.fire({
      icon: 'warning',
      title: `Dar de baja ${d.identificador}`,
      html: 'SUNAT anulará el comprobante. Si ya pasó el plazo de la baja, corresponde una nota de crédito.',
      input: 'text',
      inputLabel: 'Motivo de la baja',
      inputValidator: (v) => (v.trim() ? null : 'Indica el motivo'),
      showCancelButton: true,
      confirmButtonText: 'Dar de baja',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;
    this.trabajando.set(true);
    this.service.baja(d.id, String(r.value).trim()).subscribe({
      next: (res) => {
        this.trabajando.set(false);
        this.cargar();
        this.abrirDetalleDe(res);
      },
      error: (err) => {
        this.trabajando.set(false);
        Swal.fire({ icon: 'error', title: 'No se pudo dar de baja', text: this.msg(err, 'Intenta de nuevo.') });
        this.cdr.detectChanges();
      },
    });
  }

  consultarBaja(d: CpeDetalle): void {
    this.trabajando.set(true);
    this.service.consultarBaja(d.id).subscribe({
      next: (res) => {
        this.trabajando.set(false);
        this.cargar();
        this.abrirDetalleDe(res);
        if (res.estado === 'BAJA_PENDIENTE')
          Swal.fire({ icon: 'info', title: 'SUNAT aún no responde', text: 'La baja sigue en proceso. Vuelve a consultar en unos minutos.' });
      },
      error: (err) => {
        this.trabajando.set(false);
        Swal.fire({ icon: 'error', title: 'No se pudo consultar', text: this.msg(err, 'Intenta de nuevo.') });
        this.cdr.detectChanges();
      },
    });
  }

  imprimir(d: CpeDetalle): void {
    generarPdfCpe(d);
  }

  descargar(d: CpeDetalle, que: 'xml' | 'cdr'): void {
    this.service.descargar(d.id, que, d.identificador);
  }

  // ── Series ──────────────────────────────────────────────────────────────
  abrirSeries(): void {
    this.errorSeries.set('');
    this.service.series().subscribe((s) => {
      this.series.set(s);
      this.showSeries.set(true);
    });
  }

  guardarSerie(s: { tipoDocumento: string; serie: string; ultimoNumero: number; activa?: boolean }): void {
    this.errorSeries.set('');
    this.service.guardarSerie({ tipoDocumento: s.tipoDocumento, serie: s.serie, ultimoNumero: Number(s.ultimoNumero) || 0, activa: s.activa ?? true }).subscribe({
      next: () => {
        this.serieNueva = { tipoDocumento: '01', serie: '', ultimoNumero: 0 };
        this.service.series().subscribe((x) => {
          this.series.set(x);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.errorSeries.set(this.msg(err, 'No se pudo guardar la serie.'));
        this.cdr.detectChanges();
      },
    });
  }

  esError(a: CpeAviso): boolean {
    return a.nivel === 'ERROR';
  }
}
