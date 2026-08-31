import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../../shared/components/search-select/search-select';
import { ProjectLinkService } from '../../../services/project-link.service';
import { ProjectLinkUpdateDto } from '../../../dtos/project-link-update.dto';
import { LoaderService } from '../../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-project-link-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './edit.html',
})
export class ProjectLinkEdit {
  @Input() dto: ProjectLinkUpdateDto = { projectLinkId: 0, linkUrl: '', active: true };

  readonly statusOptions = [
    { value: true, label: 'ACTIVO' },
    { value: false, label: 'INACTIVO' },
  ];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  constructor(
    private service: ProjectLinkService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  save(): void {
    if (!this.dto.linkUrl.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa la URL del link.' });
      return;
    }

    this.loaderService.show();
    this.service.update({ ...this.dto, linkUrl: this.dto.linkUrl.trim() }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Link actualizado exitosamente', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
