export interface WorkItemCategoryFilterDto {
  description?: string | null;
  /** true: con instructivo · false: sin instructivo · null: todas. */
  hasInstructivo?: boolean | null;
  /** true: con al menos una cláusula · false: sin ninguna cláusula · null: todas. */
  hasClause?: boolean | null;
  /** Filtra por la especialidad a la que pertenece la partida de control. null: todas. */
  workSpecialtyId?: number | null;
  /** true: solo activas · false: solo inactivas · null: todas. */
  active?: boolean | null;
  page: number;
}
