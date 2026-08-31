export interface AreaItemDto {
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaTypeName: string;
  active: boolean;
}

export interface AreaItemCreateDto {
  areaItemName: string;
  areaTypeId: number;
  active: boolean;
}

export interface AreaItemEditDto {
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  active: boolean;
}

export interface AreaItemSimpleDto {
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
}

export interface AreaItemFilterDto {
  page: number;
  pageSize?: number;
  areaTypeId?: number | null;
  active?: boolean | null;
  search?: string | null;
}
