import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface LearningGuide {
  titulo: string;
  url: string;
  /** Miniatura opcional; si no se da, se muestra un ícono de play genérico. */
  img?: string;
}

/**
 * Panel de enlaces en lista compacta (miniatura/ícono + título + "Ver más").
 * Mismo lenguaje visual que el modal de tutoriales del login (.tutorial-card),
 * extraído a componente para reutilizarlo en cualquier pantalla que necesite
 * este patrón (guías en video, novedades, etc.) sin duplicar el marcado.
 */
@Component({
  selector: 'app-learning-guides',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './learning-guides.html',
  styleUrl: './learning-guides.css',
})
export class LearningGuides {
  @Input() titulo = 'Centro de aprendizaje y guías';
  @Input() guias: LearningGuide[] = [];
  @Input() accentColor = '#4f46e5';
  @Input() linkLabel = 'Ver guía →';
  /** 'list' apila las tarjetas; 'grid' las reparte en columnas (para paneles anchos con varios items). */
  @Input() layout: 'list' | 'grid' = 'list';
  /** Falso para contenido que no es video (p. ej. novedades): no tapa la miniatura con un botón de play. */
  @Input() showPlayIcon = true;
}
