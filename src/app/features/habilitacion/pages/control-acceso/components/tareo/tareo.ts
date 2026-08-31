import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import {
  ControlAccesoService,
  TareoDto,
  TareoPartidaDto,
  TareoEmpresaDto,
} from '../../../../services/control-acceso.service';

interface DetalleCasa {
  partida: TareoPartidaDto;
  cantidad: number;
}

interface DetalleContratista {
  empresa: TareoEmpresaDto;
  cantidad: number;
}

@Component({
  selector: 'app-control-acceso-tareo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tareo.html',
  styleUrl: './tareo.css',
})
export class Tareo implements OnChanges {
  @Input() proyectoId!: number;

  fecha = new Date().toISOString().slice(0, 10);
  loading = false;
  saving = false;

  tareoId: number | null = null;
  detallesCasa: DetalleCasa[] = [];
  detallesContratista: DetalleContratista[] = [];

  constructor(
    private service: ControlAccesoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyectoId'] && this.proyectoId) {
      this.loadTareo();
    }
  }

  loadTareo(): void {
    this.loading = true;
    this.tareoId = null;
    forkJoin({
      partidas: this.service.getPartidas(),
      empresas: this.service.getEmpresasTareo(this.proyectoId),
    }).subscribe({
      next: ({ partidas, empresas }) => {
        this.detallesCasa = partidas.map(p => ({ partida: p, cantidad: 0 }));
        this.detallesContratista = empresas.map(e => ({ empresa: e, cantidad: 0 }));
        this.loadTareoExistente();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadTareoExistente(): void {
    this.service.getTareo(this.proyectoId, this.fecha).subscribe({
      next: res => {
        this.tareoId = res.id ?? null;
        for (const dc of (res.detallesCasa ?? [])) {
          const found = this.detallesCasa.find(d => d.partida.id === dc.partidaId);
          if (found) found.cantidad = dc.cantidadPersonas;
        }
        for (const dc of (res.detallesContratista ?? [])) {
          const found = this.detallesContratista.find(d => d.empresa.empresaId === dc.empresaId);
          if (found) found.cantidad = dc.cantidadPersonas;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onFechaChange(): void {
    this.loadTareo();
  }

  get totalCasa(): number {
    return this.detallesCasa.reduce((s, d) => s + (Number(d.cantidad) || 0), 0);
  }

  get totalContratistas(): number {
    return this.detallesContratista.reduce((s, d) => s + (Number(d.cantidad) || 0), 0);
  }

  get totalGeneral(): number {
    return this.totalCasa + this.totalContratistas;
  }

  get puedeGuardar(): boolean {
    return this.detallesCasa.some(d => d.cantidad > 0) ||
      this.detallesContratista.some(d => d.cantidad > 0);
  }

  guardar(): void {
    this.saving = true;
    const body: TareoDto = {
      proyectoId: this.proyectoId,
      fecha: this.fecha,
      detallesCasa: this.detallesCasa
        .filter(d => d.cantidad > 0)
        .map(d => ({ partidaId: d.partida.id, cantidadPersonas: d.cantidad })),
      detallesContratista: this.detallesContratista
        .filter(d => d.cantidad > 0)
        .map(d => ({ empresaId: d.empresa.empresaId, cantidadPersonas: d.cantidad })),
    };

    const request$ = this.tareoId
      ? this.service.updateTareo(this.tareoId, body)
      : this.service.saveTareo(body);

    request$.subscribe({
      next: res => {
        this.tareoId = res.id ?? this.tareoId;
        this.saving = false;
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: err => {
        this.saving = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message ?? 'No se pudo guardar el tareo.',
        });
        this.cdr.detectChanges();
      },
    });
  }
}
