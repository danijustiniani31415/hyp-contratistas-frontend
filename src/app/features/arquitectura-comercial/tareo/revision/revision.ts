import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { TareoService } from '../../../../core/services/arquitectura-comercial/tareo.service';
import { AC_TAREO_TABS } from '../../shared/arquitectura-comercial-tabs';
import {
  TareoRegistroListaDTO,
  TareoEstado,
  TAREO_TIPO_LABEL,
  TAREO_ESTADO_LABEL,
} from '../../../../core/dtos/arquitectura-comercial/tareo.model';

@Component({
  selector: 'app-tareo-revision',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, Paginator],
  templateUrl: './revision.html',
  styleUrl: './revision.css',
})
export class TareoRevision {
  readonly tabs = AC_TAREO_TABS;
  readonly TAREO_TIPO_LABEL = TAREO_TIPO_LABEL;
  readonly TAREO_ESTADO_LABEL = TAREO_ESTADO_LABEL;

  items: TareoRegistroListaDTO[] = [];
  total = 0;
  pagina = 1;
  porPagina = 20;
  cargando = false;

  estadoFiltro: TareoEstado | '' = 'REVISAR';
  fotoAmpliada: string | null = null;

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.porPagina)); }

  constructor(private tareoService: TareoService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.tareoService
      .getRegistros({
        estado: this.estadoFiltro || null,
        pagina: this.pagina,
        porPagina: this.porPagina,
      })
      .subscribe({
        next: (r) => {
          this.items = r.items;
          this.total = r.total;
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: () => { this.cargando = false; this.cdr.detectChanges(); },
      });
  }

  onFiltroChange(): void { this.pagina = 1; this.cargar(); }
  onPageChange(p: number): void { this.pagina = p; this.cargar(); }

  fotoUrl(item: TareoRegistroListaDTO): string {
    return this.tareoService.fotoUrlConToken(item.fotoUrl);
  }

  aprobar(item: TareoRegistroListaDTO): void {
    Swal.fire({
      icon: 'question',
      title: `¿Aprobar ${TAREO_TIPO_LABEL[item.tipo]} de ${item.workerNombre}?`,
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.tareoService.revisar(item.id, { aprobar: true }).subscribe({
        next: () => this.cargar(),
        error: (err) => Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message }),
      });
    });
  }

  rechazar(item: TareoRegistroListaDTO): void {
    Swal.fire({
      icon: 'warning',
      title: `¿Rechazar ${TAREO_TIPO_LABEL[item.tipo]} de ${item.workerNombre}?`,
      input: 'text',
      inputPlaceholder: 'Motivo (opcional)',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.tareoService.revisar(item.id, { aprobar: false, comentario: r.value || null }).subscribe({
        next: () => this.cargar(),
        error: (err) => Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message }),
      });
    });
  }
}
