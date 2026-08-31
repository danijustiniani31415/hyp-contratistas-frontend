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
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';
import { CatalogosHabService } from '../../../../services/catalogos-hab.service';
import {
  WorkerEditDto,
  WorkerHabilitacionListDto,
} from '../../../../dtos/trabajador.model';
import { AreaCatDto, SubareaCatDto } from '../../../../dtos/catalogos.model';

interface EditarPerfilForm {
  apellidoNombre: string;
  celular: string;
  fechaNacimiento: string;
  fechaRetiro: string;
  sctr: boolean | null;
  area: string;
  subarea: string;
  jefatura: string;
}

@Component({
  selector: 'app-hab-editar-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './editar-perfil.html',
  styleUrl: './editar-perfil.css',
})
export class EditarPerfil implements OnChanges {
  @Input() open = false;
  @Input() worker: WorkerHabilitacionListDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  areas: AreaCatDto[] = [];
  subareas: SubareaCatDto[] = [];

  model: EditarPerfilForm = this.empty();
  obraOficina = '';
  saving = false;
  loadingDetalle = false;

  get mostrarCamposArea(): boolean {
    return this.obraOficina === 'Staff' || this.obraOficina === 'Oficina Central';
  }

  get mostrarSctr(): boolean {
    return this.obraOficina === 'Oficina Central';
  }

  constructor(
    private trabajadorHabService: TrabajadorHabService,
    private catalogosHabService: CatalogosHabService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.worker) {
      this.model = this.empty();
      this.model.apellidoNombre = this.worker.apellidoNombre ?? '';
      this.obraOficina = this.worker.obraOficina ?? '';
      this.subareas = [];
      this.loadAreas();
      this.loadDetalle(this.worker.workerId);
    }
  }

  private empty(): EditarPerfilForm {
    return {
      apellidoNombre: '',
      celular: '',
      fechaNacimiento: '',
      fechaRetiro: '',
      sctr: null,
      area: '',
      subarea: '',
      jefatura: '',
    };
  }

  private loadAreas(): void {
    this.catalogosHabService.getAreas().subscribe({
      next: (res) => {
        console.log('[EditarPerfil] getAreas raw:', res);
        this.areas = res ?? [];
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        console.log('[EditarPerfil] getAreas error:', err);
        this.areas = [];
        this.errorService.handleError(err);
      },
    });
  }

  private loadDetalle(workerId: number): void {
    this.loadingDetalle = true;
    this.trabajadorHabService.getWorker(workerId).subscribe({
      next: (det) => {
        console.log('[EditarPerfil] getWorker raw:', det);
        this.model = {
          apellidoNombre: det.apellidoNombre ?? this.model.apellidoNombre,
          celular: det.celular ?? '',
          fechaNacimiento: det.fechaNacimiento ? det.fechaNacimiento.substring(0, 10) : '',
          fechaRetiro: det.fechaRetiro ? det.fechaRetiro.substring(0, 10) : '',
          sctr: det.sctr ?? null,
          area: det.area ?? '',
          subarea: det.subarea ?? '',
          jefatura: det.jefatura ?? '',
        };
        this.obraOficina = det.obraOficina ?? this.obraOficina;
        if (this.model.area) {
          this.loadSubareas(this.model.area, false);
        }
        this.loadingDetalle = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDetalle = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  private loadSubareas(area: string, resetSelection: boolean): void {
    if (!area) {
      this.subareas = [];
      if (resetSelection) {
        this.model.subarea = '';
        this.model.jefatura = '';
      }
      this.cdr.detectChanges();
      return;
    }
    this.catalogosHabService.getSubareas(area).subscribe({
      next: (res) => {
        console.log('[EditarPerfil] getSubareas raw (area=' + area + '):', res);
        this.subareas = res ?? [];
        if (resetSelection) {
          this.model.subarea = '';
          this.model.jefatura = '';
        }
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        console.log('[EditarPerfil] getSubareas error (area=' + area + '):', err);
        this.subareas = [];
        if (resetSelection) {
          this.model.subarea = '';
          this.model.jefatura = '';
        }
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  onAreaChange(area: string | null): void {
    this.model.area = area ?? '';
    this.loadSubareas(this.model.area, true);
  }

  onSubareaChange(subareaName: string | null): void {
    this.model.subarea = subareaName ?? '';
    if (!subareaName) {
      this.model.jefatura = '';
      return;
    }
    const found = this.subareas.find((s) => s.subarea === subareaName);
    this.model.jefatura = found?.jefatura ?? '';
  }

  get title(): string {
    return 'Editar perfil';
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.model.apellidoNombre.trim();
  }

  submit(): void {
    if (!this.canSubmit || !this.worker) return;

    const payload: WorkerEditDto = {
      apellidoNombre: this.model.apellidoNombre.trim(),
      celular: this.model.celular || undefined,
      fechaNacimiento: this.model.fechaNacimiento || undefined,
      fechaRetiro: this.model.fechaRetiro || undefined,
      sctr: this.model.sctr ?? undefined,
      area: this.model.area || undefined,
      subarea: this.model.subarea || undefined,
      jefatura: this.model.jefatura || undefined,
    };

    this.saving = true;
    this.loaderService.show();

    this.trabajadorHabService.updateWorker(this.worker.workerId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Perfil actualizado',
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
