import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjectLinkService } from '../../services/project-link.service';
import { ProjectLinkDto } from '../../dtos/project-link.dto';
import { ProjectLinkUpdateDto } from '../../dtos/project-link-update.dto';
import { ProjectLinkFilterDto } from '../../dtos/project-link-filter.dto';
import { ProjectLinkEdit } from './edit/edit';
import { PagedResponseDTO } from '../../../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-project-link-list',
  standalone: true,
  imports: [CommonModule, ProjectLinkEdit],
  templateUrl: './list.html',
})
export class ProjectLinkList implements OnInit {
  @Input() filters: ProjectLinkFilterDto = { projectId: null, page: 1 };
  @Output() pagedData = new EventEmitter<PagedResponseDTO<ProjectLinkDto>>();

  items: ProjectLinkDto[] = [];
  showEditModal = false;
  editDto: ProjectLinkUpdateDto = { projectLinkId: 0, linkUrl: '', active: true };

  constructor(
    private service: ProjectLinkService,
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

  openEdit(item: ProjectLinkDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editDto = {
      projectLinkId: item.projectLinkId,
      linkUrl: item.linkUrl,
      active: item.active,
    };
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
