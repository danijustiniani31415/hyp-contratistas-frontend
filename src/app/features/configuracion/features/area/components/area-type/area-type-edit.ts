import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AreaTypeService } from '../../services/area-type.service';
import { AreaTypeEditDto } from '../../dtos/areaType.model';

@Component({
  selector: 'app-area-type-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './area-type-edit.html',
})
export class AreaTypeEdit {
  @Input() dto!: AreaTypeEditDto;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly estadoOptions = [
    { id: true, name: 'ACTIVO' },
    { id: false, name: 'INACTIVO' },
  ];

  constructor(
    private service: AreaTypeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  save(): void {
    if (!this.dto.areaTypeName.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese la descripción.' });
      return;
    }
    this.loaderService.show();
    this.service.update(this.dto).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({
          title: res.message ?? 'Tipo de área actualizado',
          icon: 'success',
          confirmButtonColor: '#64BC04',
        });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
