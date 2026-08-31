import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AdjudicacionFolderService } from '../../services/adjudicacion-folder.service';
import { AdjudicacionFolderDto } from '../../dtos/adjudicacion-folder.dto';
import { AdjudicacionFolderUpdateDto } from '../../dtos/adjudicacion-folder-update.dto';
import { AdjudicacionFolderFilterDto } from '../../dtos/adjudicacion-folder-filter.dto';
import { AdjudicacionFolderEdit } from './edit/edit';
import { PagedResponseDTO } from '../../../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-adjudicacion-folder-list',
  standalone: true,
  imports: [CommonModule, AdjudicacionFolderEdit],
  templateUrl: './list.html',
})
export class AdjudicacionFolderList implements OnInit {
  @Input() filters: AdjudicacionFolderFilterDto = { projectId: null, page: 1 };
  @Output() pagedData = new EventEmitter<PagedResponseDTO<AdjudicacionFolderDto>>();

  items: AdjudicacionFolderDto[] = [];
  showEditModal = false;
  editDto: AdjudicacionFolderUpdateDto = { projectAdjudicacionFolderId: 0, linkUrl: '', driveId: '', folderId: '', active: true };
  editFolderName: string | null = null;
  editFolderTypeDescription: string | null = null;

  constructor(
    private service: AdjudicacionFolderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.load(1));
  }

  load(page: number = 1): void {
    this.loaderService.show();
    this.service.getPaged({ ...this.filters, page }).subscribe({
      next: (res) => {
        this.items = res.data;
        this.pagedData.emit(res);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openEdit(item: AdjudicacionFolderDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editDto = {
      projectAdjudicacionFolderId: item.projectAdjudicacionFolderId,
      linkUrl: item.linkUrl,
      driveId: item.driveId,
      folderId: item.folderId,
      active: item.active,
    };
    this.editFolderName = item.folderName ?? null;
    this.editFolderTypeDescription = item.folderTypeDescription;
    this.showEditModal = true;
  }

  delete(id: number, event: MouseEvent): void {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro/a?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.delete(id).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: res.message ?? 'Eliminado correctamente', confirmButtonColor: '#64BC04' });
          this.load(1);
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
