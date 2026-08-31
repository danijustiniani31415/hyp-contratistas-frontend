import { ProjectSimpleDTO } from '../../../../../../core/dtos/project/projectSimple.model';
import { StaffProjectEmailTypeDto } from './staff-project-email-type.dto';

export interface StaffProjectEmailFormDataDto {
  projects: ProjectSimpleDTO[];
  types: StaffProjectEmailTypeDto[];
}
