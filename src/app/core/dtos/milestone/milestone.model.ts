export interface MilestoneGetDTO {
    milestoneId : number;
    milestoneDescription: string;
    createdDateTime: string;
    createdUserId: number;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
}