import { ProjectSimpleDTO } from "../../dtos/project/projectSimple.model";
import { ConstructionLogbookControlCreateDTO } from "../../dtos/constructionLogbookControl/constructionLogbookControlCreate.model";

export interface CreateModalData {
    projectOptions: ProjectSimpleDTO[];
    createDto: ConstructionLogbookControlCreateDTO;
    selectedFiles: SelectedFile[];
    showImageAdder: boolean;
    periodOptions: { label: string; value: string }[];
}

interface SelectedFile {
  name: string;
  size: string;
  file: File;
}