import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { FolderPicker } from '../folder-picker/folder-picker';
import { AdjudicacionFolderService } from '../../services/adjudicacion-folder.service';
import { AdjudicacionFolderFormDataDto } from '../../dtos/adjudicacion-folder-form-data.dto';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-adjudicacion-folder-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, FolderPicker],
  templateUrl: './create.html',
})
export class AdjudicacionFolderCreate {
  @Input() formData: AdjudicacionFolderFormDataDto = { projects: [], folderTypes: [] };
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  projectId: number | null = null;
  folderTypeId: number | null = null;
  linkUrl = '';
  driveId: string | null = null;
  folderId: string | null = null;
  folderName: string | null = null;

  constructor(
    private service: AdjudicacionFolderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  onFolderSelected(e: { driveId: string; folderId: string; folderName: string }): void {
    this.driveId = e.driveId;
    this.folderId = e.folderId;
    this.folderName = e.folderName;
  }

  save(): void {
    if (!this.projectId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Selecciona un proyecto.' });
      return;
    }
    if (!this.folderTypeId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Selecciona el tipo de carpeta.' });
      return;
    }
    if (!this.linkUrl.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa el link de la carpeta.' });
      return;
    }
    if (!this.driveId || !this.folderId) {
      Swal.fire({ icon: 'warning', title: 'Selecciona una carpeta', text: 'Pulsa "Detectar" y elige la carpeta donde se guardarán los documentos.' });
      return;
    }

    this.loaderService.show();
    this.service
      .create({ projectId: this.projectId, folderTypeId: this.folderTypeId, linkUrl: this.linkUrl.trim(), driveId: this.driveId, folderId: this.folderId })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: res.message ?? 'Carpeta registrada exitosamente', draggable: true });
          this.saved.emit();
          this.closeModal.emit();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }
}
