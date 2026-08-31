export interface UserFeatureUpdateDto {
  firstNames: string;
  firstLastName: string;
  secondLastName: string;
  email: string;
  phoneNumber?: number;
  roleIds: number[];
}
