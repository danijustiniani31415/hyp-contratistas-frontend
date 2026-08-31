export interface RoleItemDto {
  roleId: number;
  roleDescription: string;
}

export interface UserListItemDto {
  userId: number;
  active: boolean;
  userType: 'PERSONA' | 'COLABORADOR' | 'CONTRATISTA';
  displayName?: string;
  documentIdentityCode?: string;
  email: string;
  firstNames?: string;
  firstLastName?: string;
  secondLastName?: string;
  phoneNumber?: number;
  roles: RoleItemDto[];
}
