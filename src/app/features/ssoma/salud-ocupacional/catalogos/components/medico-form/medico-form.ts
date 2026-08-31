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
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import {
  ClinicaSimpleDto,
  MedicoSimpleDto,
  MedicoUpsertDto,
} from '../../../dtos/catalogos.model';

@Component({
  selector: 'app-medico-form',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SearchSelect],
  templateUrl: './medico-form.html',
  styleUrl: './medico-form.css',
})
export class MedicoForm implements OnChanges {
  @Input() open = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initial: MedicoSimpleDto | null = null;
  @Input() clinicas: ClinicaSimpleDto[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  model: MedicoUpsertDto = this.empty();
  saving = false;

  readonly estadoOpts = [
    { id: true, label: 'Activo' },
    { id: false, label: 'Inactivo' },
  ];

  constructor(
    private service: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
    }
  }

  private empty(): MedicoUpsertDto {
    return {
      apellidoNombre: '',
      dni: '',
      cmp: '',
      especialidad: '',
      clinicaId: null,
      email: '',
      celular: '',
      activo: true,
    };
  }

  private reset(): void {
    if (this.mode === 'edit' && this.initial) {
      this.model = {
        apellidoNombre: this.initial.apellidoNombre,
        dni: this.initial.dni ?? '',
        cmp: this.initial.cmp ?? '',
        especialidad: this.initial.especialidad ?? '',
        clinicaId: this.initial.clinicaId ?? null,
        email: this.initial.email ?? '',
        celular: this.initial.celular ?? '',
        activo: this.initial.activo,
      };
    } else {
      this.model = this.empty();
    }
  }

  get title(): string {
    return this.mode === 'edit' ? 'Editar médico' : 'Nuevo médico';
  }

  get canSubmit(): boolean {
    return !!this.model.apellidoNombre.trim() && !this.saving;
  }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({ icon: 'warning', title: 'Falta el nombre del médico' });
      return;
    }
    const payload: MedicoUpsertDto = {
      apellidoNombre: this.model.apellidoNombre.trim(),
      dni: this.model.dni?.toString().trim() || null,
      cmp: this.model.cmp?.toString().trim() || null,
      especialidad: this.model.especialidad?.toString().trim() || null,
      clinicaId: this.model.clinicaId || null,
      email: this.model.email?.toString().trim() || null,
      celular: this.model.celular?.toString().trim() || null,
      activo: this.model.activo ?? true,
    };

    this.saving = true;
    this.loaderService.show();
    const req$ =
      this.mode === 'edit' && this.initial
        ? this.service.updateMedico(this.initial.id, payload)
        : this.service.createMedico(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: this.mode === 'edit' ? 'Médico actualizado' : 'Médico creado',
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
