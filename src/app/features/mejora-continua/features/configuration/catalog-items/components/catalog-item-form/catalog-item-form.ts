import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { CatalogService, CatalogItemDTO } from '../../../scope/catalog.service';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-catalog-item-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './catalog-item-form.html',
  styleUrl: './catalog-item-form.css',
})
export class CatalogItemForm implements OnInit {
  @Input() catalogTypeId!: number;
  @Input() editingItem: CatalogItemDTO | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  description = '';
  active = true;

  get isEdit(): boolean { return this.editingItem !== null; }
  get title(): string { return this.isEdit ? 'EDITAR ÍTEM' : 'NUEVO ÍTEM'; }

  constructor(
    private catalogService: CatalogService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    if (this.editingItem) {
      this.description = this.editingItem.catalogItemDescription;
      this.active = this.editingItem.active;
    }
  }

  save(): void {
    if (!this.description.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'La descripción no puede estar vacía.' });
      return;
    }

    this.loaderService.show();

    const obs$ = this.isEdit
      ? this.catalogService.updateItem({
          catalogItemId: this.editingItem!.catalogItemId,
          catalogTypeId: this.catalogTypeId,
          catalogItemDescription: this.description.trim(),
          active: this.active,
        })
      : this.catalogService.createItem({
          catalogTypeId: this.catalogTypeId,
          catalogItemDescription: this.description.trim(),
          active: true,
        });

    obs$.subscribe({
      next: () => {
        this.loaderService.hide();
        this.saved.emit();
        Swal.fire({
          title: this.isEdit ? 'Ítem actualizado' : 'Ítem creado',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
