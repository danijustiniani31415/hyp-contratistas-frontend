export interface ProjectStaffReminderConfigItemDTO {
  projectStaffReminderId: number | null;
  projectId: number;
  projectDescription?: string;
  staffEmail?: string;
  active: boolean;
}

export interface ToggleProjectStaffReminderResultDTO {
  projectStaffReminderId: number;
  active: boolean;
}
