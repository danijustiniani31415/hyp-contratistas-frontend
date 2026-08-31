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
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';
import { EmpresaContratistaService } from '../../../../services/empresa-contratista.service';
import { AgregarProyectoDto, WorkerProyectoDto } from '../../../../dtos/trabajador.model';

interface AgregarProyectoFormData {
  proyectoId: number | null;
  fechaInicio: string;
}

@Component({
  selector: 'app-agregar-proyecto',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './agregar-proyecto.html',
  styleUrl: './agregar-proyecto.css',
})
export class AgregarProyecto implements OnChanges {
  @Input() workerId: number | null = null;
  @Input() workerNombre = '';
  @Input() contrataCasa: string | null = null;
  @Input() empresaId: number | null = null;
  @Output() proyectoAgregado = new EventEmitter<WorkerProyectoDto>();
  @Output() cerrar = new EventEmitter<void>();

  proyectos: ProjectGetDTO[] = [];
  model: AgregarProyectoFormData = this.empty();
  saving = false;
  loadingCatalogos = false;

  constructor(
    private trabajadorHabService: TrabajadorHabService,
    private projectService: ProjectService,
    private empresaContratistaService: EmpresaContratistaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['workerId'] && this.workerId !== null) {
      this.model = this.empty();
      this.loadCatalogos();
    }
  }

  get isOpen(): boolean {
    return this.workerId !== null;
  }

  get canSubmit(): boolean {
    return !this.saving && this.model.proyectoId !== null && !!this.model.fechaInicio;
  }

  private empty(): AgregarProyectoFormData {
    return {
      proyectoId: null,
      fechaInicio: new Date().toISOString().substring(0, 10),
    };
  }

  private loadCatalogos(): void {
    this.loadingCatalogos = true;

    if (this.contrataCasa !== 'Casa' && this.empresaId !== null) {
      this.empresaContratistaService.getProyectos(this.empresaId).subscribe({
        next: (res) => {
          this.proyectos = (res ?? []).map((p) => ({
            projectId: p.proyectoId,
            projectDescription: p.proyectoNombre,
          } as ProjectGetDTO));
          this.loadingCatalogos = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.proyectos = [];
          this.loadingCatalogos = false;
          this.errorService.handleError(err);
        },
      });
    } else {
      this.projectService.getProjectsPaged({ page: 1, pageSize: 200 }).subscribe({
        next: (res) => {
          this.proyectos = res.data ?? [];
          this.loadingCatalogos = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.proyectos = [];
          this.loadingCatalogos = false;
          this.errorService.handleError(err);
        },
      });
    }
  }

  submit(): void {
    if (!this.canSubmit || this.workerId === null || this.model.proyectoId === null) return;

    const dto: AgregarProyectoDto = {
      proyectoId: this.model.proyectoId,
      fechaInicio: this.model.fechaInicio || undefined,
    };

    this.saving = true;
    this.loaderService.show();

    this.trabajadorHabService.agregarProyecto(this.workerId, dto).subscribe({
      next: (res) => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Proyecto agregado',
          timer: 1500,
          showConfirmButton: false,
        });
        this.proyectoAgregado.emit(res);
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
    this.cerrar.emit();
  }
}
