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
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { DatePicker } from '../../../../../../shared/components/date-picker/date-picker';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AuthService } from '../../../../../../core/services/auth.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { EmpresaContratistaListDto } from '../../../../dtos/empresa.model';
import { InduccionService } from '../../../../services/induccion.service';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';
import { InduccionTrabajadorDto } from '../../../../dtos/induccion.model';

@Component({
  selector: 'app-programar-induccion',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, DatePicker, SearchSelect],
  templateUrl: './programar-induccion.html',
  styleUrl: './programar-induccion.css',
})
export class ProgramarInduccion implements OnChanges {
  @Input() open = false;
  /**
   * Proyectos de la empresa del contratista logueado. Solo se usa cuando el usuario es
   * contratista: en ese caso el desplegable debe limitarse a los proyectos de su empresa.
   * Para el resto de usuarios el catálogo se pide aquí mismo al abrir el modal (ver
   * `cargarProyectos`), porque la inducción tiene su propio filtro de proyectos.
   */
  @Input() proyectos: ProjectGetDTO[] = [];
  @Input() empresas: EmpresaContratistaListDto[] = [];
  /** empresaId del primer worker seleccionado en la lista principal; null = sin filtro */
  @Input() preselectedEmpresaId: number | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  step = 1;

  /** Catálogo propio de la inducción; solo se usa cuando el usuario NO es contratista. */
  private proyectosInduccion: ProjectGetDTO[] = [];
  loadingProyectos = false;
  private esContratista = false;

  /**
   * Opciones efectivas del desplegable. Para el contratista se devuelve el input tal cual (y no
   * una copia) para no perder la actualización si el padre termina de cargar sus proyectos
   * después de que el modal ya se abrió.
   */
  get proyectosCombo(): ProjectGetDTO[] {
    return this.esContratista ? this.proyectos : this.proyectosInduccion;
  }

  proyectoId: number | null = null;
  /** Fecha en formato `YYYY-MM-DD` (el que emite `app-date-picker`), o null si no hay selección. */
  fechaProgramada: string | null = null;
  trabajoAltura = false;
  equipoElectrico = false;

  workers: InduccionTrabajadorDto[] = [];
  loadingWorkers = false;
  workerSearch = '';
  selectedWorkerIds: number[] = [];
  filtroObraOficina = '';

  saving = false;

  constructor(
    private induccionService: InduccionService,
    private trabajadorHabService: TrabajadorHabService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {
    this.esContratista = this.authService.isContratista();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
      this.cargarProyectos();
    }
  }

  /**
   * Carga las opciones del desplegable de proyecto. El contratista se queda con los proyectos
   * de su empresa (input `proyectos`); el resto de usuarios recibe el catálogo propio de la
   * inducción, que se filtra con `HABILITACION_INDUCCION` y no con el filtro de Habilitación
   * general que alimenta la lista de trabajadores y los EMOs programados. Se pide al abrir el
   * modal para no sumar una petición al cargar la página.
   */
  private cargarProyectos(): void {
    if (this.esContratista) return;

    this.loadingProyectos = true;
    this.trabajadorHabService.getProyectosInduccion().subscribe({
      next: (res) => {
        this.proyectosInduccion = (res ?? []).map(
          (p) => ({ projectId: p.id, projectDescription: p.nombre }) as unknown as ProjectGetDTO,
        );
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.proyectosInduccion = [];
        this.loadingProyectos = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  private reset(): void {
    this.step = 1;
    this.proyectoId = null;
    this.fechaProgramada = null;
    this.trabajoAltura = false;
    this.equipoElectrico = false;
    this.workers = [];
    this.workerSearch = '';
    this.selectedWorkerIds = [];
    this.filtroObraOficina = '';
  }

  get empresaEsAbril(): boolean {
    if (!this.preselectedEmpresaId) return false;
    return this.empresas.find((e) => e.id === this.preselectedEmpresaId)?.esAbril ?? false;
  }

  get canGoToStep2(): boolean {
    return !!this.proyectoId && !!this.fechaProgramada;
  }

  get workersFiltrados(): InduccionTrabajadorDto[] {
    let list = this.workers;
    if (this.filtroObraOficina === 'Obra') {
      list = list.filter((w) => w.obraOficina === 'Obra');
    } else if (this.filtroObraOficina === 'Staff') {
      list = list.filter((w) => w.obraOficina !== 'Obra');
    }
    const q = this.workerSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (w) =>
          w.apellidoNombre.toLowerCase().includes(q) ||
          (w.dni ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }

  get todosSeleccionados(): boolean {
    const visible = this.workersFiltrados;
    return visible.length > 0 && visible.every((w) => this.selectedWorkerIds.includes(w.workerId));
  }

  goToStep2(): void {
    if (!this.canGoToStep2) return;
    this.step = 2;
    this.workers = [];
    this.selectedWorkerIds = [];
    this.workerSearch = '';
    this.filtroObraOficina = '';
    this.loadWorkers();
  }

  private loadWorkers(): void {
    this.loadingWorkers = true;
    this.induccionService
      .getTrabajadoresPorProgramar(this.proyectoId!, this.preselectedEmpresaId)
      .subscribe({
        next: (res) => {
          this.workers = res ?? [];
          this.loadingWorkers = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loadingWorkers = false;
          this.errorService.handleError(err);
        },
      });
  }

  toggleWorker(workerId: number): void {
    if (this.selectedWorkerIds.includes(workerId)) {
      this.selectedWorkerIds = this.selectedWorkerIds.filter((id) => id !== workerId);
    } else {
      this.selectedWorkerIds = [...this.selectedWorkerIds, workerId];
    }
  }

  toggleTodos(): void {
    const ids = this.workersFiltrados.map((w) => w.workerId);
    if (this.todosSeleccionados) {
      this.selectedWorkerIds = this.selectedWorkerIds.filter((id) => !ids.includes(id));
    } else {
      const nuevos = ids.filter((id) => !this.selectedWorkerIds.includes(id));
      this.selectedWorkerIds = [...this.selectedWorkerIds, ...nuevos];
    }
  }

  get canConfirm(): boolean {
    return this.selectedWorkerIds.length > 0 && !this.saving;
  }

  confirmar(): void {
    if (!this.canConfirm || !this.proyectoId || !this.fechaProgramada) return;

    const firstWorker = this.workers.find((w) => this.selectedWorkerIds.includes(w.workerId));
    const empresaId = firstWorker?.empresaId ?? undefined;

    const dto = {
      proyectoId: this.proyectoId,
      empresaId,
      fechaProgramada: this.fechaProgramada,
      trabajoAltura: this.trabajoAltura,
      equipoElectrico: this.equipoElectrico,
      workerIds: this.selectedWorkerIds,
    };

    this.saving = true;
    this.loaderService.show();
    this.induccionService.crearBatch(dto).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        const n = this.selectedWorkerIds.length;
        Swal.fire({
          icon: 'success',
          title: 'Inducción programada',
          text: `Se programó la inducción para ${n} trabajador${n !== 1 ? 'es' : ''}.`,
          timer: 2000,
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
