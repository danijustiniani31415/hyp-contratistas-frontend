import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import {
  EmpresaSimpleDto,
  EmpresaUpsertDto,
} from '../../../../../ssoma/salud-ocupacional/dtos/catalogos.model';

@Component({
  selector: 'app-company-edit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './company-edit-form.html',
  styleUrl: './company-edit-form.css',
})
export class CompanyEditForm implements OnChanges {
  @Input() open = false;
  @Input() company: EmpresaSimpleDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  // Campos read-only (críticos): nombre, RUC, partida registral
  nombre = '';
  ruc = '';
  partidaRegistral = '';

  // Campos editables: dirección, tipo actividad, activo
  model: EmpresaUpsertDto = this.empty();
  saving = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
    }
  }

  private empty(): EmpresaUpsertDto {
    return {
      nombre: '',
      direccion: '',
      tipoActividad: '',
      activo: true,
    };
  }

  private reset(): void {
    if (!this.company) {
      this.nombre = '';
      this.ruc = '';
      this.partidaRegistral = '';
      this.model = this.empty();
      return;
    }
    this.nombre = this.company.nombre ?? '';
    this.ruc = this.company.ruc ?? '';
    this.partidaRegistral = this.company.partidaRegistral ?? '';
    this.model = {
      nombre: this.company.nombre ?? '',
      direccion: this.company.direccion ?? '',
      tipoActividad: this.company.tipoActividad ?? '',
      activo: this.company.activo ?? true,
    };
  }

  submit(): void {
    if (this.saving) return;
    // El endpoint PUT para companies aún no existe en el backend.
    // Cuando exista: invocar catalogosService.updateEmpresa(this.company.id, payload).
    Swal.fire({
      icon: 'info',
      title: 'Funcionalidad en desarrollo',
      text: 'La edición de razones sociales estará disponible próximamente.',
      confirmButtonColor: '#64bc04',
    });
  }

  close(): void {
    this.closed.emit();
  }
}
