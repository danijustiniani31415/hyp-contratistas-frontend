import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserList } from './list/list';
import { UserCreate } from './create/create';
import { AbrilWorkerCreate } from './abril-worker-create/abril-worker-create';
import { UserEditForm } from './components/user-edit-form/user-edit-form';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { UserListItemDto } from '../../../../core/dtos/user/userListItem.model';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { UserCategoriaOptionDto } from './dtos/user-filters.dto';

import { SECURITY_TABS } from '../../shared/security-tabs';
@Component({
  selector: 'app-users',
  imports: [
    CommonModule,
    UserList,
    UserCreate,
    AbrilWorkerCreate,
    UserEditForm,
    Paginator,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchSelect,
  ],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {
  readonly tabs = SECURITY_TABS;
  showCreateModal = false;
  showAbrilWorkerModal = false;
  formOpen = false;
  formUser: UserListItemDto | null = null;
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  /**
   * Filtros de la tabla. Viven acá y no en la lista porque el botón que abre el panel se
   * proyecta en el encabezado, que es de esta página; la lista solo recibe el valor elegido.
   */
  filtrosAbiertos = false;
  categorias: UserCategoriaOptionDto[] = [];
  categoriaId: number | null = null;

  @ViewChild(UserList) userList!: UserList;

  /** Cantidad de filtros con valor, para el badge del botón "Filtros". */
  get filtrosActivos(): number {
    return this.categoriaId !== null ? 1 : 0;
  }

  /** Las opciones llegan con la carga inicial de la lista, en la misma petición que la tabla. */
  onCategoriasLoaded(categorias: UserCategoriaOptionDto[]) {
    this.categorias = categorias;
  }

  onCategoriaChange(categoriaId: number | null) {
    this.categoriaId = categoriaId;
    this.userList.setCategoriaFilter(categoriaId);
  }

  limpiarFiltros() {
    if (this.categoriaId === null) return;
    this.onCategoriaChange(null);
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  openEditForm(user: UserListItemDto) {
    this.formUser = user;
    this.formOpen = true;
  }

  onEditSaved() {
    this.formOpen = false;
    this.reloadUsers();
  }

  changePage(page: number) {
    this.currentPage = page;
    this.userList.loadUsers(page);
  }

  updatePagination(data: PagedResponseDTO<UserListItemDto>) {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }

  reloadUsers() {
    this.userList.loadUsers(this.currentPage);
  }
}
