import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import { CompraDiferencia, ComprasService, nombreMotivoCompra } from '../../core/services/compras.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

const PAGE_SIZE = 20;

/**
 * Bandeja de lo dañado, faltante o sobrante en las compras. Cada diferencia queda abierta hasta que logística
 * la resuelve: reposición, reclamo, nota de crédito o aceptado.
 */
@Component({
  selector: 'app-diferencias-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, Paginator, LbPageHeader],
  templateUrl: './diferencias-compras.html',
  styleUrl: './diferencias-compras.css',
})
export class DiferenciasCompras implements OnInit {
  todas = signal<CompraDiferencia[]>([]);
  abiertas = signal(0);
  resueltas = signal(0);
  loading = signal(false);
  estado = 'ABIERTA';
  search = signal('');
  page = signal(1);

  seleccionada = signal<CompraDiferencia | null>(null);
  resolucion = '';
  nota = '';
  guardando = signal(false);
  error = signal('');
  nombreMotivo = nombreMotivoCompra;

  filtradas = computed(() => {
    const s = this.search().trim().toLowerCase();
    return !s
      ? this.todas()
      : this.todas().filter((d) => [d.ordenCodigo, d.productoNombre, d.proveedorNombre, d.almacenNombre, d.reportadoPorNombre ?? ''].some((x) => x.toLowerCase().includes(s)));
  });
  totalPages = computed(() => Math.max(1, Math.ceil(this.filtradas().length / PAGE_SIZE)));
  visibles = computed(() => this.filtradas().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE));
  valorAbierto = computed(() => this.todas().filter((d) => d.estado === 'ABIERTA').reduce((a, d) => a + d.valorEstimado, 0));

  constructor(private service: ComprasService, public auth: LbAuthService) {}

  get puedeResolver(): boolean {
    return this.auth.hasPermiso('COMPRA_RECIBIR');
  }
  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.service.listarDiferencias(this.estado).subscribe({
      next: (r) => {
        this.todas.set(r.data);
        this.abiertas.set(r.abiertas);
        this.resueltas.set(r.resueltas);
        this.page.set(1);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: 'No se pudo cargar', text: e?.error?.message ?? 'Intenta de nuevo.' });
      },
    });
  }

  abrir(d: CompraDiferencia): void {
    this.seleccionada.set(d);
    this.resolucion = '';
    this.nota = '';
    this.error.set('');
  }

  cerrar(): void {
    this.seleccionada.set(null);
  }

  resolver(): void {
    const d = this.seleccionada();
    if (!d) return;
    if (!this.resolucion) return this.error.set('Elige cómo se resuelve.');
    if (this.nota.trim().length < 3) return this.error.set('Escribe una nota que explique la resolución.');
    this.error.set('');
    this.guardando.set(true);
    this.service.resolverDiferencia(d.id, this.resolucion, this.nota.trim()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrar();
        this.cargar();
        Swal.fire({ icon: 'success', title: 'Diferencia resuelta', text: 'Se avisó por correo a los involucrados.', timer: 2200, showConfirmButton: false });
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(e?.error?.message ?? 'No se pudo resolver.');
      },
    });
  }

  nombreResolucion(r: string | null): string {
    return r === 'REPOSICION' ? 'Reposición' : r === 'RECLAMO' ? 'Reclamo' : r === 'NOTA_CREDITO' ? 'Nota de crédito' : r === 'ACEPTADO' ? 'Aceptado' : '';
  }
}
