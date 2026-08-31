import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { AreaTypeDto } from '../dtos/areaType.model';
import { AreaItemDto } from '../dtos/areaItem.model';
import { AreaTypeList } from './area-type/area-type-list';
import { AreaTypeCreate } from './area-type/area-type-create';
import { AreaItemList } from './area-item/area-item-list';
import { AreaItemCreate } from './area-item/area-item-create';
import { AreaScopeList } from './area-scope/area-scope-list';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';

import { CONFIGURACION_TABS } from '../../../shared/configuracion-tabs';
type AreaSection = 'items' | 'scope' | 'types';

@Component({
  selector: 'app-area',
  standalone: true,
  imports: [
    CommonModule,
    Paginator,
    SectionTabs,
    AreaTypeList,
    AreaTypeCreate,
    AreaItemList,
    AreaItemCreate,
    AreaScopeList,
    AbrilPageHeaderComponent,
  ],
  templateUrl: './area.html',
  styleUrl: './area.css',
})
export class Area {
  readonly tabs = CONFIGURACION_TABS;
  @ViewChild(AreaTypeList) typeList!: AreaTypeList;
  @ViewChild(AreaItemList) itemList!: AreaItemList;
  @ViewChild(AreaScopeList) scopeList!: AreaScopeList;

  activeSection: AreaSection = 'items';
  readonly sectionTabs: SectionTab[] = [
    { id: 'items', label: 'Áreas' },
    { id: 'scope', label: 'Jerarquía' },
    { id: 'types', label: 'Tipos de área' },
  ];

  // Pagination state — tipos
  typePage = 1;
  typeTotalPages = 0;
  typeTotalRecords = 0;

  // Pagination state — items
  itemPage = 1;
  itemTotalPages = 0;
  itemTotalRecords = 0;

  showCreateTypeModal = false;
  showCreateItemModal = false;

  constructor(private cdr: ChangeDetectorRef) {}

  onSectionChange(id: string): void {
    this.activeSection = id as AreaSection;
  }

  openCreateType(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateTypeModal = true;
    this.cdr.detectChanges();
  }

  openCreateItem(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateItemModal = true;
    this.cdr.detectChanges();
  }

  openCreateScope(event: MouseEvent) {
    event.stopPropagation();
    this.scopeList?.openCreateBranch();
  }

  onTypePaged(data: PagedResponseDTO<AreaTypeDto>) {
    this.typePage = data.page;
    this.typeTotalPages = data.totalPages;
    this.typeTotalRecords = data.totalRecords;
  }

  onItemPaged(data: PagedResponseDTO<AreaItemDto>) {
    this.itemPage = data.page;
    this.itemTotalPages = data.totalPages;
    this.itemTotalRecords = data.totalRecords;
  }

  changeTypePage(page: number) {
    this.typeList.load(page);
  }

  changeItemPage(page: number) {
    this.itemList.load(page);
  }

  onTypeCreated() {
    this.showCreateTypeModal = false;
    this.typeList.load(this.typePage || 1);
    this.itemList?.loadAreaTypes();
  }

  onItemCreated() {
    this.showCreateItemModal = false;
    this.itemList.load(this.itemPage || 1);
    this.scopeList?.load();
  }

  onTypesChanged() {
    this.itemList?.loadAreaTypes();
    this.itemList?.load(this.itemPage || 1);
  }
}
