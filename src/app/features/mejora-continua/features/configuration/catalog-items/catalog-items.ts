import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CatalogService, CatalogTypeDTO, CatalogItemDTO } from '../scope/catalog.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { CatalogItemForm } from './components/catalog-item-form/catalog-item-form';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import Swal from 'sweetalert2';

interface DuplicateGroup {
  description: string;
  count: number;
}

@Component({
  selector: 'app-catalog-items',
  standalone: true,
  imports: [CommonModule, FormsModule, CatalogItemForm, Paginator],
  templateUrl: './catalog-items.html',
  styleUrl: './catalog-items.css',
})
export class CatalogItems implements OnInit {
  types: CatalogTypeDTO[] = [];
  items: CatalogItemDTO[] = [];
  selectedTypeId: number | null = null;
  loadingTypes = true;
  loadingItems = false;

  showForm = false;
  editingItem: CatalogItemDTO | null = null;

  searchTerm = '';

  readonly pageSize = 20;
  currentPage = 1;

  /** Normaliza para comparar: mayúsculas, sin espacios al borde, espacios internos colapsados. */
  private normalize(text: string): string {
    return text.trim().toUpperCase().replace(/\s+/g, ' ');
  }

  get filteredItems(): CatalogItemDTO[] {
    const term = this.normalize(this.searchTerm);
    if (!term) return this.items;
    return this.items.filter((i) => this.normalize(i.catalogItemDescription).includes(term));
  }

  /** Descripciones duplicadas (tras normalizar) dentro del tipo activo. Se calcula sobre TODOS
   *  los ítems cargados del tipo, no sobre el resultado filtrado por el buscador. */
  get duplicateGroups(): DuplicateGroup[] {
    const counts = new Map<string, number>();
    for (const item of this.items) {
      const key = this.normalize(item.catalogItemDescription);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([description, count]) => ({ description, count }));
  }

  get totalRecords(): number { return this.filteredItems.length; }
  get totalPages(): number { return Math.ceil(this.totalRecords / this.pageSize) || 1; }
  get pagedItems(): CatalogItemDTO[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }
  changePage(page: number): void { this.currentPage = page; }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  constructor(
    private catalogService: CatalogService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.catalogService.getTypes().subscribe({
      next: (types) => {
        this.types = types;
        this.loadingTypes = false;
        this.loaderService.hide();
        if (types.length > 0) this.selectType(types[0].catalogTypeId);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  selectType(typeId: number): void {
    this.selectedTypeId = typeId;
    this.loadingItems = true;
    this.searchTerm = '';
    this.loaderService.show();
    this.catalogService.getItemsByType(typeId).subscribe({
      next: (items) => {
        this.items = items;
        this.loadingItems = false;
        this.currentPage = 1;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openCreate(): void {
    this.editingItem = null;
    this.showForm = true;
  }

  openEdit(item: CatalogItemDTO): void {
    this.editingItem = { ...item };
    this.showForm = true;
  }

  delete(item: CatalogItemDTO): void {
    Swal.fire({
      title: '¿Eliminar ítem?',
      html: `<b>${item.catalogItemDescription}</b> será desactivado.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.catalogService.deleteItem(item.catalogItemId).subscribe({
        next: () => {
          this.loaderService.hide();
          this.reloadItems();
          Swal.fire({ title: 'Ítem eliminado', icon: 'success', draggable: true });
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  reloadItems(): void {
    if (this.selectedTypeId !== null) this.selectType(this.selectedTypeId);
  }

  onSaved(): void {
    this.showForm = false;
    this.reloadItems();
  }

  trackByTypeId(_: number, t: CatalogTypeDTO): number { return t.catalogTypeId; }
  trackByItemId(_: number, i: CatalogItemDTO): number { return i.catalogItemId; }
}
