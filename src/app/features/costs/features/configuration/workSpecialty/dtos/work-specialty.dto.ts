export interface WorkSpecialtyDto {
  workSpecialtyId: number;
  workSpecialtyDescription: string;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string;
  updatedUserId?: number;
  active: boolean;
}
