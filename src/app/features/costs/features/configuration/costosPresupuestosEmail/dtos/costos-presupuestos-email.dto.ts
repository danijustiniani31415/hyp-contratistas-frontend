export interface CostosPresupuestosEmailDto {
  costosPresupuestosEmailId: number;
  email: string;
  createdDateTime: Date;
  createdUserId: number;
  updatedDateTime?: Date;
  updatedUserId?: number;
  active: boolean;
}
