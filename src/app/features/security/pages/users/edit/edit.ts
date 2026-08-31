import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from '../../../../../core/services/user.service';
import { RoleService } from '../../../../../core/services/role.service';
import { UserDTO } from '../../../../../core/dtos/user/user.model';
import { UserUpdateDTO } from '../../../../../core/dtos/user/userUpdate.model';
import { RoleSimpleDTO } from '../../../../../core/dtos/role/RoleSimpleDTO.model';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-edit',
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './edit.html',
  styleUrl: './edit.css',
})
export class UserEdit implements OnInit {
  @Input() user!: UserDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() userUpdated = new EventEmitter<void>();

  roles: RoleSimpleDTO[] = [];

  editDto: UserUpdateDTO = {
    firstNames: '',
    firstLastName: '',
    secondLastName: '',
    email: '',
    phoneNumber: 0,
    roleId: 0,
  };

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.editDto = {
      firstNames: '',
      firstLastName: '',
      secondLastName: '',
      email: this.user.person.email,
      phoneNumber: 0,
      roleId: this.user.roles?.[0]?.roleId ?? 0,
    };
    this.loadRoles();
  }

  loadRoles() {
    this.loaderService.show();
    this.roleService.getRoles().subscribe({
      next: (res) => {
        this.roles = res;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  saveUser() {
    this.loaderService.show();
    this.userService.updateUser(this.user.userId, this.editDto).subscribe({
      next: () => {
        this.loaderService.hide();
        this.userUpdated.emit();
        this.closeModal.emit();
        Swal.fire({ title: 'Usuario actualizado exitosamente', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
