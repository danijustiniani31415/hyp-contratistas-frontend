import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { PasoService } from '../../services/paso.service';
import { PasoListItemDto, InstanciarPasoDto } from '../../dtos/paso.dtos';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';

@Component({
  selector: 'app-instanciar-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SearchSelect],
  templateUrl: './instanciar-modal.component.html',
  styleUrl: './instanciar-modal.component.css',
})
export class InstanciarModalComponent implements OnInit {
  @Input() pasoPlantillaId!: number;
  @Input() plantillaNombre = '';
  @Output() closed = new EventEmitter<void>();
  @Output() instanciaCreada = new EventEmitter<PasoListItemDto>();

  step = 1;
  proyectos: ProjectGetDTO[] = [];
  loadingProyectos = false;

  proyectoId: number | null = null;
  mesInicio: number = new Date().getMonth() + 1;
  nombreGenerado = '';
  saving = false;

  meses = [
    { valor: 1,  nombre: 'Enero' },
    { valor: 2,  nombre: 'Febrero' },
    { valor: 3,  nombre: 'Marzo' },
    { valor: 4,  nombre: 'Abril' },
    { valor: 5,  nombre: 'Mayo' },
    { valor: 6,  nombre: 'Junio' },
    { valor: 7,  nombre: 'Julio' },
    { valor: 8,  nombre: 'Agosto' },
    { valor: 9,  nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' },
  ];

  private _anio = new Date().getFullYear();
  get anio(): number { return this._anio; }
  set anio(value: number) {
    this._anio = value;
    this.loadProyectos();
  }

  constructor(
    private pasoService: PasoService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProyectos();
  }

  private loadProyectos(): void {
    this.loadingProyectos = true;
    this.proyectoId = null;
    forkJoin({
      pasos: this.pasoService.getAll({ esPlantilla: false, anio: this._anio, pageSize: 100 }),
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200 }),
    }).subscribe({
      next: ({ pasos, proyectos }) => {
        const proyectosConPaso = new Set(
          pasos.items.map(p => p.proyectoId).filter((id): id is number => id !== null)
        );
        this.proyectos = proyectos.data
          .filter(p => p.estado === 'ACTIVO' && !proyectosConPaso.has(p.projectId))
          .sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
    });
  }

  get proyectoNombre(): string {
    return this.proyectos.find(p => p.projectId === this.proyectoId)?.projectDescription ?? '';
  }

  siguente(): void {
    if (!this.proyectoId) {
      Swal.fire('', 'Selecciona un proyecto', 'warning');
      return;
    }
    this.nombreGenerado = `${this.plantillaNombre} — ${this.proyectoNombre} ${this.anio}`;
    this.step = 2;
  }

  anterior(): void {
    this.step = 1;
  }

  instanciar(): void {
    if (!this.proyectoId) return;
    this.saving = true;
    const dto: InstanciarPasoDto = {
      proyectoId: this.proyectoId,
      anio: this.anio,
      nombre: this.nombreGenerado,
      mesInicio: this.mesInicio,
    };
    this.pasoService.instanciar(this.pasoPlantillaId, dto).subscribe({
      next: (paso) => {
        this.saving = false;
        Swal.fire('Listo', 'Programa instanciado correctamente', 'success');
        this.instanciaCreada.emit(paso);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        Swal.fire('Error', err.error?.message ?? 'No se pudo instanciar', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
