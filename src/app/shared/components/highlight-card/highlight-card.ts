import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Tarjeta destacada con imagen que "sale" arriba, cuerpo azul y botón verde
 * a caballo del borde inferior. Copia exacta del lenguaje visual de las
 * tarjetas de SOMOS ABRIL en el boletín (features/home/boletin) — no
 * cambiar colores aquí sin cambiarlos también allá.
 */
@Component({
  selector: 'app-highlight-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './highlight-card.html',
  styleUrl: './highlight-card.css',
})
export class HighlightCard {
  @Input() titulo = '';
  @Input() descripcion = '';
  @Input() img = '';
  @Input() ctaLabel = 'VER MÁS';
  @Output() cta = new EventEmitter<void>();
}
