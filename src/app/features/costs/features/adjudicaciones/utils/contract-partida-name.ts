/**
 * Compone el nombre final de la partida tal como debe figurar en el contrato
 * (placeholder {{PARTIDA}}), a partir de la partida global, la modalidad de
 * contrato y los flags de subcontrato (SC) y mano de obra (M.O.).
 *
 * Prioridad de prefijos: SC DE → M.O. DE → <MODALIDAD> DE → <PARTIDA>.
 * Ejemplos (partida "TABIQUERÍA"):
 *  - sin nada:                         TABIQUERÍA
 *  - + modalidad "Suministro e Inst.": SUMINISTRO E INSTALACIÓN DE TABIQUERÍA
 *  - + SC:                             SC DE SUMINISTRO E INSTALACIÓN DE TABIQUERÍA
 *  - SC + M.O. + modalidad:            SC DE M.O. DE SUMINISTRO E INSTALACIÓN DE TABIQUERÍA
 */
export function buildContractPartidaName(opts: {
  workItemDescription?: string | null;
  contractModalityDescription?: string | null;
  isSubcontract: boolean;
  isLabor: boolean;
}): string {
  const base = (opts.workItemDescription ?? '').trim();
  if (!base) return '';

  let name = base;

  const modality = opts.contractModalityDescription?.trim();
  if (modality) name = `${modality} DE ${name}`;
  if (opts.isLabor) name = `M.O. DE ${name}`;
  if (opts.isSubcontract) name = `SC DE ${name}`;

  return name.toUpperCase();
}
