import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { CatalogService, CatalogTypeDTO } from '../scope/catalog.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { CatalogTypeForm } from './components/catalog-type-form/catalog-type-form';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-catalog-types',
  standalone: true,
  imports: [CommonModule, CatalogTypeForm, Paginator],
  templateUrl: './catalog-types.html',
  styleUrl: './catalog-types.css',
})
export class CatalogTypes implements OnInit {
  types: CatalogTypeDTO[] = [];
  loading = true;
  showForm = false;
  editingType: CatalogTypeDTO | null = null;

  readonly pageSize = 10;
  currentPage = 1;

  get totalRecords(): number { return this.types.length; }
  get totalPages(): number { return Math.ceil(this.totalRecords / this.pageSize) || 1; }
  get pagedTypes(): CatalogTypeDTO[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.types.slice(start, start + this.pageSize);
  }
  changePage(page: number): void { this.currentPage = page; }

  constructor(
    private catalogService: CatalogService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.catalogService.getTypes().subscribe({
      next: (types) => {
        this.types = types;
        this.loading = false;
        this.currentPage = 1;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openCreate(): void {
    this.editingType = null;
    this.showForm = true;
  }

  openEdit(type: CatalogTypeDTO): void {
    this.editingType = { ...type };
    this.showForm = true;
  }

  delete(type: CatalogTypeDTO): void {
    Swal.fire({
      title: '¿Eliminar tipo?',
      html: `<b>${type.catalogTypeName}</b> será desactivado.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.catalogService.deleteType(type.catalogTypeId).subscribe({
        next: () => {
          this.loaderService.hide();
          this.load();
          Swal.fire({ title: 'Tipo eliminado', icon: 'success', draggable: true });
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  onSaved(): void {
    this.showForm = false;
    this.load();
  }
}
