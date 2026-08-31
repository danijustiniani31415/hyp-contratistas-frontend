import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CronogramaActividadesService } from './services/cronograma-actividades.service';
import { ProyectoSimpleDto } from './dtos/cronograma-actividades.dtos';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';

import { PROJECTS_TABS } from '../shared/projects-tabs';
const PROJECT_COLORS = [
  '#3B82F6', // azul
  '#14B8A6', // teal
  '#F59E0B', // ámbar
  '#A855F7', // púrpura
  '#EF4444', // rojo
  '#10B981', // esmeralda
  '#F97316', // naranja
  '#6366F1', // índigo
];

@Component({
  selector: 'app-proyectos-cronograma-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './proyectos-cronograma-list.html',
  styleUrl: './proyectos-cronograma-list.css',
})
export class ProyectosCronogramaList implements OnInit {
  readonly tabs = PROJECTS_TABS;
  anioActual = new Date().getFullYear();
  proyectos: ProyectoSimpleDto[] = [];
  filtroTexto = '';
  loading = false;

  constructor(
    private service: CronogramaActividadesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get proyectosFiltrados(): ProyectoSimpleDto[] {
    if (!this.filtroTexto.trim()) return this.proyectos;
    const term = this.filtroTexto.toLowerCase().trim();
    return this.proyectos.filter(
      (p) =>
        (p.projectDescription && p.projectDescription.toLowerCase().includes(term)) ||
        (p.responsableUdp && p.responsableUdp.toLowerCase().includes(term)),
    );
  }

  limpiarFiltro(): void {
    this.filtroTexto = '';
  }

  private load(): void {
    this.loading = true;
    this.loaderService.show();
    // El avance de cada proyecto ya viene calculado desde el backend en una sola
    // petición (antes se hacía una llamada a /actividades por proyecto → N+1).
    this.service.getProyectos().subscribe({
      next: (proyectos) => {
        this.proyectos = proyectos;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  getProjectColor(index: number): string {
    return PROJECT_COLORS[index % PROJECT_COLORS.length];
  }

  getProjectColorGlow(index: number): string {
    const hex = PROJECT_COLORS[index % PROJECT_COLORS.length];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.38)`;
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  abrirCronograma(p: ProyectoSimpleDto): void {
    this.router.navigate(['/projects/cronograma-actividades', p.projectId]);
  }
}
