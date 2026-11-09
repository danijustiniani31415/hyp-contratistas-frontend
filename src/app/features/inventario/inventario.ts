import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import {
  AlmacenService,
  InventarioDetalle,
  InventarioListItem,
  KardexValorizado,
} from '../../core/services/almacen.service';
import { AlmacenCatalogoItem, PersonasService } from '../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../core/services/catalogo.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

/**
 * Kardex valorizado (entradas, salidas y saldo con costo promedio, listo para contabilidad) y toma de inventario físico:
 * se abre un conteo con una foto del stock, se cuenta, y al cerrarlo las diferencias se vuelven ajustes reales en el kardex.
 */
@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, LbPageHeader],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
})
export class Inventario implements OnInit {
  tab = signal<'kardex' | 'inventario'>('kardex');
  almacenes = signal<AlmacenCatalogoItem[]>([]);
  productos = signal<ProductoListItem[]>([]);

  // ── Kardex valorizado ──
  kAlmacen: number | null = null;
  kProducto: number | null = null;
  kTalla = '';
  kColor = '';
  kDesde = '';
  kHasta = '';
  kardex = signal<KardexValorizado | null>(null);
  kCargando = signal(false);
  kError = signal('');

  // ── Toma de inventario ──
  inventarios = signal<InventarioListItem[]>([]);
  invAlmacenFiltro: number | null = null;
  nuevoAlmacen: number | null = null;
  nuevaObs = '';
  showNuevo = signal(false);
  detalle = signal<InventarioDetalle | null>(null);
  guardando = signal(false);
  addProducto: number | null = null;
  addTalla = '';
  addColor = '';
  /** Lo digitado en pantalla antes de guardar: itemId → { contada, motivo }. */
  edicion: Record<number, { contada: number | null; motivo: string }> = {};

  constructor(
    private service: AlmacenService,
    private personasService: PersonasService,
    private catalogoService: CatalogoService,
    public authService: LbAuthService,
  ) {}

  get puedeAjustar(): boolean {
    return this.authService.hasPermiso('ALMACEN_AJUSTAR');
  }

  ngOnInit(): void {
    this.personasService.getCatalogos().subscribe((c) => this.almacenes.set(c.almacenes));
    this.catalogoService.listProductos('', 1, 5000).subscribe((r) => this.productos.set(r.data));
    this.cargarInventarios();
  }

  // ───────── Kardex ─────────
  verKardex(): void {
    if (!this.kAlmacen || !this.kProducto) {
      this.kError.set('Elige el almacén y el producto.');
      return;
    }
    this.kError.set('');
    this.kCargando.set(true);
    this.service.kardex(this.kAlmacen, this.kProducto, this.kTalla.trim(), this.kColor.trim(), this.kDesde, this.kHasta).subscribe({
      next: (k) => {
        this.kardex.set(k);
        this.kCargando.set(false);
      },
      error: (e) => {
        this.kCargando.set(false);
        this.kardex.set(null);
        this.kError.set(e?.error?.message ?? 'No se pudo cargar el kardex.');
      },
    });
  }

  nombreTipo(t: string, ref: string | null): string {
    const base = t === 'INGRESO' ? 'Entrada' : 'Salida';
    return ref ? `${base} · ${ref.replace(/_/g, ' ').toLowerCase()}` : `${base} · manual`;
  }

  exportarCsv(): void {
    const k = this.kardex();
    if (!k) return;
    const filas = [
      ['Fecha', 'Movimiento', 'Entrada cant.', 'Entrada costo unit.', 'Entrada total', 'Salida cant.', 'Salida costo unit.', 'Salida total', 'Saldo cant.', 'Saldo costo unit.', 'Saldo total'],
      ['Saldo inicial', '', '', '', '', '', '', '', String(k.saldoInicialCantidad), String(k.saldoInicialCostoUnitario), String(k.saldoInicialTotal)],
      ...k.lineas.map((l) => [
        l.fecha.slice(0, 10), this.nombreTipo(l.tipo, l.referencia),
        String(l.entradaCantidad), String(l.entradaCostoUnitario), String(l.entradaTotal),
        String(l.salidaCantidad), String(l.salidaCostoUnitario), String(l.salidaTotal),
        String(l.saldoCantidad), String(l.saldoCostoUnitario), String(l.saldoTotal),
      ]),
    ];
    const csv = '﻿' + filas.map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `kardex-${k.productoNombre}.csv`.replace(/[^\w.\-]+/g, '_');
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ───────── Inventario ─────────
  cargarInventarios(): void {
    this.service.listInventarios(this.invAlmacenFiltro).subscribe((l) => this.inventarios.set(l));
  }

  abrirNuevo(): void {
    this.nuevoAlmacen = null;
    this.nuevaObs = '';
    this.showNuevo.set(true);
  }

  crear(): void {
    if (!this.nuevoAlmacen) return;
    this.guardando.set(true);
    this.service.crearInventario(this.nuevoAlmacen, this.nuevaObs).subscribe({
      next: (d) => {
        this.guardando.set(false);
        this.showNuevo.set(false);
        this.cargarInventarios();
        this.abrirDetalle(d);
      },
      error: (e) => {
        this.guardando.set(false);
        Swal.fire({ icon: 'warning', title: 'No se pudo abrir el conteo', text: e?.error?.message ?? 'Intenta de nuevo.' });
      },
    });
  }

  abrir(i: InventarioListItem): void {
    this.service.getInventario(i.id).subscribe((d) => this.abrirDetalle(d));
  }

  private abrirDetalle(d: InventarioDetalle): void {
    this.edicion = {};
    for (const it of d.items) this.edicion[it.id] = { contada: it.cantidadContada, motivo: it.motivo ?? '' };
    this.detalle.set(d);
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
    this.cargarInventarios();
  }

  get abierto(): boolean {
    return this.detalle()?.estado === 'EN_CONTEO';
  }

  diferencia(itemId: number, sistema: number): number | null {
    const c = this.edicion[itemId]?.contada;
    return c === null || c === undefined || (c as unknown) === '' ? null : Number(c) - sistema;
  }

  /** Valor de la diferencia (a costo promedio) para que se vea cuánto pesa el faltante o sobrante. */
  valorDiferencia(itemId: number, sistema: number, costo: number): number | null {
    const d = this.diferencia(itemId, sistema);
    return d === null ? null : d * costo;
  }

  private itemsParaGuardar() {
    const d = this.detalle();
    if (!d) return [];
    return d.items.map((it) => {
      const e = this.edicion[it.id];
      const c = e?.contada;
      return {
        itemId: it.id,
        cantidadContada: c === null || c === undefined || (c as unknown) === '' ? null : Number(c),
        motivo: e?.motivo?.trim() ? e.motivo.trim() : null,
      };
    });
  }

  guardarConteo(): void {
    const d = this.detalle();
    if (!d) return;
    this.guardando.set(true);
    this.service.guardarConteo(d.id, this.itemsParaGuardar()).subscribe({
      next: (nd) => {
        this.guardando.set(false);
        this.abrirDetalle(nd);
      },
      error: (e) => {
        this.guardando.set(false);
        Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: e?.error?.message ?? 'Intenta de nuevo.' });
      },
    });
  }

  agregar(): void {
    const d = this.detalle();
    if (!d || !this.addProducto) return;
    // Se guarda primero lo digitado para no perderlo al recargar el detalle.
    this.service.guardarConteo(d.id, this.itemsParaGuardar()).subscribe(() => {
      this.service.agregarItemInventario(d.id, this.addProducto!, this.addTalla.trim(), this.addColor.trim()).subscribe({
        next: (nd) => {
          this.addProducto = null;
          this.addTalla = '';
          this.addColor = '';
          this.abrirDetalle(nd);
        },
        error: (e) => Swal.fire({ icon: 'warning', title: 'No se pudo agregar', text: e?.error?.message ?? 'Intenta de nuevo.' }),
      });
    });
  }

  async cerrarConteo(): Promise<void> {
    const d = this.detalle();
    if (!d) return;
    const items = this.itemsParaGuardar();
    const contados = items.filter((i) => i.cantidadContada !== null).length;
    if (!contados) {
      Swal.fire({ icon: 'info', title: 'Todavía no contaste nada', text: 'Escribe la cantidad contada de al menos un producto.' });
      return;
    }
    const conDif = d.items.filter((it) => (this.diferencia(it.id, it.cantidadSistema) ?? 0) !== 0).length;
    const r = await Swal.fire({
      icon: 'question',
      title: '¿Cerrar y ajustar el stock?',
      html: `Se contaron <b>${contados}</b> productos y <b>${conDif}</b> tienen diferencia. Al cerrar, el stock se ajusta a lo contado y queda registrado en el kardex. <b>No se puede deshacer.</b>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar y ajustar',
      cancelButtonText: 'Seguir contando',
    });
    if (!r.isConfirmed) return;
    this.guardando.set(true);
    this.service.guardarConteo(d.id, items).subscribe({
      next: () =>
        this.service.cerrarInventario(d.id).subscribe({
          next: (nd) => {
            this.guardando.set(false);
            this.abrirDetalle(nd);
            this.cargarInventarios();
            Swal.fire({ icon: 'success', title: 'Inventario cerrado', text: `${nd.cantidadAjustes} ajustes registrados en el kardex.`, timer: 3000, showConfirmButton: false });
          },
          error: (e) => {
            this.guardando.set(false);
            Swal.fire({ icon: 'error', title: 'No se pudo cerrar', text: e?.error?.message ?? 'Intenta de nuevo.' });
          },
        }),
      error: (e) => {
        this.guardando.set(false);
        Swal.fire({ icon: 'error', title: 'No se pudo guardar el conteo', text: e?.error?.message ?? 'Intenta de nuevo.' });
      },
    });
  }

  async anular(): Promise<void> {
    const d = this.detalle();
    if (!d) return;
    const r = await Swal.fire({ icon: 'warning', title: '¿Anular este conteo?', text: 'No se ajusta ningún stock.', showCancelButton: true, confirmButtonText: 'Sí, anular', cancelButtonText: 'Volver' });
    if (!r.isConfirmed) return;
    this.service.anularInventario(d.id).subscribe({
      next: () => this.cerrarDetalle(),
      error: (e) => Swal.fire({ icon: 'error', title: 'No se pudo anular', text: e?.error?.message ?? 'Intenta de nuevo.' }),
    });
  }
}
