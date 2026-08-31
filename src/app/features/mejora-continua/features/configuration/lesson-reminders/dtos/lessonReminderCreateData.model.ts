export interface LessonReminderWorkerDTO {
  workerId: number;
  fullName?: string;
  email?: string;
}

export interface LessonReminderProjectDTO {
  projectId: number;
  projectDescription?: string;
}

export interface LessonReminderCreateDataDTO {
  workers: LessonReminderWorkerDTO[];
  projects: LessonReminderProjectDTO[];
}
