import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { WorkItemCategoryService } from '../../services/work-item-category.service';
import { WorkItemCategoryDto } from '../../dtos/work-item-category.dto';
import { WorkItemCategoryEditDto } from '../../dtos/work-item-category-edit.dto';
import { WorkItemCategoryClauseDto, WorkItemCategoryAnexo3ClauseDto, WorkItemCategoryAnexo4ClauseDto } from '../../dtos/work-item-category.dto';
import { WorkItemCategoryFilterDto } from '../../dtos/work-item-category-filter.dto';
import { WorkItemCategoryEdit } from './edit/edit';
import { PagedResponseDTO } from '../../../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-work-item-category-list',
  standalone: true,
  imports: [CommonModule, WorkItemCategoryEdit],
  templateUrl: './list.html',
})
export class WorkItemCategoryList implements OnInit {
  @Input() filters: WorkItemCategoryFilterDto = { page: 1 };
  @Output() pagedData = new EventEmitter<PagedResponseDTO<WorkItemCategoryDto>>();
  @ViewChild('instructivoFileInput') instructivoFileInput!: ElementRef<HTMLInputElement>;

  items: WorkItemCategoryDto[] = [];
  showEditModal = false;
  editDto: WorkItemCategoryEditDto = { workItemCategoryId: 0, workItemCategoryDescription: '', workSpecialtyId: null, active: true, clauses: [], anexo3Clauses: [], anexo4Clauses: [] };
  editingClauses: WorkItemCategoryClauseDto[] = [];
  editingAnexo3Clauses: WorkItemCategoryAnexo3ClauseDto[] = [];
  editingAnexo4Clauses: WorkItemCategoryAnexo4ClauseDto[] = [];

  uploadingInstructivoId: number | null = null;
  private pendingUploadId: number | null = null;

  constructor(
    private service: WorkItemCategoryService,
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

  openEdit(item: WorkItemCategoryDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editDto = {
      workItemCategoryId: item.workItemCategoryId,
      workItemCategoryDescription: item.workItemCategoryDescription,
      workSpecialtyId: item.workSpecialtyId ?? null,
      active: item.active,
      clauses: [],
      anexo3Clauses: [],
      anexo4Clauses: [],
    };
    this.editingClauses = item.clauses ?? [];
    this.editingAnexo3Clauses = item.anexo3Clauses ?? [];
    this.editingAnexo4Clauses = item.anexo4Clauses ?? [];
    this.showEditModal = true;
  }

  triggerUploadInstructivo(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.pendingUploadId = id;
    this.instructivoFileInput.nativeElement.value = '';
    this.instructivoFileInput.nativeElement.click();
  }

  onInstructivoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.pendingUploadId == null) return;

    const id = this.pendingUploadId;
    this.uploadingInstructivoId = id;

    this.service.uploadInstructivo(id, file).subscribe({
      next: (res) => {
        this.uploadingInstructivoId = null;
        Swal.fire({ icon: 'success', title: res.message ?? 'Instructivo subido exitosamente.', confirmButtonColor: '#64BC04' });
        this.load(1);
      },
      error: (err: HttpErrorResponse) => {
        this.uploadingInstructivoId = null;
        this.errorService.handleError(err);
      },
    });
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
