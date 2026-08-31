export interface WorkSpecialtyFilterDto {
  description?: string | null;
  /** true: solo activas · false: solo inactivas · null: todas. */
  active?: boolean | null;
  page: number;
}
