import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../../../environments/environment';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { FileSelector, SelectedFile } from '../../../../shared/components/file-selector/file-selector';
import { LoteEditor } from './lote-editor/lote-editor';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { CroquisService } from '../services/croquis.service';
import { ProjectCroquisItemDTO } from '../dtos/croquis.dto';

import { VECINOS_TABS } from '../../shared/vecinos-tabs';
@Component({
  selector: 'app-croquis',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, BaseModal, FileSelector, LoteEditor],
  templateUrl: './croquis.html',
})
export class Croquis implements OnInit {
  readonly tabs = VECINOS_TABS;
  items: ProjectCroquisItemDTO[] = [];
  searchText = '';

  // Modal de subida/reemplazo.
  uploadTarget: ProjectCroquisItemDTO | null = null;
  selectedFile: SelectedFile | null = null;

  // Modal de vista previa ampliada.
  previewItem: ProjectCroquisItemDTO | null = null;

  // Editor de lotes.
  editItem: ProjectCroquisItemDTO | null = null;

  constructor(
    private service: CroquisService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  /** URL absoluta del croquis (las rutas guardadas son relativas al backend). */
  imageSrc(url?: string | null): string {
    if (!url) return '';
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  private load(search?: string): void {
    this.loaderService.show();
    this.service.getProjects(search).subscribe({
      next: (res) => {
        this.items = res;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  search(): void {
    this.load(this.searchText);
  }

  // ── Subida / reemplazo ──────────────────────────────────────────────────
  openUpload(item: ProjectCroquisItemDTO): void {
    this.uploadTarget = item;
    this.selectedFile = null;
  }

  closeUpload(): void {
    this.uploadTarget = null;
    this.selectedFile = null;
  }

  onFileSelected(file: SelectedFile): void {
    this.selectedFile = file;
  }

  confirmUpload(): void {
    if (!this.uploadTarget || !this.selectedFile) return;
    const projectId = this.uploadTarget.projectId;

    this.loaderService.show();
    this.service.assignCroquis(projectId, this.selectedFile.file).subscribe({
      next: () => {
        this.loaderService.hide();
        this.closeUpload();
        Swal.fire({ title: 'Croquis asignado exitosamente', icon: 'success', draggable: true });
        this.load(this.searchText);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Vista previa ────────────────────────────────────────────────────────
  openPreview(item: ProjectCroquisItemDTO): void {
    if (!item.imageUrl) return;
    this.previewItem = item;
  }

  closePreview(): void {
    this.previewItem = null;
  }

  // ── Editor de lotes ───────────────────────────────────────────────────────
  openEditor(item: ProjectCroquisItemDTO): void {
    if (!item.projectCroquisId) return;
    this.editItem = item;
  }

  closeEditor(): void {
    this.editItem = null;
  }
}
