/**
 * Clasificación del puesto (catálogo workers_obra_oficina_staff, IDs fijos —
 * ver ObraOficinaStaffIds en el backend) y su nivel de riesgo para efectos de EMO:
 * Oficina Central = riesgo bajo; Staff y Obra = riesgo alto (mismo protocolo que un
 * obrero, al estar destacados en proyecto).
 */
export const OBRA_OFICINA_STAFF_OPTIONS = [
  { id: 1, nombre: 'Obra' },
  { id: 2, nombre: 'Staff' },
  { id: 3, nombre: 'Oficina Central' },
];

export function riesgoEmo(obraOficinaStaffId: number | null | undefined): 'Bajo' | 'Alto' | null {
  if (obraOficinaStaffId === 3) return 'Bajo';
  if (obraOficinaStaffId === 1 || obraOficinaStaffId === 2) return 'Alto';
  return null;
}

/** True solo cuando el puesto sube de riesgo bajo a alto (Oficina Central → Staff/Obra):
 * el único caso que la R.M. 312-2011/MINSA no permite convalidar. */
export function esCambioRiesgoCritico(
  origenId: number | null | undefined,
  destinoId: number | null | undefined,
): boolean {
  return riesgoEmo(origenId) === 'Bajo' && riesgoEmo(destinoId) === 'Alto';
}

export function declaracionRiesgo(
  origenId: number | null | undefined,
  destinoId: number | null | undefined,
): string {
  const rOrigen = riesgoEmo(origenId);
  const rDestino = riesgoEmo(destinoId);
  if (!rOrigen || !rDestino) return '';

  if (esCambioRiesgoCritico(origenId, destinoId)) {
    return (
      'El puesto de destino implica mayor exposición a riesgo (Staff/Obra) que el evaluado en ' +
      'el EMO de origen (Oficina Central). Conforme a la R.M. N° 312-2011/MINSA no procede la ' +
      'convalidación: corresponde un EMO nuevo bajo el protocolo del puesto destino.'
    );
  }
  if (rOrigen === rDestino) {
    return 'El puesto de destino mantiene un perfil de riesgo similar al del EMO de origen: la convalidación es procedente.';
  }
  return 'El puesto de destino implica un riesgo igual o menor (Staff/Obra → Oficina Central): la convalidación es procedente.';
}
