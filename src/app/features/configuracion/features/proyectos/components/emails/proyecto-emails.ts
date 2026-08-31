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
import { ProjectService } from '../../../../../../core/services/project.service';
import {
  ProjectEmailsDTO,
  ResidenteOptionDTO,
} from '../../../../../../core/dtos/project/projectEmails.model';

@Component({
  selector: 'app-proyecto-emails',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './proyecto-emails.html',
  styleUrl: './proyecto-emails.css',
})
export class ProyectoEmails implements OnChanges {
  @Input() open = false;
  @Input() projectId = 0;
  @Input() projectDescription = '';
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  model: ProjectEmailsDTO = this.empty();
  /** Trabajadores elegibles como residente; vienen en la misma respuesta del GET. */
  residentes: ResidenteOptionDTO[] = [];
  loadingInitial = false;
  saving = false;

  constructor(
    private projectService: ProjectService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.projectId) {
      this.model = this.empty();
      this.residentes = [];
      this.loadCurrent();
    }
  }

  private empty(): ProjectEmailsDTO {
    return {
      residenteWorkersId: null,
      emailResponsable: '',
      emailRrhh: '',
      emailCoordSsoma: '',
      emailCoordAdmin: '',
    };
  }

  private loadCurrent(): void {
    this.loadingInitial = true;
    this.projectService.getProjectEmails(this.projectId).subscribe({
      next: (res) => {
        this.model = {
          residenteWorkersId: res?.residenteWorkersId ?? null,
          emailResponsable:   res?.emailResponsable   ?? '',
          emailRrhh:          res?.emailRrhh          ?? '',
          emailCoordSsoma:    res?.emailCoordSsoma    ?? '',
          emailCoordAdmin:    res?.emailCoordAdmin    ?? '',
        };
        this.residentes = res?.residentes ?? [];
        this.loadingInitial = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingInitial = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Correo que realmente se va a usar, para mostrarlo bajo el desplegable. */
  get residenteEmail(): string | null {
    const id = this.model.residenteWorkersId;
    if (!id) return null;
    return this.residentes.find((r) => r.workerId === id)?.email ?? null;
  }

  submit(): void {
    if (this.saving) return;

    const payload: ProjectEmailsDTO = {
      residenteWorkersId: this.model.residenteWorkersId ?? null,
      emailResponsable:   this.normalize(this.model.emailResponsable),
      emailRrhh:          this.normalize(this.model.emailRrhh),
      emailCoordSsoma:    this.normalize(this.model.emailCoordSsoma),
      emailCoordAdmin:    this.normalize(this.model.emailCoordAdmin),
    };

    this.saving = true;
    this.loaderService.show();
    this.projectService.patchProjectEmails(this.projectId, payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: res?.message ?? 'Emails actualizados',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error?.message ?? 'Ocurrió un error al guardar los emails.',
        });
        this.cdr.detectChanges();
      },
    });
  }

  private normalize(value: string | null | undefined): string | null {
    const v = (value ?? '').toString().trim();
    return v.length ? v : null;
  }

  close(): void {
    this.closed.emit();
  }
}
