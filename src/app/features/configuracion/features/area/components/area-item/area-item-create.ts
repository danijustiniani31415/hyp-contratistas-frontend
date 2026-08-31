import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AreaTypeService } from '../../services/area-type.service';
import { AreaItemService } from '../../services/area-item.service';
import { AreaTypeSimpleDto } from '../../dtos/areaType.model';
import { AreaItemCreateDto } from '../../dtos/areaItem.model';

@Component({
  selector: 'app-area-item-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './area-item-create.html',
})
export class AreaItemCreate implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly estadoOptions = [
    { id: true, name: 'ACTIVO' },
    { id: false, name: 'INACTIVO' },
  ];

  dto: AreaItemCreateDto = {
    areaItemName: '',
    areaTypeId: 0,
    active: true,
  };

  areaTypes: AreaTypeSimpleDto[] = [];

  constructor(
    private areaTypeService: AreaTypeService,
    private areaItemService: AreaItemService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.areaTypeService.getSimple().subscribe({
      next: (data) => {
        this.areaTypes = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  save(): void {
    if (!this.dto.areaItemName.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese el nombre de área.' });
      return;
    }
    if (!this.dto.areaTypeId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccione un tipo.' });
      return;
    }
    this.loaderService.show();
    this.areaItemService.create(this.dto).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({
          title: res.message ?? 'Área creada',
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
