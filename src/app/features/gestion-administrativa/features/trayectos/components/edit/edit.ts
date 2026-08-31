import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { GaTrayectoService } from '../../services/trayectos.service';
import {
  GaTrayectoListItemDto,
  GaTrayectoLugarOptionDto,
} from '../../dtos/ga-trayecto.dto';

@Component({
  standalone: true,
  selector: 'app-ga-trayecto-edit',
  imports: [BaseModal, CommonModule, FormsModule, SearchSelect],
  templateUrl: './edit.html',
})
export class GaTrayectoEdit implements OnInit {
  @Input({ required: true }) trayecto!: GaTrayectoListItemDto;
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
    this.lugarOrigenId  = this.trayecto.lugarOrigenId;
    this.lugarDestinoId = this.trayecto.lugarDestinoId;
    this.monto          = this.trayecto.monto;
    this.loadLugares();
  }

  loadLugares(): void {
    this.loaderService.show();
    this.service.getLugaresActivos().subscribe({
      next: (data) => {
        this.lugares = data;
        // Asegura que los lugares actuales estén disponibles aunque estén inactivos
        const ids = new Set(this.lugares.map((l) => l.id));
        if (!ids.has(this.trayecto.lugarOrigenId)) {
          this.lugares.push({ id: this.trayecto.lugarOrigenId, nombreDisplay: this.trayecto.lugarOrigenNombre + ' (inactivo)' });
        }
        if (!ids.has(this.trayecto.lugarDestinoId)) {
          this.lugares.push({ id: this.trayecto.lugarDestinoId, nombreDisplay: this.trayecto.lugarDestinoNombre + ' (inactivo)' });
        }
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
      .edit(this.trayecto.id, {
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
