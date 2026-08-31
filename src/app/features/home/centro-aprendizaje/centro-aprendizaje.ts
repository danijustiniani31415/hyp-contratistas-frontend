import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LearningService } from '../../../core/learning/learning.service';
import { LearningCategoryDto } from '../../../core/learning/learning.model';
import { LearningCenter } from '../../../shared/components/learning-center/learning-center';

/**
 * Página dedicada del Centro de aprendizaje y guías. Es la versión "ampliada" de lo
 * que antes aparecía en una columna a la derecha del /inicio: reutiliza el mismo
 * componente app-learning-center (en modo `large`) ocupando todo el ancho.
 * Se llega desde la 4ta tarjeta de "Novedades y comunicados" del dashboard.
 */
@Component({
  selector: 'app-centro-aprendizaje',
  standalone: true,
  imports: [CommonModule, LearningCenter],
  templateUrl: './centro-aprendizaje.html',
  styleUrl: './centro-aprendizaje.css',
})
export class CentroAprendizaje implements OnInit {
  /** Grupos ya filtrados por rol en el backend (mismo endpoint que usa el /inicio). */
  categorias: LearningCategoryDto[] = [];
  cargando = true;

  constructor(
    private learningService: LearningService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  volverAlInicio(): void {
    this.router.navigate(['/inicio']);
  }

  ngOnInit(): void {
    // App zoneless: forzamos el refresco para que el contenido aparezca sin un click extra.
    this.learningService.getInicio().subscribe({
      next: (data) => {
        this.categorias = data ?? [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.categorias = [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }
}
