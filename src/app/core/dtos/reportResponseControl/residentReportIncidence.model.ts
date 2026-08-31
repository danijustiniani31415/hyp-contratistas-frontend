export interface ResidentReportIncidenceDTO {
    residentReportIncidenceId: number;
    residentReportIncidenceDescription: string;
    projectId: number;
    projectDescription: string;
    stateId: number;
    stateDescription: string;
    createdDateTime: string;
    images: ResidentReportIncidenceImageDTO[];
    residentReportResponseDescriptions: ResidentReportResponseDTO[];
}

interface ResidentReportIncidenceImageDTO {
    imageUrl: string;
}

interface ResidentReportResponseDTO {
    residentReportResponseDescription: string;
}