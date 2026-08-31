import { Component, ChangeDetectorRef, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SubAreaService } from '../../services/subarea.service';
import { AreaService } from '../../services/area.service';
import { SubAreaPagedDTO } from '../../dtos/subAreaPaged.model';
import { SubAreaGetDTO } from '../../dtos/subArea.model';
import { SubAreaEditDTO } from '../../dtos/subAreaEdit.model';
import { AreaSimpleDTO } from '../../dtos/areaSimple.model';
import { SubAreaEdit } from './sub-area-edit/sub-area-edit';
import { PsssScopeEdit } from '../psss-scope-edit/psss-scope-edit';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { ApiMessageDTO } from '../../../../../../../core/dtos/api/ApiMessage.model';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sub-area-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SubAreaEdit, PsssScopeEdit, SearchSelect],
  templateUrl: './sub-area-list.html',
  styleUrl: './sub-area-list.css',
})
export class SubAreaList implements OnInit {
  subAreas: SubAreaPagedDTO = { page: 0, pageSize: 0, totalRecords: 0, totalPages: 0, data: [] };
  editDto: SubAreaEditDTO = { subAreaId: 0, areaId: 0, subAreaDescription: '', active: true };
  areas: AreaSimpleDTO[] = [];
  selectedAreaId: number | null = null;
  showEditModal = false;

  scopeAreaId?: number;
  scopeSubAreaId?: number;
  scopeEntityName = '';
  showScopeModal = false;

  @Output() pagedData = new EventEmitter<SubAreaPagedDTO>();

  constructor(
    private subAreaService: SubAreaService,
    private areaService: AreaService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
  ) {}

  ngOnInit() {
    this.loadAreaOptions();
    setTimeout(() => this.loadSubAreas(1));
  }

  loadAreaOptions(): void {
    this.areaService.getAreaSimple().subscribe({
      next: (data) => (this.areas = data),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  loadSubAreas(page: number = 1) {
    this.loaderService.show();
    this.subAreaService.getSubAreaPaged(page, this.selectedAreaId).subscribe({
      next: (response) => {
        this.subAreas = response;
        this.pagedData.emit(response);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onAreaFilterChange() {
    this.loadSubAreas(1);
  }

  openEditModal(item: SubAreaGetDTO, event: MouseEvent) {
    event.stopPropagation();
    this.editDto = {
      subAreaId: item.subAreaId,
      areaId: item.areaId,
      subAreaDescription: item.subAreaDescription,
      active: item.active,
    };
    this.showEditModal = true;
  }

  openScopeModal(item: SubAreaGetDTO, event: MouseEvent) {
    event.stopPropagation();
    this.scopeAreaId = item.areaId;
    this.scopeSubAreaId = item.subAreaId;
    this.scopeEntityName = item.subAreaDescription;
    this.showScopeModal = true;
  }

  deleteSubArea(subAreaId: number, event: MouseEvent) {
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
      if (result.isConfirmed) {
        this.loaderService.show();
        this.subAreaService.deleteSubArea(subAreaId).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loadSubAreas(this.subAreas.page);
            this.loaderService.hide();
            this.cdr.detectChanges();
            Swal.fire({ title: '¡Eliminado!', text: response.message ?? 'El registro ha sido eliminado.', confirmButtonColor: '#64BC04', icon: 'success' });
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      }
    });
  }
}
