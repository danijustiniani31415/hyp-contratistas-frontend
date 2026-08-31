import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { GaMotivoSalidaService } from '../../services/motivos.service';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { GaMotivoSalidaConfigItemDto } from '../../dtos/ga-motivo.dto';

@Component({
  standalone: true,
  selector: 'app-ga-motivo-edit',
  imports: [BaseModal, CommonModule, FormsModule],
  templateUrl: './edit.html',
})
export class GaMotivoEdit implements OnInit {
  @Input() motivo!: GaMotivoSalidaConfigItemDto;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  descripcion = '';
  requiereAdjunto = false;
  esHoraEstimada = false;
  requiereMotivoAdicional = false;
  submitted = false;

  constructor(
    private service: GaMotivoSalidaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.descripcion = this.motivo.descripcion;
    this.requiereAdjunto = this.motivo.requiereAdjunto;
    this.esHoraEstimada = this.motivo.esHoraEstimada;
    this.requiereMotivoAdicional = this.motivo.requiereMotivoAdicional;
  }

  save(): void {
    this.submitted = true;
    if (!this.descripcion.trim()) return;

    this.loaderService.show();
    this.service
      .edit(this.motivo.id, {
        descripcion: this.descripcion.trim(),
        requiereAdjunto: this.requiereAdjunto,
        esHoraEstimada: this.esHoraEstimada,
        requiereMotivoAdicional: this.requiereMotivoAdicional,
      })
      .subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ title: res.message, icon: 'success', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
