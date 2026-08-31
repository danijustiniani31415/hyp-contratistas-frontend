import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';
import { EvaluacionService } from '../../../../services/evaluacion.service';
import { WorkerHabilitacionListDto } from '../../../../dtos/trabajador.model';
import { CriterioEvalDto, EvalCreateDto } from '../../../../dtos/evaluacion.model';

const CRITERIOS_DEFAULT: CriterioEvalDto[] = [
  { id: 1, nombre: 'Liderazgo y dirección de equipo', orden: 1, activo: true },
  { id: 2, nombre: 'Cumplimiento de procedimientos SSOMA', orden: 2, activo: true },
  { id: 3, nombre: 'Conocimiento técnico', orden: 3, activo: true },
  { id: 4, nombre: 'Comunicación con el equipo', orden: 4, activo: true },
  { id: 5, nombre: 'Gestión del tiempo y planificación', orden: 5, activo: true },
  { id: 6, nombre: 'Resolución de problemas', orden: 6, activo: true },
  { id: 7, nombre: 'Compromiso con la calidad', orden: 7, activo: true },
  { id: 8, nombre: 'Trabajo en equipo y cooperación', orden: 8, activo: true },
  { id: 9, nombre: 'Puntualidad y asistencia', orden: 9, activo: true },
  { id: 10, nombre: 'Actitud y disposición frente al trabajo', orden: 10, activo: true },
];

@Component({
  selector: 'app-eval-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './eval-form.html',
  styleUrl: './eval-form.css',
})
export class EvalForm implements OnChanges, OnDestroy {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  proyectos: ProjectGetDTO[] = [];

  workersSearch = '';
  workersResultados: WorkerHabilitacionListDto[] = [];
  loadingWorkers = false;
  selectedWorker: WorkerHabilitacionListDto | null = null;

  proyectoId: number | null = null;
  mes: number = new Date().getMonth() + 1;
  anio: number = new Date().getFullYear();

  criterios: CriterioEvalDto[] = [];
  notas: Record<number, number | null> = {};

  saving = false;

  meses = [
    { num: 1, label: 'Enero' },
    { num: 2, label: 'Febrero' },
    { num: 3, label: 'Marzo' },
    { num: 4, label: 'Abril' },
    { num: 5, label: 'Mayo' },
    { num: 6, label: 'Junio' },
    { num: 7, label: 'Julio' },
    { num: 8, label: 'Agosto' },
    { num: 9, label: 'Septiembre' },
    { num: 10, label: 'Octubre' },
    { num: 11, label: 'Noviembre' },
    { num: 12, label: 'Diciembre' },
  ];

  private searchChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private evalService: EvaluacionService,
    private trabajadorHabService: TrabajadorHabService,
    private projectService: ProjectService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {
    this.searchChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.searchWorkers());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
      this.loadProyectos();
      this.loadCriterios();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private reset(): void {
    this.workersSearch = '';
    this.workersResultados = [];
    this.selectedWorker = null;
    this.proyectoId = null;
    this.mes = new Date().getMonth() + 1;
    this.anio = new Date().getFullYear();
    this.notas = {};
  }

  private loadProyectos(): void {
    this.projectService.getProjectPaged(1).subscribe({
      next: (res) => {
        this.proyectos = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.proyectos = [];
      },
    });
  }

  private loadCriterios(): void {
    this.evalService.getCriterios().subscribe({
      next: (res) => {
        const list = res?.length ? res : CRITERIOS_DEFAULT;
        this.applyCriterios(list);
      },
      error: () => {
        this.applyCriterios(CRITERIOS_DEFAULT);
      },
    });
  }

  private applyCriterios(list: CriterioEvalDto[]): void {
    this.criterios = [...list].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    this.notas = {};
    this.criterios.forEach((c) => (this.notas[c.id] = null));
    this.cdr.detectChanges();
  }

  onWorkersSearchChange(): void {
    this.searchChange$.next();
  }

  private searchWorkers(): void {
    const term = this.workersSearch.trim();
    if (!term) {
      this.workersResultados = [];
      return;
    }
    this.loadingWorkers = true;
    this.trabajadorHabService
      .getTrabajadores({ search: term, page: 1, pageSize: 20 })
      .subscribe({
        next: (res) => {
          this.workersResultados = res.data ?? [];
          this.loadingWorkers = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.workersResultados = [];
          this.loadingWorkers = false;
        },
      });
  }

  selectWorker(w: WorkerHabilitacionListDto): void {
    this.selectedWorker = w;
    this.workersSearch = w.apellidoNombre;
    this.workersResultados = [];
  }

  clearWorker(): void {
    this.selectedWorker = null;
    this.workersSearch = '';
  }

  setNota(criterioId: number, value: any): void {
    if (value === '' || value === null || value === undefined) {
      this.notas[criterioId] = null;
      return;
    }
    let n = Number(value);
    if (Number.isNaN(n)) n = 0;
    n = Math.min(10, Math.max(0, n));
    this.notas[criterioId] = n;
  }

  get notaTotal(): number {
    const valores = Object.values(this.notas).filter(
      (v): v is number => typeof v === 'number',
    );
    if (valores.length === 0) return 0;
    const suma = valores.reduce((a, b) => a + b, 0);
    return Math.round((suma / valores.length) * 100) / 100;
  }

  get title(): string {
    return 'Nueva evaluación';
  }

  get canSubmit(): boolean {
    if (this.saving) return false;
    if (!this.selectedWorker) return false;
    if (!this.proyectoId) return false;
    if (!this.mes || !this.anio) return false;
    return this.criterios.every((c) => typeof this.notas[c.id] === 'number');
  }

  submit(): void {
    if (!this.canSubmit || !this.selectedWorker || !this.proyectoId) return;

    if (!this.selectedWorker.empresaId) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'El trabajador seleccionado no tiene empresa asociada.',
      });
      return;
    }

    const payload: EvalCreateDto = {
      workerId: this.selectedWorker.workerId,
      empresaId: this.selectedWorker.empresaId,
      proyectoId: this.proyectoId,
      mes: this.mes,
      anio: this.anio,
      items: this.criterios.map((c) => ({
        criterioId: c.id,
        nota: Number(this.notas[c.id] ?? 0),
      })),
    };

    this.saving = true;
    this.loaderService.show();

    this.evalService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Evaluación registrada',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
