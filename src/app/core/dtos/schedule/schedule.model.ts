export interface ScheduleGetDTO {
    scheduleId : number;
    scheduleDescription: string;
    projectId: number;
    projectDescription: string;
    createdDateTime: string;
    createdUserId: number;
    createdUserFullName?: string;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
}