import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SubAreaService } from '../../services/subarea.service';
import { AreaService } from '../../services/area.service';
import { SubAreaCreateDTO } from '../../dtos/subAreaCreate.model';
import { AreaSimpleDTO } from '../../dtos/areaSimple.model';
import { ApiMessageDTO } from '../../../../../../../core/dtos/api/ApiMessage.model';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sub-area-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './sub-area-create.html',
  styleUrl: './sub-area-create.css',
})
export class SubAreaCreate implements OnInit, OnChanges {
  @Input() showCreateModal = false;
  @Output() closeCreateModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly estadoOptions = [{ id: true, name: 'ACTIVO' }, { id: false, name: 'INACTIVO' }];
  areas: AreaSimpleDTO[] = [];
  createDto: SubAreaCreateDTO = { areaId: 0, subAreaDescription: '', active: true };

  constructor(
    private subAreaService: SubAreaService,
    private areaService: AreaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAreaOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['showCreateModal']?.currentValue === true) {
      this.loadAreaOptions();
    }
  }

  loadAreaOptions(): void {
    this.areaService.getAreaSimple().subscribe({
      next: (data) => (this.areas = data),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  save() {
    if (!this.createDto.areaId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccione un área' });
      return;
    }
    if (!this.createDto.subAreaDescription.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese una descripción' });
      return;
    }

    this.subAreaService.checkAreaScope(this.createDto.areaId).subscribe({
      next: ({ hasScope }) => {
        if (hasScope) {
          Swal.fire({
            icon: 'warning',
            title: '¿Desea continuar?',
            text: 'Al agregar esta subárea se eliminarán las relaciones de scope configuradas para el área. Esta acción no se puede deshacer.',
            showCancelButton: true,
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#64BC04',
          }).then((result) => {
            if (result.isConfirmed) this.doCreate();
          });
        } else {
          this.doCreate();
        }
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private doCreate(): void {
    this.loaderService.show();
    this.subAreaService.createSubArea(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.loaderService.hide();
        this.createDto = { areaId: 0, subAreaDescription: '', active: true };
        this.closeCreateModal.emit();
        this.saved.emit();
        this.cdr.detectChanges();
        Swal.fire({ title: response.message ?? 'Subárea creada exitosamente', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
