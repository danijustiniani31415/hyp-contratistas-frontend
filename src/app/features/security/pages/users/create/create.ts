import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { UserFeatureService } from '../services/user-feature.service';
import { PersonService } from '../../../../../core/services/person.service';
import { RoleService } from '../../../../../core/services/role.service';
import { UserFeatureCreateDto } from '../../../../../core/dtos/user/userFeatureCreate.model';
import { RoleSimpleDTO } from '../../../../../core/dtos/role/RoleSimpleDTO.model';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import Swal from 'sweetalert2';

interface RoleItem extends RoleSimpleDTO {
  checked: boolean;
}

@Component({
  selector: 'app-user-create',
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './create.html',
  styleUrl: './create.css',
})
export class UserCreate implements OnInit {
  roles: RoleItem[] = [];
  searchTerm = '';

  createDto: UserFeatureCreateDto = {
    documentIdentityCode: '',
    firstNames: '',
    firstLastName: '',
    secondLastName: '',
    email: '',
    phoneNumber: undefined,
    createdUserId: 1,
    active: true,
    roleIds: [],
  };

  @Output() closeModal = new EventEmitter<void>();
  @Output() userCreated = new EventEmitter<void>();

  constructor(
    private userFeatureService: UserFeatureService,
    private personService: PersonService,
    private roleService: RoleService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.roleService.getRoles().subscribe({
      next: (res) => {
        this.roles = res.map((r) => ({ ...r, checked: false }));
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  get filteredRoles(): RoleItem[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.roles;
    return this.roles.filter((r) => r.roleDescription.toLowerCase().includes(term));
  }

  get checkedCount(): number {
    return this.roles.filter((r) => r.checked).length;
  }

  toggleAll(checked: boolean) {
    this.filteredRoles.forEach((r) => (r.checked = checked));
  }

  trackByRoleId(_: number, r: RoleItem): number {
    return r.roleId;
  }

  getPersonRENIEC() {
    const dni = this.createDto.documentIdentityCode?.trim();
    if (!dni || dni.length !== 8) {
      alert('El DNI debe tener 8 dígitos');
      return;
    }
    this.loaderService.show();
    this.personService.getPersonRENIEC(dni).subscribe({
      next: (res) => {
        this.createDto.firstNames = res.first_name;
        this.createDto.firstLastName = res.first_last_name;
        this.createDto.secondLastName = res.second_last_name;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private getValidationErrors(): string[] {
    const errors: string[] = [];
    if (!this.createDto.documentIdentityCode?.trim())  errors.push('DNI');
    if (!this.createDto.firstNames?.trim())            errors.push('Nombres');
    if (!this.createDto.firstLastName?.trim())         errors.push('Primer apellido');
    if (!this.createDto.secondLastName?.trim())        errors.push('Segundo apellido');
    if (!this.createDto.email?.trim())                 errors.push('Correo');
    if (!this.createDto.phoneNumber)                   errors.push('Celular');
    if (!this.roles.some((r) => r.checked))            errors.push('Rol (debe asignar al menos uno)');
    return errors;
  }

  allRolesChecked(): boolean { return this.filteredRoles.length > 0 && this.filteredRoles.every(r => r.checked); }
  someRolesChecked(): boolean { return this.filteredRoles.some(r => r.checked) && !this.allRolesChecked(); }


  saveUser() {
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      const listHtml = errors.map((e) => `<li>${e}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        html: `<p style="font-size:0.85rem;color:#666;margin-bottom:8px">Por favor completa los siguientes campos:</p>
               <ul style="text-align:left;font-size:0.85rem;padding-left:1.4rem;line-height:2">${listHtml}</ul>`,
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    this.createDto.roleIds = this.roles.filter((r) => r.checked).map((r) => r.roleId);
    this.loaderService.show();
    this.userFeatureService.createUser(this.createDto).subscribe({
      next: () => {
        this.loaderService.hide();
        this.userCreated.emit();
        this.closeModal.emit();
        Swal.fire({ title: 'Usuario creado exitosamente', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
