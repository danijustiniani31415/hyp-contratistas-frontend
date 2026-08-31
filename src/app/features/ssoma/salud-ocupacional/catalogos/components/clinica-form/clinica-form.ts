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
import { forkJoin, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import { ClinicaSimpleDto, ClinicaUpsertDto } from '../../../dtos/catalogos.model';

interface EmailEntry {
  email: string;
  nombre: string;
  id?: number;
}

@Component({
  selector: 'app-clinica-form',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SearchSelect],
  templateUrl: './clinica-form.html',
  styleUrl: './clinica-form.css',
})
export class ClinicaForm implements OnChanges {
  @Input() open = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initial: ClinicaSimpleDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  model: ClinicaUpsertDto = this.empty();
  emails: EmailEntry[] = [];
  saving = false;

  readonly estadoOpts = [
    { id: true, label: 'Activo' },
    { id: false, label: 'Inactivo' },
  ];

  private deletedEmailIds: number[] = [];

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

  private empty(): ClinicaUpsertDto {
    return { nombre: '', ruc: '', telefono: '', direccion: '', activo: true };
  }

  private reset(): void {
    this.deletedEmailIds = [];
    this.emails = [];
    if (this.mode === 'edit' && this.initial) {
      this.model = {
        nombre: this.initial.nombre,
        ruc: this.initial.ruc ?? '',
        telefono: this.initial.telefono ?? '',
        direccion: this.initial.direccion ?? '',
        activo: this.initial.activo,
      };
      this.service.getClinicaEmails(this.initial.id).subscribe({
        next: (list) => {
          this.emails = list.map((e) => ({ id: e.id, email: e.email, nombre: e.nombre }));
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    } else {
      this.model = this.empty();
    }
  }

  get title(): string {
    return this.mode === 'edit' ? 'Editar clínica' : 'Nueva clínica';
  }

  get canSubmit(): boolean {
    return !!this.model.nombre.trim() && !this.saving;
  }

  agregarEmail(): void {
    this.emails.push({ email: '', nombre: '' });
  }

  eliminarEmail(index: number): void {
    const entry = this.emails[index];
    if (entry.id) {
      this.deletedEmailIds.push(entry.id);
    }
    this.emails.splice(index, 1);
  }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({ icon: 'warning', title: 'Falta el nombre de la clínica' });
      return;
    }

    const payload: ClinicaUpsertDto = {
      nombre: this.model.nombre.trim(),
      ruc: this.model.ruc?.toString().trim() || null,
      telefono: this.model.telefono?.toString().trim() || null,
      direccion: this.model.direccion?.toString().trim() || null,
      activo: this.model.activo ?? true,
    };

    this.saving = true;
    this.loaderService.show();

    const req$ =
      this.mode === 'edit' && this.initial
        ? this.service.updateClinica(this.initial.id, payload)
        : this.service.createClinica(payload);

    req$.subscribe({
      next: (clinica) => this.syncEmails(clinica.id),
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  private syncEmails(clinicaId: number): void {
    const toCreate = this.emails.filter((e) => !e.id && e.email.trim());
    const ops: Observable<unknown>[] = [
      ...toCreate.map((e) =>
        this.service.createClinicaEmail(clinicaId, {
          email: e.email.trim(),
          nombre: e.nombre.trim(),
        }),
      ),
      ...this.deletedEmailIds.map((id) => this.service.deleteClinicaEmail(clinicaId, id)),
    ];

    if (ops.length === 0) {
      this.onSaveSuccess();
      return;
    }

    forkJoin(ops).subscribe({
      next: () => this.onSaveSuccess(),
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  private onSaveSuccess(): void {
    this.saving = false;
    this.loaderService.hide();
    Swal.fire({
      icon: 'success',
      title: this.mode === 'edit' ? 'Clínica actualizada' : 'Clínica creada',
      timer: 1500,
      showConfirmButton: false,
    });
    this.saved.emit();
  }

  close(): void {
    this.closed.emit();
  }
}
