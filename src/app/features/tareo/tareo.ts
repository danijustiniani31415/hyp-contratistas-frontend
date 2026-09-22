import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import { TareoService, TareoCelda, TareoPersona } from '../../core/services/tareo.service';

const CODIGOS = ['8', 'DL', 'F', 'P', 'VC', 'DM'];

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-tareo',
  standalone: true,
  imports: [CommonModule, FormsModule, LbPageHeader],
  templateUrl: './tareo.html',
  styleUrl: './tareo.css',
})
export class Tareo implements OnInit {
  codigos = CODIGOS;
  anio = signal(new Date().getFullYear());
  mes = signal(new Date().getMonth() + 1);
  dias = signal<number[]>([]);
  personas = signal<TareoPersona[]>([]);
  loading = signal(false);
  guardando = signal(false);

  meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  constructor(private service: TareoService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.service.getMes(this.anio(), this.mes()).subscribe({
      next: (res) => {
        this.dias.set(Array.from({ length: res.diasEnMes }, (_, i) => i + 1));
        this.personas.set(res.personas);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  cambiarMes(delta: number): void {
    let m = this.mes() + delta;
    let a = this.anio();
    if (m < 1) { m = 12; a--; }
    if (m > 12) { m = 1; a++; }
    this.mes.set(m);
    this.anio.set(a);
    this.cargar();
  }

  /** Traduce la celda (tipoDia + horasTrabajadas) al código único que muestra el <select>. */
  codigoDe(celda: TareoCelda): string {
    if (!celda.tipoDia) return '';
    if (celda.tipoDia === 'NORMAL') return celda.horasTrabajadas != null ? String(celda.horasTrabajadas) : '8';
    return celda.tipoDia;
  }

  setCodigo(celda: TareoCelda, valor: string): void {
    if (!valor) {
      celda.tipoDia = '';
      celda.horasTrabajadas = null;
    } else if (valor === '8') {
      celda.tipoDia = 'NORMAL';
      celda.horasTrabajadas = 8;
    } else {
      celda.tipoDia = valor;
      celda.horasTrabajadas = null;
    }
  }

  guardar(): void {
    this.guardando.set(true);
    this.service
      .guardarMes({
        anio: this.anio(),
        mes: this.mes(),
        personas: this.personas().map((p) => ({ personaId: p.personaId, dias: p.dias })),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          Swal.fire({ icon: 'success', title: 'Tareo guardado', timer: 1500, showConfirmButton: false });
        },
        error: (err) => {
          this.guardando.set(false);
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo guardar el tareo.' });
        },
      });
  }
}
