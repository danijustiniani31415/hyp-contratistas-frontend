export interface WorkerRevisorItemDTO {
  workerId: number;
  fullName?: string;
  email?: string;
  categoryId?: number | null;
  category?: string;
  jefeWorkerId: number | null;
  jefeFullName?: string;
  jefeEmail?: string;
  jefeCategoryId?: number | null;
  jefeCategory?: string;
  autoApproveLesson: boolean;
}

export interface ToggleAutoApproveLessonResultDTO {
  workerId: number;
  autoApproveLesson: boolean;
}

export interface WorkerRevisorOptionDTO {
  workerId: number;
  fullName?: string;
  email?: string;
}

export interface WorkerRevisorUpdateDTO {
  jefeWorkerId: number | null;
}
