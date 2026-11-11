import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import {
  CuentaPorPagar,
  CuentaPorPagarDetalle,
  PagosProveedoresService,
  PagosResumen,
} from '../../core/services/pagos-proveedores.service';

const MEDIOS: { codigo: string; nombre: string; pideReferencia: boolean }[] = [
  { codigo: 'TRANSFERENCIA', nombre: 'Transferencia', pideReferencia: true },
  { codigo: 'DEPOSITO', nombre: 'Depósito', pideReferencia: true },
  { codigo: 'CHEQUE', nombre: 'Cheque', pideReferencia: true },
  { codigo: 'EFECTIVO', nombre: 'Efectivo', pideReferencia: false },
  { codigo: 'YAPE_PLIN', nombre: 'Yape / Plin', pideReferencia: false },
];

/**
 * Cuentas por pagar: cada comprobante de compra con lo pagado y el saldo. Desde aquí se registran pagos totales o parciales
 * y se anulan los equivocados (quedan en el historial). Las facturas físicas se archivan aparte; esto es el control del dinero.
 */
@Component({
  selector: 'app-pagos-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, Paginator, LbPageHeader],
  templateUrl: './pagos-proveedores.html',
  styleUrl: './pagos-proveedores.css',
})
export class PagosProveedores implements OnInit {
  cuentas = signal<CuentaPorPagar[]>([]);
  resumen = signal<PagosResumen | null>(null);
  loading = signal(false);
  page = signal(1);
  pageSize = 20;
  totalRecords = signal(0);
  totalPages = signal(1);
  search = '';
  estadoFiltro = '';
  private timer: ReturnType<typeof setTimeout> | null = null;

  detalle = signal<CuentaPorPagarDetalle | null>(null);
  medios = MEDIOS;
  // Formulario de pago
  monto: number | null = null;
  fechaPago = '';
  medio = 'TRANSFERENCIA';
  referencia = '';
  observacion = '';
  guardando = signal(false);
  error = signal('');

  constructor(private service: PagosProveedoresService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.service.listar(this.search.trim(), this.estadoFiltro, this.page(), this.pageSize).subscribe({
      next: (r) => {
        this.cuentas.set(r.data);
        this.totalRecords.set(r.totalRecords);
        this.totalPages.set(Math.max(r.totalPages, 1));
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: 'No se pudo cargar', text: e?.error?.message ?? 'Intenta de nuevo.' });
      },
    });
    this.service.resumen().subscribe((r) => this.resumen.set(r));
  }

  onSearchInput(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.onFiltroChange(), 350);
  }

  onFiltroChange(): void {
    this.page.set(1);
    this.cargar();
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.cargar();
  }

  abrir(c: CuentaPorPagar): void {
    this.service.obtener(c.comprobanteId).subscribe((d) => this.mostrar(d));
  }

  private mostrar(d: CuentaPorPagarDetalle): void {
    this.detalle.set(d);
    this.monto = d.saldo > 0 ? d.saldo : null;
    this.fechaPago = this.hoy();
    this.medio = 'TRANSFERENCIA';
    this.referencia = '';
    this.observacion = '';
    this.error.set('');
  }

  cerrar(): void {
    this.detalle.set(null);
    this.cargar();
  }

  private hoy(): string {
    const d = new Date(Date.now() - 5 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }

  get medioActual() {
    return MEDIOS.find((m) => m.codigo === this.medio)!;
  }

  pagarTodo(): void {
    const d = this.detalle();
    if (d) this.monto = d.saldo;
  }

  registrar(): void {
    const d = this.detalle();
    if (!d) return;
    if (!this.monto || this.monto <= 0) return this.error.set('Escribe el monto pagado.');
    if (this.monto > d.saldo + 0.004) return this.error.set(`El monto supera el saldo (${d.saldo.toFixed(2)} ${d.moneda}).`);
    if (!this.fechaPago) return this.error.set('Elige la fecha de pago.');
    if (this.medioActual.pideReferencia && !this.referencia.trim()) return this.error.set('Indica el número de operación o de cheque.');
    this.error.set('');
    this.guardando.set(true);
    this.service
      .registrar(d.comprobanteId, {
        monto: Number(this.monto),
        fechaPago: this.fechaPago,
        medio: this.medio,
        referencia: this.referencia.trim() || null,
        observacion: this.observacion.trim() || null,
      })
      .subscribe({
        next: (nd) => {
          this.guardando.set(false);
          this.mostrar(nd);
          this.cargar();
          Swal.fire({ icon: 'success', title: 'Pago registrado', timer: 1800, showConfirmButton: false });
        },
        error: (e) => {
          this.guardando.set(false);
          this.error.set(e?.error?.message ?? 'No se pudo registrar el pago.');
        },
      });
  }

  async anular(pagoId: number): Promise<void> {
    const r = await Swal.fire({
      icon: 'warning',
      title: '¿Anular este pago?',
      text: 'El monto vuelve a quedar como saldo pendiente. El pago anulado queda en el historial.',
      input: 'text',
      inputPlaceholder: 'Motivo de la anulación',
      inputValidator: (v) => (v.trim() ? null : 'Escribe el motivo.'),
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Volver',
    });
    if (!r.isConfirmed) return;
    this.service.anular(pagoId, r.value).subscribe({
      next: (nd) => {
        this.mostrar(nd);
        this.cargar();
      },
      error: (e) => Swal.fire({ icon: 'error', title: 'No se pudo anular', text: e?.error?.message ?? 'Intenta de nuevo.' }),
    });
  }

  nombreMedio(c: string): string {
    return MEDIOS.find((m) => m.codigo === c)?.nombre ?? c;
  }

  nombreEstado(e: string): string {
    return e === 'PAGADO' ? 'Pagado' : e === 'PARCIAL' ? 'Pago parcial' : 'Pendiente';
  }

  simbolo(moneda: string): string {
    return moneda === 'USD' ? 'US$' : 'S/';
  }
}
