import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';

export interface HolidayDto {
  holidayId: number;
  holidayTypeId: number;
  holidayTypeName: string;
  holidayDate: string; // 'yyyy-MM-dd'
  description: string;
  recurringYearly: boolean;
  active: boolean;
}

export interface HolidayCreateDto {
  holidayTypeId: number;
  holidayDate: string;
  description: string;
  recurringYearly: boolean;
  active: boolean;
}

export interface HolidayEditDto {
  holidayId: number;
  holidayTypeId: number;
  holidayDate: string;
  description: string;
  recurringYearly: boolean;
  active: boolean;
}

export interface HolidayTypeSimpleDto {
  holidayTypeId: number;
  holidayTypeName: string;
}

export interface HolidayInitialDto {
  types: HolidayTypeSimpleDto[];
  holidays: PagedResponseDTO<HolidayDto>;
}
