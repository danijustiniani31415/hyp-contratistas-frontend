import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { CotizacionDetalle, CotizacionItem, CotizacionListItem, CotizacionesService } from '../../core/services/cotizaciones.service';
import { ComprasService, Proveedor } from '../../core/services/compras.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

const PAGE_SIZE = 20;

/**
 * Cotizaciones comparativas. Se piden desde "Pendientes de compra". Acá se carga lo que responde cada proveedor, se
 * comparan los precios lado a lado (lo más barato de cada ítem sale en verde) y se adjudica: el sistema genera una
 * orden de compra por proveedor ganador. Elegir algo que no es lo más barato pide escribir el motivo.
 */
@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, Paginator, LbPageHeader, SearchSelect],
  templateUrl: './cotizaciones.html',
  styleUrl: './cotizaciones.css',
})
export class Cotizaciones implements OnInit {
  lista = signal<CotizacionListItem[]>([]);
  loading = signal(false);
  estado = 'ABIERTA';
  search = signal('');
  page = signal(1);

  detalle = signal<CotizacionDetalle | null>(null);
  modo = signal<'comparar' | 'cargar'>('comparar');
  proveedores = signal<Proveedor[]>([]);
  guardando = signal(false);
  error = signal('');

  // Formulario "cargar cotización de un proveedor"
  form = { proveedorId: 0, plazoDias: null as number | null, condicionPago: '', observacion: '' };
  preciosForm: Record<number, number | null> = {};

  // Elección de ganador por ítem (itemId -> cotizacionId) y motivo
  seleccion = signal<Record<number, number>>({});
  motivo = '';

  filtradas = computed(() => {
    const s = this.search().trim().toLowerCase();
    return !s ? this.lista() : this.lista().filter((c) => [c.codigo, c.almacenNombre, c.resumen ?? ''].some((x) => x.toLowerCase().includes(s)));
  });
  totalPages = computed(() => Math.max(1, Math.ceil(this.filtradas().length / PAGE_SIZE)));
  visibles = computed(() => this.filtradas().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE));

  constructor(private service: CotizacionesService, private compras: ComprasService, public auth: LbAuthService) {}

  ngOnInit(): void {
    this.cargar();
    this.compras.listProveedores().subscribe((p) => this.proveedores.set([...p].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial))));
  }

  cargar(): void {
    this.loading.set(true);
    this.service.listar(this.estado).subscribe({
      next: (r) => {
        this.lista.set(r);
        this.page.set(1);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: 'No se pudo cargar', text: e?.error?.message ?? 'Intenta de nuevo.' });
      },
    });
  }

  abrir(c: CotizacionListItem): void {
    this.service.detalle(c.id).subscribe({
      next: (d) => this.mostrar(d),
      error: (e) => Swal.fire({ icon: 'error', title: 'Error', text: e?.error?.message ?? 'No se pudo abrir.' }),
    });
  }

  /** Muestra el detalle y propone como ganador, en cada ítem, el precio más barato. */
  mostrar(d: CotizacionDetalle): void {
    this.detalle.set(d);
    this.modo.set('comparar');
    this.error.set('');
    this.motivo = '';
    const sel: Record<number, number> = {};
    for (const it of d.items) {
      const ganador = it.cotizacionAdjudicadaId ?? this.mejorCotizacion(d, it.id);
      if (ganador) sel[it.id] = ganador;
    }
    this.seleccion.set(sel);
  }

  cerrar(): void {
    this.detalle.set(null);
    this.cargar();
  }

  get puedeGestionar(): boolean {
    return this.auth.hasPermiso('COMPRA_CREAR');
  }

  /** Id de la cotización con el precio más bajo para el ítem (o null si nadie cotizó). */
  mejorCotizacion(d: CotizacionDetalle, itemId: number): number | null {
    let mejor: number | null = null;
    let min = Infinity;
    for (const c of d.cotizaciones) {
      const p = c.precios[itemId];
      if (p !== undefined && p < min) {
        min = p;
        mejor = c.id;
      }
    }
    return mejor;
  }

  precioMinimo(d: CotizacionDetalle, itemId: number): number | null {
    const ps = d.cotizaciones.map((c) => c.precios[itemId]).filter((p) => p !== undefined);
    return ps.length ? Math.min(...ps) : null;
  }

  esMejor(d: CotizacionDetalle, itemId: number, precio: number | undefined): boolean {
    return precio !== undefined && precio === this.precioMinimo(d, itemId);
  }

  /** Total de lo que se pagaría con la elección actual. */
  totalElegido = computed(() => {
    const d = this.detalle();
    if (!d) return 0;
    return d.items.reduce((acc, it) => {
      const c = d.cotizaciones.find((x) => x.id === this.seleccion()[it.id]);
      return acc + (c?.precios[it.id] ?? 0) * it.cantidad;
    }, 0);
  });

  /** true si alguna elección no es la más barata, o si hay una sola cotización: en ese caso hay que escribir el motivo. */
  requiereMotivo(): boolean {
    const d = this.detalle();
    if (!d) return false;
    if (d.cotizaciones.length < 2) return true;
    return d.items.some((it) => {
      const c = d.cotizaciones.find((x) => x.id === this.seleccion()[it.id]);
      const p = c?.precios[it.id];
      return p !== undefined && p > (this.precioMinimo(d, it.id) ?? p);
    });
  }

  elegir(itemId: number, cotizacionId: number): void {
    if (this.detalle()?.estado !== 'ABIERTA') return;
    this.seleccion.update((s) => ({ ...s, [itemId]: cotizacionId }));
  }

  abrirCarga(): void {
    const d = this.detalle();
    if (!d) return;
    this.form = { proveedorId: 0, plazoDias: null, condicionPago: '', observacion: '' };
    this.preciosForm = {};
    for (const it of d.items) this.preciosForm[it.id] = null;
    this.error.set('');
    this.modo.set('cargar');
  }

  /** Al elegir un proveedor que ya cotizó, se cargan sus datos para corregirlos. */
  alElegirProveedor(id: number): void {
    this.form.proveedorId = id;
    const d = this.detalle();
    const previa = d?.cotizaciones.find((c) => c.proveedorId === id);
    if (d && previa) {
      this.form.plazoDias = previa.plazoDias;
      this.form.condicionPago = previa.condicionPago ?? '';
      this.form.observacion = previa.observacion ?? '';
      for (const it of d.items) this.preciosForm[it.id] = previa.precios[it.id] ?? null;
    }
  }

  guardarCotizacion(): void {
    const d = this.detalle();
    if (!d) return;
    if (!this.form.proveedorId) return this.error.set('Elige el proveedor.');
    const precios = d.items.map((it) => ({ itemId: it.id, precio: this.preciosForm[it.id] ? Number(this.preciosForm[it.id]) : null }));
    if (!precios.some((p) => p.precio && p.precio > 0)) return this.error.set('Escribe el precio de al menos un ítem.');
    this.error.set('');
    this.guardando.set(true);
    this.service.agregarCotizacion(d.id, { ...this.form, precios }).subscribe({
      next: (det) => {
        this.guardando.set(false);
        this.mostrar(det);
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(e?.error?.message ?? 'No se pudo guardar la cotización.');
      },
    });
  }

  quitar(cotizacionId: number, nombre: string): void {
    const d = this.detalle();
    if (!d) return;
    Swal.fire({ icon: 'question', title: `¿Quitar la cotización de ${nombre}?`, showCancelButton: true, confirmButtonText: 'Quitar', cancelButtonText: 'Cancelar' }).then((r) => {
      if (!r.isConfirmed) return;
      this.service.eliminarCotizacion(d.id, cotizacionId).subscribe({
        next: (det) => this.mostrar(det),
        error: (e) => Swal.fire({ icon: 'error', title: 'Error', text: e?.error?.message ?? 'No se pudo quitar.' }),
      });
    });
  }

  adjudicar(): void {
    const d = this.detalle();
    if (!d) return;
    if (d.items.some((it) => !this.seleccion()[it.id])) return this.error.set('Elige un proveedor para cada ítem.');
    if (this.requiereMotivo() && this.motivo.trim().length < 5)
      return this.error.set(d.cotizaciones.length < 2 ? 'Hay una sola cotización: escribe por qué se compra así.' : 'Elegiste algo que no es lo más barato: escribe el motivo.');
    this.error.set('');
    const proveedores = new Set(d.items.map((it) => d.cotizaciones.find((c) => c.id === this.seleccion()[it.id])?.proveedorId)).size;
    Swal.fire({
      icon: 'question',
      title: 'Adjudicar y generar órdenes',
      text: `Se generará ${proveedores === 1 ? 'una orden de compra' : proveedores + ' órdenes de compra'} por S/ ${this.totalElegido().toFixed(2)}.`,
      showCancelButton: true,
      confirmButtonText: 'Generar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.guardando.set(true);
      this.service
        .adjudicar(d.id, { motivo: this.motivo.trim(), selecciones: d.items.map((it) => ({ itemId: it.id, cotizacionId: this.seleccion()[it.id] })) })
        .subscribe({
          next: (det) => {
            this.guardando.set(false);
            this.mostrar(det);
            Swal.fire({ icon: 'success', title: 'Órdenes generadas', text: det.ordenesGeneradas ?? '', timer: 3000, showConfirmButton: false });
          },
          error: (e) => {
            this.guardando.set(false);
            this.error.set(e?.error?.message ?? 'No se pudo adjudicar.');
          },
        });
    });
  }

  cancelarSolicitud(): void {
    const d = this.detalle();
    if (!d) return;
    Swal.fire({ icon: 'warning', title: '¿Cancelar esta solicitud?', text: 'Los ítems quedan pendientes de compra.', showCancelButton: true, confirmButtonText: 'Cancelar solicitud', cancelButtonText: 'Volver' }).then((r) => {
      if (!r.isConfirmed) return;
      this.service.cancelar(d.id).subscribe({
        next: (det) => this.mostrar(det),
        error: (e) => Swal.fire({ icon: 'error', title: 'Error', text: e?.error?.message ?? 'No se pudo cancelar.' }),
      });
    });
  }

  nombreItem(it: CotizacionItem): string {
    return `${it.productoNombre}${it.talla ? ' (' + it.talla + ')' : ''}${it.color ? ' [' + it.color + ']' : ''}`;
  }
}
