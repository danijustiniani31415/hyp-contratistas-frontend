export interface AreaGetDTO {
  areaId: number;
  areaDescription: string;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string;
  updatedUserId?: number;
  active: boolean;
}
