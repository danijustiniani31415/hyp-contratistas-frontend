import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserFeatureService } from '../../services/user-feature.service';
import { RoleService } from '../../../../../../core/services/role.service';
import { UserListItemDto } from '../../../../../../core/dtos/user/userListItem.model';
import { UserFeatureUpdateDto } from '../../../../../../core/dtos/user/userFeatureUpdate.model';
import { RoleSimpleDTO } from '../../../../../../core/dtos/role/RoleSimpleDTO.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import Swal from 'sweetalert2';

interface RoleItem extends RoleSimpleDTO {
  checked: boolean;
}

@Component({
  selector: 'app-user-edit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './user-edit-form.html',
  styleUrl: './user-edit-form.css',
})
export class UserEditForm implements OnInit {
  @Input() open = false;
  @Input() initial: UserListItemDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  model: UserFeatureUpdateDto = this.empty();
  roles: RoleItem[] = [];
  searchTerm = '';
  saving = false;

  constructor(
    private userFeatureService: UserFeatureService,
    private roleService: RoleService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.reset();
    this.loaderService.show();
    this.roleService.getRoles().subscribe({
      next: (res) => {
        const assignedIds = new Set(this.initial?.roles.map((r) => r.roleId) ?? []);
        this.roles = res.map((r) => ({ ...r, checked: assignedIds.has(r.roleId) }));
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  get isPersona(): boolean {
    return this.initial?.userType === 'PERSONA';
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

  private empty(): UserFeatureUpdateDto {
    return { firstNames: '', firstLastName: '', secondLastName: '', email: '', phoneNumber: undefined, roleIds: [] };
  }

  private reset(): void {
    this.model = {
      firstNames: this.initial?.firstNames ?? '',
      firstLastName: this.initial?.firstLastName ?? '',
      secondLastName: this.initial?.secondLastName ?? '',
      email: this.initial?.email ?? '',
      phoneNumber: this.initial?.phoneNumber ?? undefined,
      roleIds: [],
    };
  }

  get canSubmit(): boolean {
    return !!this.model.email.trim() && !this.saving;
  }

  allRolesChecked(): boolean { return this.filteredRoles.length > 0 && this.filteredRoles.every(r => r.checked); }
  someRolesChecked(): boolean { return this.filteredRoles.some(r => r.checked) && !this.allRolesChecked(); }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({ icon: 'warning', title: 'El correo es requerido' });
      return;
    }
    if (!this.initial) return;

    this.model.roleIds = this.roles.filter((r) => r.checked).map((r) => r.roleId);
    this.saving = true;
    this.loaderService.show();
    this.userFeatureService
      .updateUser(this.initial.userId, {
        firstNames: this.model.firstNames.trim(),
        firstLastName: this.model.firstLastName.trim(),
        secondLastName: this.model.secondLastName?.trim() ?? '',
        email: this.model.email.trim(),
        phoneNumber: this.model.phoneNumber,
        roleIds: this.model.roleIds,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Usuario actualizado', timer: 1500, showConfirmButton: false });
          this.saved.emit();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
  }

  close(): void {
    this.closed.emit();
  }
}
