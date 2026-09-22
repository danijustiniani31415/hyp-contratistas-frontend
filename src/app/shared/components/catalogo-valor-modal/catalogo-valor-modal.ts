import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseModal } from '../base-modal/base-modal';
import { CatalogoValorService, CatalogoValor } from '../../../core/services/catalogo-valor.service';

/**
 * Modal genérico para gestionar CUALQUIER catálogo de lista fija (banco, tipo AFP/ONP, categoría
 * laboral, ...): agregar, editar el texto, activar/desactivar. Un solo componente para todos —
 * evita construir un CRUD nuevo cada vez que aparece una lista que "debería poder modificarse
 * desde el frontend". Uso: <app-catalogo-valor-modal [tipo]="'BANCO'" titulo="Bancos"
 * [abierto]="showX()" (cerrado)="...cierra y refresca las opciones..." />
 */
@Component({
  selector: 'app-catalogo-valor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './catalogo-valor-modal.html',
  styleUrl: './catalogo-valor-modal.css',
})
export class CatalogoValorModal implements OnChanges {
  @Input() tipo = '';
  @Input() titulo = '';
  @Input() abierto = false;
  @Output() cerrado = new EventEmitter<void>();

  valores: CatalogoValor[] = [];
  nuevo = '';
  error = '';
  guardando = false;

  constructor(private service: CatalogoValorService) {}

  ngOnChanges(): void {
    if (this.abierto && this.tipo) this.cargar();
  }

  private cargar(): void {
    this.error = '';
    this.nuevo = '';
    this.service.list(this.tipo).subscribe((v) => (this.valores = v));
  }

  agregar(): void {
    const valor = this.nuevo.trim();
    if (!valor) return;
    this.error = '';
    this.guardando = true;
    this.service.crear(this.tipo, valor).subscribe({
      next: (v) => {
        this.guardando = false;
        this.nuevo = '';
        this.valores = [...this.valores, v];
      },
      error: (err) => {
        this.guardando = false;
        this.error = err?.error?.message ?? 'No se pudo agregar.';
      },
    });
  }

  guardarFila(item: CatalogoValor): void {
    this.error = '';
    this.service.actualizar(item.id, item.valor, item.activo).subscribe({
      error: (err) => (this.error = err?.error?.message ?? 'No se pudo actualizar.'),
    });
  }

  toggleActivo(item: CatalogoValor): void {
    item.activo = !item.activo;
    this.guardarFila(item);
  }

  cerrar(): void {
    this.cerrado.emit();
  }
}
