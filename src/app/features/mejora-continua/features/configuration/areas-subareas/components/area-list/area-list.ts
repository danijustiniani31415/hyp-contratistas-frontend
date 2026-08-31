import { Component, ChangeDetectorRef, Output, EventEmitter, OnInit } from '@angular/core';
import { AreaService } from '../../services/area.service';
import { AreaPagedDTO } from '../../dtos/areaPaged.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiMessageDTO } from '../../../../../../../core/dtos/api/ApiMessage.model';
import { HttpErrorResponse } from '@angular/common/http';
import { AreaGetDTO } from '../../dtos/area.model';
import { AreaEdit } from './area-edit/area-edit';
import { PsssScopeEdit } from '../psss-scope-edit/psss-scope-edit';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { AreaEditDTO } from '../../dtos/areaEdit.model';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-area-list',
  imports: [CommonModule, FormsModule, AreaEdit, PsssScopeEdit],
  templateUrl: './area-list.html',
  styleUrl: './area-list.css',
})
export class AreaList implements OnInit {
  areas: AreaPagedDTO = { page: 0, pageSize: 0, totalRecords: 0, totalPages: 0, data: [] };

  editDto: AreaEditDTO = { areaId: 0, areaDescription: '', active: true };
  showEditModal = false;

  scopeAreaId?: number;
  scopeEntityName = '';
  showScopeModal = false;

  @Output() pagedData = new EventEmitter<AreaPagedDTO>();

  constructor(
    private areaService: AreaService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
  ) {}

  ngOnInit() {
    setTimeout(() => this.loadAreas(1));
  }

  loadAreas(page: number = 1) {
    this.loaderService.show();
    this.areaService.getAreaPaged(page).subscribe({
      next: (response) => {
        this.areas = response;
        this.pagedData.emit(response);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openEditModal(area: AreaGetDTO, event: MouseEvent) {
    event.stopPropagation();
    this.editDto = { areaId: area.areaId, areaDescription: area.areaDescription, active: area.active };
    this.showEditModal = true;
  }

  openScopeModal(area: AreaGetDTO, event: MouseEvent) {
    event.stopPropagation();
    this.scopeAreaId = area.areaId;
    this.scopeEntityName = area.areaDescription;
    this.showScopeModal = true;
  }

  deleteArea(areaId: number, event: MouseEvent) {
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
        this.areaService.deleteArea(areaId).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loadAreas();
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
