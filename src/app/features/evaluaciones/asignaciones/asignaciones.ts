import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { EvAsignacionesService } from '../services/ev-asignaciones.service';
import { ProyectoAsignadoDto, SupervisorAsignacionDto } from '../dtos/ev-asignaciones.model';

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './asignaciones.html',
  styleUrl: './asignaciones.css',
})
export class Asignaciones implements OnInit {
  readonly subareas: string[] = ['Unidad de Proyectos', 'Planeamiento BIM'];
  supervisores: SupervisorAsignacionDto[] = [];
  proyectos: ProyectoAsignadoDto[] = [];
  loading = false;

  modalAbierto = false;
  supervisorEditando: SupervisorAsignacionDto | null = null;
  seleccionados = new Set<number>();
  guardando = false;

  constructor(
    private asignacionesService: EvAsignacionesService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.asignacionesService.getSupervisores().subscribe({
      next: (data) => {
        this.supervisores = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[Asignaciones] getSupervisores error:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
    this.asignacionesService.getProyectos().subscribe({
      next: (data) => {
        this.proyectos = data;
        this.cdr.detectChanges();
      },
    });
  }

  supervisoresBySubarea(subarea: string): SupervisorAsignacionDto[] {
    return this.supervisores.filter((s) => s.subarea === subarea);
  }

  initials(nombre: string): string {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }

  abrirModal(supervisor: SupervisorAsignacionDto): void {
    this.supervisorEditando = supervisor;
    this.seleccionados = new Set(supervisor.proyectos.map((p) => p.projectId));
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.supervisorEditando = null;
    this.seleccionados = new Set();
  }

  toggleProyecto(id: number): void {
    const next = new Set(this.seleccionados);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.seleccionados = next;
  }

  guardar(): void {
    if (!this.supervisorEditando) return;
    this.guardando = true;
    const projectIds = [...this.seleccionados];
    this.asignacionesService
      .updateAsignaciones(this.supervisorEditando.workerId, { projectIds })
      .subscribe({
        next: () => {
          const sup = this.supervisores.find(
            (s) => s.workerId === this.supervisorEditando!.workerId,
          );
          if (sup) sup.proyectos = this.proyectos.filter((p) => projectIds.includes(p.projectId));
          this.guardando = false;
          this.cerrarModal();
          this.cdr.detectChanges();
        },
        error: () => {
          this.guardando = false;
          this.cdr.detectChanges();
        },
      });
  }
}
