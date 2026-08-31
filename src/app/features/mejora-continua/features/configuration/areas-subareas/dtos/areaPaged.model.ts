import { AreaGetDTO } from './area.model';

export interface AreaPagedDTO {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: AreaGetDTO[];
}
