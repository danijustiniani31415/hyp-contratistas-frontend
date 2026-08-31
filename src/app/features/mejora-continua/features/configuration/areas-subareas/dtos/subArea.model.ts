export interface SubAreaGetDTO {
  subAreaId: number;
  areaId: number;
  areaDescription: string;
  subAreaDescription: string;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string;
  updatedUserId?: number;
  active: boolean;
}
