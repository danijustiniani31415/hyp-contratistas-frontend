import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../../shared/components/search-select/search-select';
import { FolderPicker } from '../../folder-picker/folder-picker';
import { AdjudicacionFolderService } from '../../../services/adjudicacion-folder.service';
import { AdjudicacionFolderUpdateDto } from '../../../dtos/adjudicacion-folder-update.dto';
import { LoaderService } from '../../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-adjudicacion-folder-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, FolderPicker],
  templateUrl: './edit.html',
})
export class AdjudicacionFolderEdit {
  /** dto incluye driveId/folderId actuales para preseleccionar la carpeta. */
  @Input() dto: AdjudicacionFolderUpdateDto = { projectAdjudicacionFolderId: 0, linkUrl: '', driveId: '', folderId: '', active: true };
  @Input() folderName: string | null = null;
  /** Descripción del tipo de carpeta (solo informativa; el tipo no se edita). */
  @Input() folderTypeDescription: string | null = null;

  readonly statusOptions = [
    { value: true, label: 'ACTIVO' },
    { value: false, label: 'INACTIVO' },
  ];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  constructor(
    private service: AdjudicacionFolderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  onFolderSelected(e: { driveId: string; folderId: string; folderName: string }): void {
    this.dto.driveId = e.driveId;
    this.dto.folderId = e.folderId;
  }

  save(): void {
    if (!this.dto.linkUrl.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa el link de la carpeta.' });
      return;
    }
    if (!this.dto.driveId || !this.dto.folderId) {
      Swal.fire({ icon: 'warning', title: 'Selecciona una carpeta', text: 'Pulsa "Detectar" y elige la carpeta de destino.' });
      return;
    }

    this.loaderService.show();
    this.service.update({ ...this.dto, linkUrl: this.dto.linkUrl.trim() }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Carpeta actualizada exitosamente', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
