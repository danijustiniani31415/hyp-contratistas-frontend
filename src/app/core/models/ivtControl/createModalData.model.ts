import { ProjectSimpleDTO } from "../../dtos/project/projectSimple.model";
import { IvtControlCreateDTO } from "../../dtos/ivtControl/ivtControlCreate.model";

export interface CreateModalData {
    projectOptions: ProjectSimpleDTO[];
    createDto: IvtControlCreateDTO;
    selectedFiles: SelectedFile[];
    showImageAdder: boolean;
    periodOptions: { label: string; value: string }[];
}

interface SelectedFile {
  name: string;
  size: string;
  file: File;
}