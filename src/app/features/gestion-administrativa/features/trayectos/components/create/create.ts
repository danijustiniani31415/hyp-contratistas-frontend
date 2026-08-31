import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { GaTrayectoService } from '../../services/trayectos.service';
import { GaTrayectoLugarOptionDto } from '../../dtos/ga-trayecto.dto';

@Component({
  standalone: true,
  selector: 'app-ga-trayecto-create',
  imports: [BaseModal, CommonModule, FormsModule, SearchSelect],
  templateUrl: './create.html',
})
export class GaTrayectoCreate implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  lugares: GaTrayectoLugarOptionDto[] = [];
  lugarOrigenId: number | null = null;
  lugarDestinoId: number | null = null;
  monto: number | null = null;
  submitted = false;

  constructor(
    private service: GaTrayectoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadLugares();
  }

  loadLugares(): void {
    this.loaderService.show();
    this.service.getLugaresActivos().subscribe({
      next: (data) => {
        this.lugares = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get mismosLugares(): boolean {
    return !!this.lugarOrigenId && this.lugarOrigenId === this.lugarDestinoId;
  }

  save(): void {
    this.submitted = true;
    if (!this.lugarOrigenId || !this.lugarDestinoId || this.monto === null || this.monto < 0) return;
    if (this.mismosLugares) {
      Swal.fire({
        title: 'Lugares inválidos',
        text: 'El origen y el destino no pueden ser iguales.',
        icon: 'warning',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    this.loaderService.show();
    this.service
      .create({
        lugarOrigenId: this.lugarOrigenId,
        lugarDestinoId: this.lugarDestinoId,
        monto: this.monto,
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
