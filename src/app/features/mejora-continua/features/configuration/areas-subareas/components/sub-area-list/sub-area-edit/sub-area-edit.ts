import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SubAreaService } from '../../../services/subarea.service';
import { SubAreaEditDTO } from '../../../dtos/subAreaEdit.model';
import { AreaSimpleDTO } from '../../../dtos/areaSimple.model';
import { ApiMessageDTO } from '../../../../../../../../core/dtos/api/ApiMessage.model';
import { LoaderService } from '../../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../../core/services/error.service';
import { BaseModal } from '../../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../../shared/components/search-select/search-select';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sub-area-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './sub-area-edit.html',
  styleUrl: './sub-area-edit.css',
})
export class SubAreaEdit {
  readonly estadoOptions = [{ id: true, name: 'ACTIVO' }, { id: false, name: 'INACTIVO' }];
  @Input() editDto: SubAreaEditDTO = { subAreaId: 0, areaId: 0, subAreaDescription: '', active: true };
  @Input() areas: AreaSimpleDTO[] = [];
  @Input() showEditModal = false;
  @Output() closeEditModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  constructor(
    private subAreaService: SubAreaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  save(event: MouseEvent) {
    event.stopPropagation();
    if (!this.editDto.areaId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccione un área' });
      return;
    }
    if (!this.editDto.subAreaDescription.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese una descripción' });
      return;
    }
    this.loaderService.show();
    this.subAreaService.editSubArea(this.editDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.loaderService.hide();
        this.closeEditModal.emit();
        this.saved.emit();
        this.cdr.detectChanges();
        Swal.fire({ title: response.message ?? 'Subárea actualizada exitosamente', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
