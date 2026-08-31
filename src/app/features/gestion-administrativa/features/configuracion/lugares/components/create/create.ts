import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { GaLugarService } from '../../services/lugares.service';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';

@Component({
  standalone: true,
  selector: 'app-ga-lugar-create',
  imports: [BaseModal, CommonModule, FormsModule],
  templateUrl: './create.html',
})
export class GaLugarCreate {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  nombres: string[] = [''];
  submitted = false;

  constructor(
    private service: GaLugarService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  addNombre(): void {
    this.nombres.push('');
  }

  removeNombre(index: number): void {
    if (this.nombres.length > 1) {
      this.nombres.splice(index, 1);
    }
  }

  trackByIndex = (index: number): number => index;

  get hasValidNombre(): boolean {
    return this.nombres.some((n) => n.trim().length > 0);
  }

  save(): void {
    this.submitted = true;
    if (!this.hasValidNombre) return;

    this.loaderService.show();
    this.service.createBatch({ nombres: this.nombres }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ title: res.message, icon: 'success', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
