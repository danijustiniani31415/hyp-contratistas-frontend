import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import {
  ComprasService,
  ComprobanteAdvertencia,
  ComprobanteGuardar,
  ComprobanteLectura,
  Proveedor,
} from '../../../core/services/compras.service';
import { AlmacenCatalogoItem } from '../../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../../core/services/catalogo.service';
import { CatalogoValorService } from '../../../core/services/catalogo-valor.service';
import { extraerTalla } from '../../guias-remision/guia-excel-import';
import {
  AliasProducto,
  buscarPorAlias,
  buscarProducto,
  marcasConocidas,
  separarColor,
  separarMarca,
} from '../../guias-remision/producto-matching';

interface FilaComprobante {
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  total: number;
  /** STOCK, GASTO, ACTIVO o RENDICION. */
  destino: string;
  productoId: number | null;
  talla: string;
  color: string;
  categoriaGasto: string;
  /** Producto parecido que el sistema sugiere pero que una persona debe confirmar. */
  sugerido: { id: number; nombre: string; porcentaje: number; otraMarca: boolean } | null;
}

const DESTINO_POR_CATEGORIA: Record<string, string> = {
  BIEN: 'STOCK',
  SERVICIO: 'GASTO',
  PASAJE_VIATICO: 'RENDICION',
  ACTIVO: 'ACTIVO',
  OTRO: 'GASTO',
};

const TIPOS = [
  { id: 'FACTURA', nombre: 'Factura' },
  { id: 'BOLETA', nombre: 'Boleta' },
  { id: 'NOTA_CREDITO', nombre: 'Nota de crédito' },
  { id: 'NOTA_DEBITO', nombre: 'Nota de débito' },
  { id: 'RECIBO_HONORARIOS', nombre: 'Recibo por honorarios' },
  { id: 'TICKET', nombre: 'Ticket' },
  { id: 'INVOICE_EXTRANJERO', nombre: 'Invoice del extranjero' },
  { id: 'GUIA_REMISION', nombre: 'Guía de remisión' },
  { id: 'OTRO', nombre: 'Otro' },
];

const SIN_STOCK = ['NOTA_CREDITO', 'NOTA_DEBITO', 'GUIA_REMISION'];

/**
 * Carga de un comprobante de compra (factura, boleta, nota…): se sube el PDF o la foto, la IA lo lee y
 * una persona lo confirma. Al guardar, las líneas de mercadería ingresan al kardex y el resto queda como gasto.
 */
@Component({
  selector: 'app-comprobante-carga',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './comprobante-carga.html',
  styleUrl: './comprobante-carga.css',
})
export class ComprobanteCarga implements OnInit {
  @Input() proveedores: Proveedor[] = [];
  @Input() almacenes: AlmacenCatalogoItem[] = [];
  @Input() productos: ProductoListItem[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  tipos = TIPOS;
  leyendo = signal(false);
  guardando = signal(false);
  error = signal('');
  lectura = signal<ComprobanteLectura | null>(null);
  filas = signal<FilaComprobante[]>([]);
  advertencias = signal<ComprobanteAdvertencia[]>([]);

  private colores: string[] = [];
  private alias: AliasProducto[] = [];

  cab = {
    tipo: 'FACTURA',
    serie: '',
    numero: '',
    fechaEmision: '',
    moneda: 'PEN',
    tipoCambio: null as number | null,
    subtotal: 0,
    igv: 0,
    total: 0,
    formaPago: '',
    detraccionMonto: null as number | null,
    ordenCompraRef: '',
    guiaRef: '',
    observacion: '',
    proveedorId: null as number | null,
    proveedorRuc: '',
    proveedorRazon: '',
    almacenId: null as number | null,
  };

  constructor(
    private service: ComprasService,
    private catalogoService: CatalogoService,
    private catalogoValorService: CatalogoValorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.catalogoValorService.list('COLOR').subscribe((v) => (this.colores = v.filter((x) => x.activo).map((x) => x.valor)));
    this.catalogoService.listAlias().subscribe((a) => (this.alias = a));
  }

  // ── Paso 1: subir y leer ─────────────────────────────────────────────
  onArchivo(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    if (archivo.size > 15 * 1024 * 1024) {
      this.error.set('El archivo pesa más de 15 MB.');
      return;
    }
    this.error.set('');
    this.leyendo.set(true);
    this.reducirFoto(archivo).then((listo) =>
      this.service.leerComprobante(listo).subscribe({
        next: (res) => {
          this.aplicar(res);
          this.leyendo.set(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.leyendo.set(false);
          this.error.set(
            err?.error?.message ??
              (err?.status === 413 ? 'El archivo es demasiado pesado para subirlo.' : 'No se pudo leer el documento.'),
          );
          this.cdr.detectChanges();
        },
      }),
    );
  }

  /**
   * Las fotos del celular pesan varios MB y no hace falta tanto para leer un comprobante: se reducen a
   * un máximo de 2000 px de lado en JPEG (unos 300–800 KB) antes de subirlas. Los PDF se suben tal cual.
   */
  private async reducirFoto(archivo: File): Promise<File> {
    const LIMITE = 900 * 1024;
    if (!archivo.type.startsWith('image/') || archivo.size <= LIMITE) return archivo;
    try {
      const bmp = await createImageBitmap(archivo);
      const escala = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * escala);
      canvas.height = Math.round(bmp.height * escala);
      canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      bmp.close();
      let ultimo: Blob | null = null;
      for (const calidad of [0.82, 0.7, 0.55]) {
        ultimo = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', calidad));
        if (ultimo && ultimo.size <= LIMITE) break;
      }
      if (!ultimo || ultimo.size >= archivo.size) return archivo;
      return new File([ultimo], archivo.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch {
      // Formato que el navegador no puede abrir (p. ej. HEIC en algunos equipos): se sube el original.
      return archivo;
    }
  }

  private aplicar(res: ComprobanteLectura): void {
    const l = res.lectura;
    this.cab = {
      tipo: this.tipos.some((t) => t.id === l.tipo) ? l.tipo : 'OTRO',
      serie: l.serie ?? '',
      numero: l.numero ?? '',
      fechaEmision: l.fechaEmision ?? '',
      moneda: l.moneda === 'USD' ? 'USD' : 'PEN',
      tipoCambio: null,
      subtotal: l.subtotal,
      igv: l.igv,
      total: l.total,
      formaPago: l.formaPago ?? '',
      detraccionMonto: l.detraccionMonto,
      ordenCompraRef: l.ordenCompraRef ?? '',
      guiaRef: l.guiaRef ?? '',
      observacion: l.observacion ?? '',
      proveedorId: res.proveedorId,
      proveedorRuc: l.emisorRuc ?? '',
      proveedorRazon: l.emisorRazonSocial ?? '',
      almacenId: this.almacenes.length === 1 ? this.almacenes[0].id : null,
    };

    const conocidas = marcasConocidas(this.productos);
    this.filas.set(
      l.items.map((it) => {
        const destino = SIN_STOCK.includes(this.cab.tipo) ? 'GASTO' : (DESTINO_POR_CATEGORIA[it.categoria] ?? 'GASTO');
        const fila: FilaComprobante = {
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          unidad: it.unidad ?? '',
          precioUnitario: it.precioUnitario,
          total: it.total,
          destino,
          productoId: null,
          talla: '',
          color: '',
          categoriaGasto: '',
          sugerido: null,
        };
        if (destino === 'STOCK') this.reconocer(fila, conocidas);
        return fila;
      }),
    );
    this.advertencias.set(res.advertencias);
    this.lectura.set(res);
  }

  /** Empareja la descripción de la factura con el catálogo: alias aprendido, coincidencia exacta o sugerencia. */
  private reconocer(f: FilaComprobante, conocidas: string[]): void {
    const { base: sinTalla, talla } = extraerTalla(f.descripcion);
    const { color, base: sinColor } = separarColor(sinTalla, this.colores);
    const { marca, base } = separarMarca(sinColor, conocidas);
    const porAlias = buscarPorAlias(sinColor, this.alias);
    const m = buscarProducto(base, marca, this.productos, conocidas);
    f.productoId = porAlias ?? m.exacto;
    f.sugerido = porAlias ? null : m.sugerido;
    f.talla = talla;
    f.color = color;
    this.ajustarVariantes(f);
  }

  /** Talla y color solo valen si el producto elegido los maneja. */
  ajustarVariantes(f: FilaComprobante): void {
    const p = this.productos.find((x) => x.id === f.productoId);
    if (!p) return;
    if (!p.requiereTalla) f.talla = '';
    if (!p.requiereColor) f.color = '';
  }

  aceptarSugerido(f: FilaComprobante): void {
    if (!f.sugerido) return;
    f.productoId = f.sugerido.id;
    f.sugerido = null;
    this.ajustarVariantes(f);
  }

  producto(f: FilaComprobante): ProductoListItem | undefined {
    return this.productos.find((x) => x.id === f.productoId);
  }

  // ── Revisión ─────────────────────────────────────────────────────────
  get sinStock(): boolean {
    return SIN_STOCK.includes(this.cab.tipo);
  }

  cambioTipo(): void {
    if (this.sinStock) this.filas.update((fs) => fs.map((f) => (f.destino === 'STOCK' ? { ...f, destino: 'GASTO' } : f)));
  }

  quitar(i: number): void {
    this.filas.update((fs) => fs.filter((_, idx) => idx !== i));
  }

  get sumaLineas(): number {
    return this.filas().reduce((s, f) => s + (Number(f.total) || 0), 0);
  }

  /** Las líneas deben sumar la base (o el total si el comprobante no desglosa IGV). */
  get cuadra(): boolean {
    const ref = this.cab.subtotal > 0 ? this.cab.subtotal : this.cab.total;
    const tol = Math.max(1, ref * 0.005);
    return Math.abs(this.sumaLineas - ref) <= tol || Math.abs(this.sumaLineas - this.cab.total) <= tol;
  }

  get hayStock(): boolean {
    return this.filas().some((f) => f.destino === 'STOCK');
  }

  get duplicado(): boolean {
    return this.lectura()?.duplicadoDeId != null;
  }

  /** Lo que falta para poder guardar; vacío = listo. */
  get pendiente(): string {
    if (this.duplicado) return 'Este comprobante ya fue cargado.';
    if (!this.cab.serie.trim() || !this.cab.numero.trim()) return 'Falta la serie o el número.';
    if (!this.cab.fechaEmision) return 'Falta la fecha de emisión.';
    if (!this.filas().length) return 'No hay líneas.';
    if (!this.cab.proveedorId && !this.cab.proveedorRazon.trim()) return 'Falta el proveedor.';
    if (this.cab.moneda === 'USD' && !(this.cab.tipoCambio && this.cab.tipoCambio > 0)) return 'Indica el tipo de cambio (dólares).';
    if (this.hayStock && !this.cab.almacenId) return 'Elige el almacén de ingreso.';
    const sinProducto = this.filas().find((f) => f.destino === 'STOCK' && !f.productoId);
    if (sinProducto) return `Elige el producto del catálogo para «${sinProducto.descripcion}» o cámbialo a gasto.`;
    const sinTalla = this.filas().find((f) => f.destino === 'STOCK' && this.producto(f)?.requiereTalla && !f.talla);
    if (sinTalla) return `Falta la talla de «${sinTalla.descripcion}».`;
    const sinColor = this.filas().find((f) => f.destino === 'STOCK' && this.producto(f)?.requiereColor && !f.color);
    if (sinColor) return `Falta el color de «${sinColor.descripcion}».`;
    return '';
  }

  // ── Guardar ──────────────────────────────────────────────────────────
  guardar(): void {
    if (this.pendiente || this.guardando()) return;
    const c = this.cab;
    const dto: ComprobanteGuardar = {
      proveedorId: c.proveedorId,
      proveedorRuc: c.proveedorId ? null : c.proveedorRuc.trim() || null,
      proveedorRazonSocial: c.proveedorId ? null : c.proveedorRazon.trim() || null,
      almacenId: this.hayStock ? c.almacenId : null,
      tipo: c.tipo,
      serie: c.serie.trim(),
      numero: c.numero.trim(),
      fechaEmision: c.fechaEmision,
      moneda: c.moneda,
      tipoCambio: c.moneda === 'USD' ? c.tipoCambio : null,
      subtotal: c.subtotal,
      igv: c.igv,
      total: c.total,
      formaPago: c.formaPago.trim() || null,
      detraccionMonto: c.detraccionMonto,
      ordenCompraRef: c.ordenCompraRef.trim() || null,
      guiaRef: c.guiaRef.trim() || null,
      archivoUrl: this.lectura()?.archivoUrl ?? null,
      observacion: c.observacion.trim() || null,
      modeloIa: this.lectura()?.modeloUsado ?? null,
      items: this.filas().map((f) => ({
        descripcion: f.descripcion,
        cantidad: f.cantidad,
        unidad: f.unidad || null,
        precioUnitario: f.precioUnitario,
        total: f.total,
        destino: f.destino,
        productoId: f.destino === 'STOCK' ? f.productoId : null,
        talla: f.talla,
        color: f.color,
        categoriaGasto: f.categoriaGasto || null,
      })),
    };

    this.guardando.set(true);
    this.service.guardarComprobante(dto).subscribe({
      next: (r) => {
        this.guardando.set(false);
        const partes = [`${r.lineasAStock} línea(s) ingresaron al almacén`, `${r.lineasGasto} quedaron como gasto`];
        const avisos = r.avisos.length ? `<br><br>${r.avisos.map((a) => `• ${a}`).join('<br>')}` : '';
        Swal.fire({ icon: 'success', title: 'Comprobante registrado', html: `${partes.join(' · ')}.${avisos}` });
        this.guardado.emit();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo guardar el comprobante.');
        this.cdr.detectChanges();
      },
    });
  }

  otroArchivo(): void {
    this.lectura.set(null);
    this.filas.set([]);
    this.advertencias.set([]);
    this.error.set('');
  }
}
