import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { AreaService } from '../../services/area.service';
import { AreaCreateDTO } from '../../dtos/areaCreate.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiMessageDTO } from '../../../../../../../core/dtos/api/ApiMessage.model';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-area-create',
  imports: [FormsModule, CommonModule, BaseModal, SearchSelect],
  templateUrl: './area-create.html',
  styleUrl: './area-create.css',
})
export class AreaCreate {
  readonly estadoOptions = [{ id: true, name: 'ACTIVO' }, { id: false, name: 'INACTIVO' }];
  createDto: AreaCreateDTO = {
    areaDescription: '',
    active: true,
  };
  @Input() showCreateModal: boolean = false;
  @Output() closeCreateModal = new EventEmitter<void>();
  @Output() loadAreas = new EventEmitter();

  constructor(
    private areaService: AreaService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
  ) {}

  saveArea() {
    if (!this.createDto.areaDescription.trim()) {
      return;
    }
    this.loaderService.show();
    this.areaService.createArea(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.closeCreateModal.emit();
        this.createDto = { areaDescription: '', active: true };
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.loadAreas.emit();
        Swal.fire({
          title: response.message ?? 'Área creada exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
