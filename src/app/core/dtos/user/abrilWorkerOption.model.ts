export interface AbrilWorkerOptionDto {
  personId: number;
  fullName: string;
  documentIdentityCode?: string | null;
  emailCorporativo: string;
  /** FK a workers_obra_oficina_staff (ver ObraOficinaStaffIds en el backend). 2 = Staff. */
  obraOficinaStaffId?: number | null;
}
