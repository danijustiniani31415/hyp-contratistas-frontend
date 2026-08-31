import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { ProjectLinkService } from '../../services/project-link.service';
import { ProjectLinkFormDataDto } from '../../dtos/project-link-form-data.dto';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-project-link-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './create.html',
})
export class ProjectLinkCreate {
  @Input() formData: ProjectLinkFormDataDto = { projects: [], types: [] };
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  projectId: number | null = null;
  projectLinkTypeId: number | null = null;
  linkUrl = '';

  constructor(
    private service: ProjectLinkService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  save(): void {
    if (!this.projectId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Selecciona un proyecto.' });
      return;
    }
    if (!this.projectLinkTypeId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Selecciona el tipo de link.' });
      return;
    }
    if (!this.linkUrl.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa la URL del link.' });
      return;
    }

    this.loaderService.show();
    this.service
      .create({
        projectId: this.projectId,
        projectLinkTypeId: this.projectLinkTypeId,
        linkUrl: this.linkUrl.trim(),
      })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: res.message ?? 'Link registrado exitosamente', draggable: true });
          this.saved.emit();
          this.closeModal.emit();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }
}
