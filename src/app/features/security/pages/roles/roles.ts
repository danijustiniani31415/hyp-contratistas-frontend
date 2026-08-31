import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleList } from './components/role-list/role-list';
import { RoleCreate } from './components/role-create/role-create';
import { RoleEdit } from './components/role-edit/role-edit';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { RoleDto } from './dtos/role.model';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';

import { SECURITY_TABS } from '../../shared/security-tabs';
@Component({
  selector: 'app-roles',
  imports: [CommonModule, RoleList, RoleCreate, RoleEdit, Paginator, AbrilPageHeaderComponent],
  templateUrl: './roles.html',
  styleUrl: './roles.css',
})
export class Roles {
  readonly tabs = SECURITY_TABS;
  showCreateModal = false;
  selectedRoleForEdit: RoleDto | null = null;
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  @ViewChild(RoleList) roleList!: RoleList;

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  openEditModal(role: RoleDto) {
    this.selectedRoleForEdit = role;
  }

  updatePagination(data: PagedResponseDTO<RoleDto>) {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }

  changePage(page: number) {
    this.currentPage = page;
    this.roleList.loadRoles(page);
  }

  reloadRoles() {
    this.roleList.loadRoles(this.currentPage);
  }
}
