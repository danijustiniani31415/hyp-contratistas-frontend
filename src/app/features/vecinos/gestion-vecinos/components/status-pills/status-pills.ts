import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogOptionDTO } from '../../dtos/gestion-vecinos.dto';

/**
 * Selector de estado en línea (segmented control) para catálogos de pocas
 * opciones fijas. Reemplaza al `search-select` flotante en contextos con
 * scroll: al no abrir un panel `absolute`, no se recorta contra contenedores
 * con overflow ni se cierra al hacer scroll.
 */
@Component({
  selector: 'app-status-pills',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-pills.html',
})
export class StatusPills {
  @Input() options: CatalogOptionDTO[] = [];
  @Input() value: number | null = null;
  @Input() size: 'sm' | 'xs' = 'sm';
  @Output() valueChange = new EventEmitter<number>();

  select(id: number): void {
    if (id === this.value) return;
    this.valueChange.emit(id);
  }

  /** Clases del pill según esté seleccionado y según su semántica de color. */
  classesFor(opt: CatalogOptionDTO): string {
    if (opt.id !== this.value) {
      return 'bg-transparent text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600';
    }
    return this.activeColor(opt.descripcion);
  }

  private activeColor(descripcion: string): string {
    const d = descripcion.toLowerCase();
    if (d.includes('no aplica')) return 'bg-gray-100 text-gray-500 border-gray-300';
    if (d.startsWith('por ')) return 'bg-[#FEF3C7] text-[#92400E] border-[#92400E]/30'; // "Por responder"
    if (d.includes('falta')) return 'bg-[#FAD5D4] text-[#D30000] border-[#D30000]/30';
    if (/(pend|proceso|progreso|curso)/.test(d)) return 'bg-[#FEF3C7] text-[#92400E] border-[#92400E]/30';
    if (d.includes('env')) return 'bg-[#DBEAFE] text-[#1D4ED8] border-[#1D4ED8]/30';
    if (/(aprob|conform|atend|respond|complet|finaliz|cerr)/.test(d))
      return 'bg-[#D7FAF4] text-[#009C87] border-[#009C87]/40';
    return 'bg-[#E8F5E9] text-[#4CAF50] border-[#4CAF50]/40';
  }
}
