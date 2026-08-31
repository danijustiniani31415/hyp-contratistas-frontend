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
import { AuthService } from '../../../../../../core/services/auth.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';
import { EmpresaContratistaService } from '../../../../services/empresa-contratista.service';
import { CatalogosSaludService } from '../../../../../ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmpresaSimpleDto } from '../../../../../ssoma/salud-ocupacional/dtos/catalogos.model';
import { WorkerHabilitacionListDto, WorkerReingresoDto } from '../../../../dtos/trabajador.model';

interface ReingresoFormData {
  fechaReingreso: string;
  nuevoProyectoId: number | null;
  nuevaEmpresaId: number | null;
}

@Component({
  selector: 'app-reingreso-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './reingreso-form.html',
  styleUrl: './reingreso-form.css',
})
export class ReingresoForm implements OnChanges {
  @Input() open = false;
  @Input() initial: WorkerHabilitacionListDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  proyectos: ProjectGetDTO[] = [];
  empresas: EmpresaSimpleDto[] = [];
  model: ReingresoFormData = this.empty();
  saving = false;
  loadingCatalogos = false;

  constructor(
    private trabajadorHabService: TrabajadorHabService,
    private projectService: ProjectService,
    private empresaContratistaService: EmpresaContratistaService,
    private catalogosService: CatalogosSaludService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.model = this.empty();
      this.loadCatalogos();
    }
  }

  private empty(): ReingresoFormData {
    return {
      fechaReingreso: new Date().toISOString().substring(0, 10),
      nuevoProyectoId: null,
      nuevaEmpresaId: null,
    };
  }

  private loadCatalogos(): void {
    this.loadingCatalogos = true;

    if (this.authService.isContratista()) {
      const empresaId = this.authService.getEmpresaId();
      if (empresaId) {
        this.empresaContratistaService.getProyectos(empresaId).subscribe({
          next: (res) => {
            this.proyectos = (res ?? []).map((p) => ({
              projectId: p.proyectoId,
              projectDescription: p.proyectoNombre,
            })) as unknown as ProjectGetDTO[];
            this.loadingCatalogos = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.proyectos = [];
            this.loadingCatalogos = false;
            this.errorService.handleError(err);
          },
        });
      } else {
        this.proyectos = [];
        this.loadingCatalogos = false;
      }
      return;
    }

    this.projectService.getProjectsPaged({ page: 1, pageSize: 200 }).subscribe({
      next: (res) => {
        this.proyectos = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.proyectos = [];
        this.errorService.handleError(err);
      },
    });
    this.catalogosService.getEmpresas().subscribe({
      next: (res) => {
        this.empresas = res ?? [];
        this.loadingCatalogos = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.empresas = [];
        this.loadingCatalogos = false;
        this.errorService.handleError(err);
      },
    });
  }

  get esCasa(): boolean {
    return this.initial?.contrataCasa === 'Casa';
  }

  get canSubmit(): boolean {
    return !this.saving;
  }

  submit(): void {
    if (!this.canSubmit || !this.initial) return;

    Swal.fire({
      icon: 'question',
      title: '¿Reingresar trabajador?',
      text: `¿Reingresar a ${this.initial.apellidoNombre}? Se notificará por correo a los responsables.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, reingresar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((result) => {
      if (!result.isConfirmed || !this.initial) return;

      const dto: WorkerReingresoDto = {};
      if (this.model.nuevoProyectoId) dto.nuevoProyectoId = this.model.nuevoProyectoId;
      if (this.model.nuevaEmpresaId) dto.nuevaEmpresaId = this.model.nuevaEmpresaId;
      if (this.model.fechaReingreso) dto.fechaReingreso = this.model.fechaReingreso;

      this.saving = true;
      this.loaderService.show();

      this.trabajadorHabService.reingresar(this.initial.workerId, dto).subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Trabajador reingresado', timer: 1500, showConfirmButton: false });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
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
