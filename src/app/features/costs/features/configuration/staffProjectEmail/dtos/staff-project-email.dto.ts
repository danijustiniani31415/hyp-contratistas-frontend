export interface StaffProjectEmailDto {
  staffProjectEmailId: number;
  projectId: number;
  projectName: string;
  email: string;
  staffProjectEmailTypeId: number;
  staffProjectEmailTypeDescription: string;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string;
  updatedUserId?: number;
  active: boolean;
}
