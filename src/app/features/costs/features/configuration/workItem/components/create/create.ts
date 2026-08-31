import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { WorkItemService } from '../../services/work-item.service';
import { WorkItemCategoryOptionDto } from '../../dtos/work-item.dto';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-work-item-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './create.html',
})
export class WorkItemCreate implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  description = '';
  categoryId: number | null = null;
  categories: WorkItemCategoryOptionDto[] = [];

  constructor(
    private service: WorkItemService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.service.getCategories().subscribe({
      next: (res) => (this.categories = res),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  save(): void {
    if (!this.description.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa una descripción.' });
      return;
    }
    if (!this.categoryId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Selecciona la partida de control.' });
      return;
    }

    this.loaderService.show();
    this.service
      .create({
        workItemDescription: this.description.trim(),
        workItemCategoryId: this.categoryId,
      })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: res.message ?? 'Registro creado exitosamente', draggable: true });
          this.saved.emit();
          this.closeModal.emit();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }
}
