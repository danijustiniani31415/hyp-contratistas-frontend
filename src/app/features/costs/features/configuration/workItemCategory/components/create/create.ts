import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { WorkItemCategoryService } from '../../services/work-item-category.service';
import { WorkSpecialtyOptionDto } from '../../dtos/work-item-category.dto';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-work-item-category-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './create.html',
})
export class WorkItemCategoryCreate implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  description = '';
  specialtyId: number | null = null;
  specialties: WorkSpecialtyOptionDto[] = [];

  constructor(
    private service: WorkItemCategoryService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.service.getSpecialties().subscribe({
      next: (res) => (this.specialties = res),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  save(): void {
    if (!this.description.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa una descripción.' });
      return;
    }
    if (!this.specialtyId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Selecciona la especialidad.' });
      return;
    }

    this.loaderService.show();
    this.service.create({ workItemCategoryDescription: this.description.trim(), workSpecialtyId: this.specialtyId }).subscribe({
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
