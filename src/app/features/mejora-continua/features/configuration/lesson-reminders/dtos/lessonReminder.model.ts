export interface LessonReminderDTO {
  userProjectId: number;
  workerId: number;
  workerFullName?: string;
  email?: string;
  projectId: number;
  projectDescription?: string;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string | null;
  updatedUserId?: number | null;
  active: boolean;
}

export interface LessonReminderWorkerOptionDTO {
  workerId: number;
  fullName?: string;
  email?: string;
}

export interface LessonReminderPagedDTO {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: LessonReminderDTO[];
  /** Solo viene poblado en la carga inicial (includeWorkers=true). */
  workers?: LessonReminderWorkerOptionDTO[] | null;
}

export interface ToggleLessonReminderResultDTO {
  userProjectId: number;
  active: boolean;
}
