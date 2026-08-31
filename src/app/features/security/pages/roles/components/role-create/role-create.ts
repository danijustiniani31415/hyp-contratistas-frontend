import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { RoleFeatureService } from '../../services/role.service';
import { RoleCreateDto } from '../../dtos/roleCreate.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-role-create',
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './role-create.html',
  styleUrl: './role-create.css',
})
export class RoleCreate {
  createDto: RoleCreateDto = {
    roleDescription: '',
  };

  @Output() closeModal = new EventEmitter<void>();
  @Output() roleCreated = new EventEmitter<void>();

  constructor(
    private roleService: RoleFeatureService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  saveRole() {
    this.loaderService.show();
    this.roleService.createRole(this.createDto).subscribe({
      next: () => {
        this.loaderService.hide();
        this.roleCreated.emit();
        this.closeModal.emit();
        Swal.fire({ title: 'Rol creado exitosamente', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
