/**
 * Opción del desplegable "Razón social activa": una de las empresas operativas del grupo con lo
 * que le queda de su tope de 20 trabajadores.
 *
 * Vive en `shared/` porque la piden dos módulos: Gestión GTH (Reclutamiento, al asignarle la razón
 * social al requerimiento) y SSOMA (el modal "Programar EMO con clínica", cuando el trabajador
 * llegó sin ninguna — el caso del ingreso directo FFT). La cuenta la hace el backend en un solo
 * sitio (`RazonSocialCuposHelper`), así que las dos pantallas ofrecen exactamente lo mismo.
 */
export interface RazonSocialCupo {
  id: number;
  nombre: string;
  /**
   * Cupos = tope (20) − trabajadores vigentes de la razón social en la base maestra. El personal
   * de obra y los practicantes no consumen cupo. Nunca negativo.
   */
  cuposDisponibles: number;
}
