import { ProjectSimpleDTO } from "../project/projectSimple.model";
import { UserSimpleDTO } from "../user/userSimple.model";

export interface TrackingQueryDto {
  month?: number;
  year?: number;
  projectId?: number;
  residentUserId?: number;
}

export interface TrackingScheduleDto {
  expected: number;
  reported: number;
  completed: boolean;
}

export interface TrackingFileDto {
  expected: number;
  uploaded: number;
  completed: boolean;
}

export interface TrackingIncidencesDto {
  total: number;
  answered: number;
  noPending: boolean;
  completed: boolean;
}

export interface TrackingItemDto {
  projectId: number;
  projectDescription: string;
  residentUserId: number;
  residentFullName: string;
  month: number | null;
  year: number | null;
  schedule: TrackingScheduleDto;
  ivts: TrackingFileDto;
  constructionLog: TrackingFileDto;
  incidences: TrackingIncidencesDto;
  compliancePercentage: number;
  isAllPeriods: boolean;
}

export interface TrackingSummaryDto {
  averageCompliance: number;
  pendingDeliverables: number;
  fullyCompleted: number;
  criticalPending: number;
}

export interface TrackingResultDto {
  items: TrackingItemDto[];
  summary: TrackingSummaryDto;
}

export interface PeriodFilterDto {
  month: number;
  year: number;
  label: string;
}

export interface TrackingFiltersDto {
  projects: ProjectSimpleDTO[];
  residents: UserSimpleDTO[];
  periods: PeriodFilterDto[];
}