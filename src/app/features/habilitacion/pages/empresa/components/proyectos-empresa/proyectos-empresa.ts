import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { ErrorService } from '../../../../../../core/services/error.service';
import { HabEmpresaService } from '../../../../services/hab-empresa.service';
import { ProyectoDisponibleDto } from '../../../../dtos/empresa.model';

@Component({
  selector: 'app-proyectos-empresa',
  standalone: true,
  imports: [CommonModule, BaseModal],
  templateUrl: './proyectos-empresa.html',
  styleUrl: './proyectos-empresa.css',
})
export class ProyectosEmpresa implements OnChanges {
  @Input() open = false;
  @Input() empresaId: number | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();

  proyectos: ProyectoDisponibleDto[] = [];
  loading = false;
  procesando: number | null = null;

  constructor(
    private habEmpresaService: HabEmpresaService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.empresaId) {
      this.loadProyectos();
    }
  }

  private loadProyectos(): void {
    if (!this.empresaId) return;
    this.loading = true;
    this.proyectos = [];
    this.habEmpresaService.getProyectosDisponibles(this.empresaId).subscribe({
      next: (res) => {
        this.proyectos = res ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorService.handleError(err);
      },
    });
  }

  get activos(): ProyectoDisponibleDto[] {
    return this.proyectos.filter((p) => p.estaActiva);
  }

  get inactivos(): ProyectoDisponibleDto[] {
    return this.proyectos.filter((p) => !p.estaActiva);
  }

  activar(proyecto: ProyectoDisponibleDto): void {
    if (!this.empresaId) return;
    Swal.fire({
      icon: 'question',
      title: '¿Activar proyecto?',
      text: `La empresa podrá operar en "${proyecto.nombre}".`,
      showCancelButton: true,
      confirmButtonText: 'Activar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((result) => {
      if (!result.isConfirmed || !this.empresaId) return;
      this.procesando = proyecto.id;
      this.habEmpresaService.activarProyecto(this.empresaId, proyecto.id).subscribe({
        next: () => {
          this.procesando = null;
          this.changed.emit();
          this.loadProyectos();
        },
        error: (err) => {
          this.procesando = null;
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  desactivar(proyecto: ProyectoDisponibleDto): void {
    if (!this.empresaId) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Desactivar proyecto?',
      text: `La empresa dejará de operar en "${proyecto.nombre}".`,
      showCancelButton: true,
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    }).then((result) => {
      if (!result.isConfirmed || !this.empresaId) return;
      this.procesando = proyecto.id;
      this.habEmpresaService.desactivarProyecto(this.empresaId, proyecto.id).subscribe({
        next: () => {
          this.procesando = null;
          this.changed.emit();
          this.loadProyectos();
        },
        error: (err) => {
          this.procesando = null;
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  close(): void {
    this.closed.emit();
  }
}
