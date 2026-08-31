import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgramacionHabilitacionDto } from '../../../../../ssoma/salud-ocupacional/dtos/programacion-habilitacion.dto';
import { ProgramacionService } from '../../../../../ssoma/salud-ocupacional/services/programacion.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';

@Component({
  selector: 'app-emos-programados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emos-programados.html',
  styleUrl: './emos-programados.css',
})
export class EmosProgramados implements OnInit {
  @Input() proyectos: ProjectGetDTO[] = [];
  @Output() closed = new EventEmitter<void>();

  programaciones: ProgramacionHabilitacionDto[] = [];
  loading = false;

  filtroEstado = '';
  filtroProyectoId: number | null = null;
  filtroFecha = '';
  soloNoNotificados = false;

  readonly estados = ['Programado', 'Aceptado por Clínica', 'En Atención'];

  constructor(private programacionService: ProgramacionService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.programacionService.getHabilitacion({
      estado: this.filtroEstado || undefined,
      proyectoId: this.filtroProyectoId ?? undefined,
      fecha: this.filtroFecha || undefined,
      soloNoNotificados: this.soloNoNotificados || undefined,
    }).subscribe({
      next: (res) => {
        console.log('[EmosProgramados] response:', res);
        this.programaciones = res ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[EmosProgramados] error:', err?.status, err?.message, err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleNotificado(item: ProgramacionHabilitacionDto): void {
    const nuevo = !item.notificado;
    this.programacionService.patchNotificado(item.id, nuevo).subscribe({
      next: () => { item.notificado = nuevo; },
    });
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroProyectoId = null;
    this.filtroFecha = '';
    this.soloNoNotificados = false;
    this.cargar();
  }

  badgeClass(estado: string): string {
    if (estado === 'Programado') return 'badge-blue';
    if (estado === 'Aceptado') return 'badge-green';
    if (estado === 'En Atención') return 'badge-orange';
    return 'badge-gray';
  }
}
