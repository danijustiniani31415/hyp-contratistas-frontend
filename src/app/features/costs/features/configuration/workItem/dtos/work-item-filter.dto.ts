export interface WorkItemFilterDto {
  description?: string | null;
  /** true: con forma de valorización · false: sin forma de valorización · null: todas. */
  hasValorizationForm?: boolean | null;
  /** Filtra por la partida de control a la que pertenece la partida. null: todas. */
  workItemCategoryId?: number | null;
  /** true: solo activas · false: solo inactivas · null: todas. */
  active?: boolean | null;
  page: number;
}
