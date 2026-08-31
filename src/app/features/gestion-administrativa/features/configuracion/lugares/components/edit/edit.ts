import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { GaLugarService } from '../../services/lugares.service';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { GaLugarConfigItemDto } from '../../dtos/ga-lugar.dto';

@Component({
  standalone: true,
  selector: 'app-ga-lugar-edit',
  imports: [BaseModal, CommonModule, FormsModule],
  templateUrl: './edit.html',
})
export class GaLugarEdit implements OnInit {
  @Input() lugar!: GaLugarConfigItemDto;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  nombre = '';
  submitted = false;

  constructor(
    private service: GaLugarService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.nombre = this.lugar.nombreDisplay;
  }

  save(): void {
    this.submitted = true;
    if (!this.nombre.trim()) return;

    this.loaderService.show();
    this.service.edit(this.lugar.gaLugarId!, { nombre: this.nombre.trim() }).subscribe({
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
