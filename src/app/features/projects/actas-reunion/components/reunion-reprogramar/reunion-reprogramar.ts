import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';

@Component({
  selector: 'app-reunion-reprogramar',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, DatePicker],
  templateUrl: './reunion-reprogramar.html',
})
export class ReunionReprogramar implements OnInit {
  @Input({ required: true }) reunionId!: number;
  @Input() fechaActual = '';
  @Input() horaInicioActual: string | null = null;
  @Input() horaFinActual: string | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  fecha: string | null = null;
  horaInicio = '';
  horaFin = '';
  motivo = '';

  constructor(
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.horaInicio = this.horaInicioActual ? this.horaInicioActual.slice(0, 5) : '';
    this.horaFin = this.horaFinActual ? this.horaFinActual.slice(0, 5) : '';
  }

  submit(): void {
    const errors: string[] = [];
    if (!this.fecha) errors.push('Nueva fecha de la reunión');
    if (this.horaInicio && this.horaFin && this.horaFin <= this.horaInicio)
      errors.push('La hora de término debe ser mayor a la hora de inicio');
    if (errors.length > 0) {
      const listHtml = errors.map((e) => `<li>${e}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        html: `<ul style="text-align:left;font-size:0.85rem;padding-left:1.4rem;line-height:2">${listHtml}</ul>`,
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    this.loaderService.show();
    this.service
      .reprogramar(this.reunionId, {
        fecha: this.fecha!,
        horaInicio: this.horaInicio ? `${this.horaInicio}:00` : null,
        horaFin: this.horaFin ? `${this.horaFin}:00` : null,
        motivo: this.motivo.trim() || null,
      })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: '¡Reunión reprogramada!',
            text: 'La nueva fecha fue registrada correctamente.',
            confirmButtonColor: 'var(--color-abril-primary)',
          });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
