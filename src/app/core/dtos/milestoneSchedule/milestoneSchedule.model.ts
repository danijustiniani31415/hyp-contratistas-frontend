export interface MilestoneScheduleGetDTO {
    milestoneScheduleId: number;
    milestoneId: number | null;
    milestoneDescription: string;
    milestoneScheduleHistoryId: number;
    order: number;
    plannedStartDate: string;
    plannedEndDate: string;
    createdDateTime: string;
    createdUserId: number;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
    esHitoCritico: boolean;
}