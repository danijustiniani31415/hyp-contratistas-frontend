import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { ContractorManagementDTO } from '../../dtos/contractor-management.dto';
import { ContractorManagementService } from '../../services/contractor-management.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ContractorManagementEdit } from '../edit/contractor-management-edit';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contractor-management-detail',
  standalone: true,
  imports: [CommonModule, BaseModal, ContractorManagementEdit],
  templateUrl: './contractor-management-detail.html',
})
export class ContractorManagementDetail {
  @Input() item!: ContractorManagementDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() actionCompleted = new EventEmitter<void>();

  activeTab: 'general' | 'users' = 'general';
  showEditModal = false;

  constructor(
    private service: ContractorManagementService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  approve(): void {
    this.loaderService.show();
    this.service.approve(this.item.contractorId).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Aprobado', text: res.message ?? 'El contratista fue aprobado correctamente.' });
        this.actionCompleted.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  reject(): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Rechazar solicitud?',
      text: 'Esta acción marcará al contratista como rechazado.',
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.reject(this.item.contractorId).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Rechazado', text: res.message ?? 'El contratista fue rechazado.' });
          this.actionCompleted.emit();
          this.closeModal.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
        },
      });
    });
  }

  /** Filas de comparación datos actuales vs propuestos (estado 4). */
  comparisonRows(): { label: string; current: string; proposed: string }[] {
    const p = this.item.pendingUpdate;
    if (!p) return [];
    const norm = (v: string | null | undefined) => (v ?? '').trim();
    const emails = (list: string[] | null | undefined) => (list ?? []).slice().sort().join(', ');
    return [
      { label: 'Razón social',         current: norm(this.item.contributorName),                         proposed: norm(p.contributorName) },
      { label: 'Dirección',            current: norm(this.item.contributorAddress),                      proposed: norm(p.contributorAddress) },
      { label: 'Distrito',             current: norm(this.item.contributorDistrict),                     proposed: norm(p.contributorDistrict) },
      { label: 'Provincia',            current: norm(this.item.contributorProvince),                     proposed: norm(p.contributorProvince) },
      { label: 'Departamento',         current: norm(this.item.contributorDepartment),                   proposed: norm(p.contributorDepartment) },
      { label: 'Actividad económica',  current: norm(this.item.contributorEconomicActivityDescription),  proposed: norm(p.contributorEconomicActivityDescription) },
      { label: 'DNI representante',    current: norm(this.item.legalRepresentativeDni),                  proposed: norm(p.legalRepresentativeDni) },
      { label: 'Representante legal',  current: norm(this.item.legalRepresentativeFullName),             proposed: norm(p.legalRepresentativeFullName) },
      { label: 'N° partida registral', current: norm(this.item.legalEntityRegistryNumber),               proposed: norm(p.legalEntityRegistryNumber) },
      { label: 'Correos',              current: emails(this.item.emails),                                proposed: emails(p.emails) },
    ];
  }

  hasComparisonChanges(): boolean {
    return this.comparisonRows().some((r) => r.current !== r.proposed);
  }

  approveUpdate(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar actualización de datos?',
      text: 'Se aplicarán los datos nuevos y el contratista volverá al estado "Aprobado".',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64BC04',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.approveUpdate(this.item.contractorId).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Actualización aplicada', text: res.message ?? 'Los nuevos datos están vigentes.' });
          this.actionCompleted.emit();
          this.closeModal.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
        },
      });
    });
  }

  rejectUpdate(): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Rechazar actualización de datos?',
      text: 'Se descartarán los datos nuevos y se conservarán los datos anteriores.',
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.rejectUpdate(this.item.contractorId).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Actualización rechazada', text: res.message ?? 'Se conservan los datos anteriores.' });
          this.actionCompleted.emit();
          this.closeModal.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
        },
      });
    });
  }

  openEdit(): void {
    this.showEditModal = true;
  }

  onEditSaved(): void {
    this.showEditModal = false;
    this.actionCompleted.emit();
    this.closeModal.emit();
  }

  sendCredentials(): void {
    const alreadyHasUser = !!this.item.hasUser;
    const text = alreadyHasUser
      ? `${this.item.contributorName} ya tiene credenciales registradas. ¿Deseas enviar un nuevo enlace de activación de todas formas?`
      : `Se enviará un enlace de activación a los correos registrados de ${this.item.contributorName}.`;

    Swal.fire({
      icon: 'question',
      title: 'Enviar credenciales',
      text,
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64BC04',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.sendCredentials(this.item.contractorId).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Enviado',
            text: res.message ?? 'El enlace de activación fue enviado exitosamente.',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }
}
