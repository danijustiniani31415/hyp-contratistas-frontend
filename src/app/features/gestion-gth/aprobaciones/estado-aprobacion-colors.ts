/**
 * Colores del badge del estado de la APROBACIÓN (espejo de gth_aprobacion_gg_estado.codigo).
 * Es un catálogo distinto al del estado del requerimiento (`../shared/estado-colors`): aquel
 * describe la fase del pipeline de reclutamiento, este el resultado de la decisión de Gerencia.
 */
export function estadoAprobacionColors(codigo: string): { bg: string; text: string } {
  switch (codigo) {
    case 'PENDIENTE':        return { bg: '#FEF3C7', text: '#B45309' };
    case 'APROBADA':         return { bg: '#DCFCE7', text: '#15803D' };
    case 'APROBADA_PARCIAL': return { bg: '#E0F2FE', text: '#0284C7' };
    case 'RECHAZADA':        return { bg: '#FEE2E2', text: '#B91C1C' };
    default:                 return { bg: '#F3F4F6', text: '#374151' };
  }
}
