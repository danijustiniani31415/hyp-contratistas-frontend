import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CatalogosSaludService } from '../../../../../ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmpresaCreateDto } from '../../../../../ssoma/salud-ocupacional/dtos/catalogos.model';

@Component({
  selector: 'app-company-create-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './company-create-form.html',
})
export class CompanyCreateForm {
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  rucInput = '';
  lookupDone = false;
  manualEntry = false;

  model: EmpresaCreateDto = this.empty();

  constructor(
    private service: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  private empty(): EmpresaCreateDto {
    return {
      ruc: '',
      nombre: '',
      direccion: '',
      tipoActividad: '',
      distrito: '',
      provincia: '',
      departamento: '',
      partidaRegistral: '',
    };
  }

  searchRuc(): void {
    const ruc = this.rucInput.trim();
    if (ruc.length !== 11) {
      Swal.fire({ icon: 'error', title: 'RUC inválido', text: 'El RUC debe tener 11 dígitos.' });
      return;
    }
    this.loaderService.show();
    this.service.getEmpresaByRuc(ruc).subscribe({
      next: (data) => {
        this.model = {
          ruc: data.contributorRuc,
          nombre: data.contributorName,
          direccion: data.contributorAddress,
          tipoActividad: data.contributorEconomicActivityDescription,
          distrito: data.contributorDistrict ?? '',
          provincia: data.contributorProvince ?? '',
          departamento: data.contributorDepartment ?? '',
          partidaRegistral: '',
        };
        this.lookupDone = true;
        this.manualEntry = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        if (err.status === 404) {
          Swal.fire({ icon: 'error', title: 'RUC no encontrado', text: 'No se encontró información para el RUC ingresado.' });
          return;
        }
        const backendMsg = err.error?.message as string | undefined;
        if (backendMsg) {
          Swal.fire({ icon: 'warning', title: 'No se pudo consultar', text: backendMsg });
          return;
        }
        this.errorService.handleError(err);
      },
    });
  }

  enableManualEntry(): void {
    this.model = this.empty();
    this.model.ruc = this.rucInput.trim();
    this.lookupDone = false;
    this.manualEntry = true;
  }

  submit(): void {
    const required: [keyof EmpresaCreateDto, string][] = [
      ['ruc', 'el RUC'],
      ['nombre', 'la razón social'],
      ['direccion', 'la dirección'],
      ['tipoActividad', 'el tipo de actividad'],
      ['distrito', 'el distrito'],
      ['provincia', 'la provincia'],
      ['departamento', 'el departamento'],
    ];
    for (const [field, label] of required) {
      if (!String(this.model[field] ?? '').trim()) {
        Swal.fire({ icon: 'error', title: 'Campo requerido', text: `Ingrese ${label}.` });
        return;
      }
    }
    if (this.model.ruc.trim().length !== 11) {
      Swal.fire({ icon: 'error', title: 'RUC inválido', text: 'El RUC debe tener 11 dígitos.' });
      return;
    }

    this.loaderService.show();
    this.service.createEmpresa({ ...this.model, ruc: this.model.ruc.trim() }).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Razón social registrada', timer: 1500, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
