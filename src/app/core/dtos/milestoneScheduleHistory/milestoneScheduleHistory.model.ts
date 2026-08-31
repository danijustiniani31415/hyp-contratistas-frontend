export interface MilestoneScheduleHistoryGetDTO {
    milestoneScheduleHistoryId : number;
    scheduleId: number;
    createdDateTime: string;
    createdUserId: number;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
}