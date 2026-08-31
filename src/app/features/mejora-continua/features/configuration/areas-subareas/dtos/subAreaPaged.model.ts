import { SubAreaGetDTO } from './subArea.model';

export interface SubAreaPagedDTO {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: SubAreaGetDTO[];
}
