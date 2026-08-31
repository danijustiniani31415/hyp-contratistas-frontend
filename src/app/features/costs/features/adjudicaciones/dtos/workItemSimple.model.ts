export interface WorkItemValorizationFormSimpleDTO {
    concept: string;
    percentage: number;
    sortOrder: number;
}

export interface WorkItemSimpleDTO {
    workItemId: number;
    workItemDescription: string;
    workItemCategoryId?: number | null; // partida de control a la que pertenece (para filtrado en cascada)
    valorizationForms: WorkItemValorizationFormSimpleDTO[];
}
