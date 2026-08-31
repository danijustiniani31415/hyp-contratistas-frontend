import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdjudicacionFolderService } from '../../services/adjudicacion-folder.service';
import { FolderItemDto } from '../../dtos/folder-browse.dto';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';

interface Crumb {
  id: string;
  name: string;
}

/**
 * Navegador de carpetas de OneDrive/SharePoint.
 * El usuario pega el link, pulsa "Detectar", y navega las subcarpetas hasta
 * la carpeta deseada (p. ej. "Contratos"). Emite la carpeta seleccionada.
 */
@Component({
  selector: 'app-folder-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './folder-picker.html',
})
export class FolderPicker {
  /** Link inicial (en edición). */
  @Input() linkUrl = '';
  /** Carpeta ya seleccionada (en edición): se muestra como selección actual. */
  @Input() initialDriveId: string | null = null;
  @Input() initialFolderId: string | null = null;
  @Input() initialFolderName: string | null = null;

  @Output() linkUrlChange = new EventEmitter<string>();
  /** Emite { driveId, folderId, folderName } cada vez que cambia la carpeta seleccionada. */
  @Output() selected = new EventEmitter<{ driveId: string; folderId: string; folderName: string }>();

  driveId: string | null = null;
  breadcrumb: Crumb[] = [];
  folders: FolderItemDto[] = [];
  detected = false;

  constructor(
    private service: AdjudicacionFolderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    // En edición: mostrar la carpeta ya elegida como selección inicial.
    if (this.initialDriveId && this.initialFolderId) {
      this.driveId = this.initialDriveId;
      this.emitSelected(this.initialFolderId, this.initialFolderName ?? 'Carpeta seleccionada');
    }
  }

  get currentFolder(): Crumb | null {
    return this.breadcrumb.length ? this.breadcrumb[this.breadcrumb.length - 1] : null;
  }

  onLinkChange(value: string): void {
    this.linkUrl = value;
    this.linkUrlChange.emit(value);
  }

  detect(): void {
    if (!this.linkUrl.trim()) {
      this.errorService.handleError({ error: { message: 'Ingresa el link de la carpeta.' }, status: 400 } as HttpErrorResponse);
      return;
    }
    this.loaderService.show();
    this.service.resolveLink(this.linkUrl.trim()).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.driveId = res.driveId;
        this.breadcrumb = [{ id: res.folderId, name: res.folderName || 'Carpeta raíz' }];
        this.folders = res.folders;
        this.detected = true;
        this.emitSelected(res.folderId, res.folderName || 'Carpeta raíz');
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  openFolder(f: FolderItemDto): void {
    if (!this.driveId) return;
    this.loaderService.show();
    this.service.getFolders(this.driveId, f.id).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.breadcrumb = [...this.breadcrumb, { id: f.id, name: f.name }];
        this.folders = res;
        this.emitSelected(f.id, f.name);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  goToCrumb(index: number): void {
    if (!this.driveId || index >= this.breadcrumb.length - 1) return;
    const crumb = this.breadcrumb[index];
    this.loaderService.show();
    this.service.getFolders(this.driveId, crumb.id).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.breadcrumb = this.breadcrumb.slice(0, index + 1);
        this.folders = res;
        this.emitSelected(crumb.id, crumb.name);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private emitSelected(folderId: string, folderName: string): void {
    if (!this.driveId) return;
    this.selected.emit({ driveId: this.driveId, folderId, folderName });
  }
}
