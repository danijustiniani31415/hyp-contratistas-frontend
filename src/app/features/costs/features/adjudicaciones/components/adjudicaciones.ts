import { Component, OnInit } from '@angular/core';
import { Card } from './card/card';
import { Create } from './create/create';
import { Detail } from './detail/detail';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AdjudicacionesService } from '../services/adjudicaciones.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { Roles } from '../../../../../core/constants/roles';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjectSubContractorDTO } from '../dtos/projectSubContractorDto.model';
import { ProjectSubContractorFiltersDTO } from '../dtos/projectSubContractorFilters.model';
import { ProjectSimpleDTO } from '../../../../../core/dtos/project/projectSimple.model';
import { ContractTypeSimpleDTO } from '../dtos/contractTypeSimple.model';
import { ContractModalitySimpleDTO } from '../dtos/contractModalitySimple.model';
import { PaymentMethodSimpleDTO } from '../dtos/paymentMethodSimple.model';
import { ProjectSubContractorStatusSimpleDTO } from '../dtos/projectSubContractorStatusSimple.model';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';

import { COSTS_TABS } from '../../../shared/costs-tabs';
@Component({
  standalone: true,
  selector: 'app-adjudicaciones',
  imports: [Card, Create, Detail, CommonModule, FormsModule, Paginator, SearchSelect, AbrilPageHeaderComponent],
  templateUrl: './adjudicaciones.html',
  styleUrl: './adjudicaciones.css',
})
export class Adjudicaciones implements OnInit {
  readonly tabs = COSTS_TABS;
  items: ProjectSubContractorDTO[] = [];
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  // Listas para los desplegables
  projects: ProjectSimpleDTO[] = [];
  contractTypes: ContractTypeSimpleDTO[] = [];
  contractModalities: ContractModalitySimpleDTO[] = [];
  paymentMethods: PaymentMethodSimpleDTO[] = [];
  projectSubContractorStatuses: ProjectSubContractorStatusSimpleDTO[] = [];

  filters: ProjectSubContractorFiltersDTO = {
    page: 1,
    projectId: null,
    contributorName: '',
    contributorRuc: '',
    contractTypeId: null,
    contractModalityId: null,
    paymentMethodId: null,
    projectSubContractorStatusId: null,
  };

  showAdvanced = false;
  showCreateModal = false;
  selectedItem: ProjectSubContractorDTO | null = null;

  /** Solo Oficina Central y el Administrador pueden crear adjudicaciones. Oficina Técnica lo tiene bloqueado. */
  canCreate = false;

  constructor(
    private adjudicacionesService: AdjudicacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.canCreate =
      this.authService.hasRole(Roles.COSTOS_OFICINA_CENTRAL) ||
      this.authService.hasRole(Roles.COSTOS_ADMINISTRADOR);
    this.loadPagedWithFilters();
  }

  private loadPagedWithFilters(): void {
    // Primera carga: obtener lista + listas de filtros en una sola llamada
    this.loaderService.show();
    this.adjudicacionesService.getAdjudicacionPagedWithFilters(this.filters).subscribe({
      next: (response) => {
        this.items = response.paged.data;
        this.currentPage = response.paged.page;
        this.totalPages = response.paged.totalPages;
        this.totalRecords = response.paged.totalRecords;
        this.projects = response.filters.projects;
        this.contractTypes = response.filters.contractTypes;
        this.contractModalities = response.filters.contractModalities;
        this.paymentMethods = response.filters.paymentMethods;
        this.projectSubContractorStatuses = response.filters.projectSubContractorStatuses;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.loaderService.hide();
      },
    });
  }

  load(page: number = 1) {
    this.filters.page = page;
    this.loaderService.show();
    this.adjudicacionesService.getAdjudicacionPaged(this.filters).subscribe({
      next: (response) => {
        this.items = response.data;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.totalRecords = response.totalRecords;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  search(): void {
    this.load(1);
  }

  openCreateModal() {
    if (!this.canCreate) return;
    this.showCreateModal = true;
  }

  openDetail(item: ProjectSubContractorDTO) {
    this.selectedItem = item;
  }

  /**
   * Llamado cuando el Detail emite statusChanged (avance de paso, generación de paquete, etc.).
   * Recarga la página actual y actualiza selectedItem para que apunte al objeto refrescado
   * del servidor, evitando que mutaciones locales queden en un objeto huérfano.
   */
  onStatusChanged(): void {
    const prevId = this.selectedItem?.projectSubContractorId;
    this.filters.page = this.currentPage;
    this.loaderService.show();
    this.adjudicacionesService.getAdjudicacionPaged(this.filters).subscribe({
      next: (response) => {
        this.items = response.data;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.totalRecords = response.totalRecords;
        if (prevId != null) {
          const refreshed = this.items.find(i => i.projectSubContractorId === prevId);
          if (refreshed) this.selectedItem = refreshed;
        }
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
