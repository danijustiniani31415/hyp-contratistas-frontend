export interface MilestoneScheduleCreateDTO {
    milestoneId: number | null;
    customDescription?: string | null;
    plannedStartDate: string;
    plannedEndDate: string | null | undefined;
    order: number;
    esHitoCritico: boolean;
}