import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Banner de bienvenida del home (/inicio). Reutilizable: solo pide nombre y
 * subtítulo, no asume de dónde vienen los datos ni inventa métricas — si en
 * el futuro se agregan KPIs reales, van en un slot aparte, no aquí.
 */
@Component({
  selector: 'app-home-greeting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-greeting.html',
  styleUrl: './home-greeting.css',
})
export class HomeGreeting {
  @Input() firstName = '';
  @Input() subtitle = '';
}
