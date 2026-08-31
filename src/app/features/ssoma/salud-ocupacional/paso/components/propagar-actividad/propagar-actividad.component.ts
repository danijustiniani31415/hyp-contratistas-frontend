import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { PasoActividadService } from '../../services/paso-actividad.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { PasoActividadDto, PasoListItemDto } from '../../dtos/paso.dtos';

type Opcion = 'solo_este' | 'solo_plantilla' | 'este_y_plantilla' | 'todos';

@Component({
  selector: 'app-propagar-actividad',
  standalone: true,
  imports: [CommonModule, AbrilModalPanel],
  templateUrl: './propagar-actividad.component.html',
  styleUrl: './propagar-actividad.component.css',
})
export class PropagArActividadComponent {
  @Input() actividad!: PasoActividadDto;
  @Input() pasoActual!: PasoListItemDto;
  @Input() programas: PasoListItemDto[] = [];
  @Output() propagado = new EventEmitter<void>();
  @Output() cerrado = new EventEmitter<void>();

  opcionSeleccionada: Opcion = 'solo_este';
  saving = false;

  readonly opciones: Opcion[] = ['solo_este', 'solo_plantilla', 'este_y_plantilla', 'todos'];

  constructor(
    private actividadService: PasoActividadService,
    private errorService: ErrorService,
  ) {}

  get plantilla(): PasoListItemDto | undefined {
    return this.programas.find(p => p.esPlantilla);
  }

  get programasActivos(): PasoListItemDto[] {
    return this.programas.filter(p =>
      !p.esPlantilla &&
      p.id !== this.pasoActual.id &&
      p.estado === 'Activo'
    );
  }

  get destinosSeleccionados(): PasoListItemDto[] {
    switch (this.opcionSeleccionada) {
      case 'solo_este':        return [];
      case 'solo_plantilla':
        return (this.plantilla ? [this.plantilla] : [])
          .filter(p => p.id !== this.pasoActual.id);
      case 'este_y_plantilla':
        return (this.plantilla ? [this.plantilla] : [])
          .filter(p => p.id !== this.pasoActual.id);
      case 'todos':
        return [
          ...this.programasActivos,
          ...(this.plantilla ? [this.plantilla] : []),
        ].filter(p => p.id !== this.pasoActual.id);
      default: return [];
    }
  }

  opcionIcono(o: Opcion): string {
    const m: Record<Opcion, string> = {
      solo_este:        'ti-map-pin',
      solo_plantilla:   'ti-template',
      este_y_plantilla: 'ti-copy',
      todos:            'ti-world',
    };
    return m[o];
  }

  opcionTitulo(o: Opcion): string {
    const m: Record<Opcion, string> = {
      solo_este:        'Solo este proyecto',
      solo_plantilla:   'Solo la plantilla',
      este_y_plantilla: 'Este proyecto + plantilla',
      todos:            'Todos los proyectos activos',
    };
    return m[o];
  }

  opcionDesc(o: Opcion): string {
    switch (o) {
      case 'solo_este':
        return `Queda únicamente en ${this.pasoActual.proyectoNombre ?? this.pasoActual.nombre}`;
      case 'solo_plantilla':
        return 'Proyectos nuevos la heredarán automáticamente';
      case 'este_y_plantilla':
        return 'Aplica aquí y a futuros proyectos';
      case 'todos':
        return `Se agrega a ${this.programasActivos.length} proyectos + plantilla`;
    }
  }

  aplicar(): void {
    if (this.opcionSeleccionada === 'solo_este') {
      this.propagado.emit();
      return;
    }

    const destinos = this.destinosSeleccionados;
    if (!destinos.length) { this.propagado.emit(); return; }

    this.saving = true;
    const requests = destinos.map(p =>
      this.actividadService.create({
        pasoId: p.id,
        categoriaId: this.actividad.categoriaId,
        nombre: this.actividad.nombre,
        descripcion: this.actividad.descripcion ?? undefined,
        alcance: this.actividad.alcance ?? undefined,
        frecuencia: this.actividad.frecuencia,
        responsableId: this.actividad.responsableId ?? undefined,
        responsableTexto: this.actividad.responsableTexto ?? undefined,
        mesInicio: this.actividad.mesInicio,
        mesFin: this.actividad.mesFin,
        cantidadPlanificada: this.actividad.cantidadPlanificada,
        horas: this.actividad.horas ?? undefined,
        recursos: this.actividad.recursos ?? undefined,
        indicador: this.actividad.indicador,
        meta: this.actividad.meta,
        orden: this.actividad.orden ?? undefined,
      })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.saving = false;
        this.propagado.emit();
      },
      error: (err) => {
        this.saving = false;
        this.errorService.handleError(err);
      },
    });
  }
}
