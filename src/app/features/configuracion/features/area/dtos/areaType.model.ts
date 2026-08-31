export interface AreaTypeDto {
  areaTypeId: number;
  areaTypeName: string;
  active: boolean;
}

export interface AreaTypeCreateDto {
  areaTypeName: string;
  active: boolean;
}

export interface AreaTypeEditDto {
  areaTypeId: number;
  areaTypeName: string;
  active: boolean;
}

export interface AreaTypeSimpleDto {
  areaTypeId: number;
  areaTypeName: string;
}
