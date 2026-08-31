/**
 * Roles de usuario de la aplicación (cross-cutting).
 *
 * Cada constante es el **ID del rol** (tal como está en la tabla `role` de la BD de
 * producción), expresado como string porque así viaja en el claim del JWT. Se usan IDs
 * y NO nombres a propósito: el nombre de un rol puede editarse desde el CRUD de roles,
 * y si el emparejamiento dependiera del nombre, ese cambio rompería guards/gating en
 * silencio. El ID, en cambio, es estable.
 *
 * El backend emite el ID en el role claim del JWT (ver JWTService.cs) y el nombre en un
 * claim aparte `role_name` solo para mostrar. El frontend lee los IDs con
 * `AuthService.getRoles()`, que devuelve `string[]`. Estas constantes son el espejo de
 * `Shared/Constants/Roles.cs` en el backend: mantener ambos alineados.
 *
 * ⚠️ Los IDs deben coincidir entre los entornos (dev/prod). La BD de dev está alineada
 * a los IDs de prod.
 *
 * Uso:
 *   import { Roles } from 'src/app/core/constants/roles';
 *   this.authService.hasRole(Roles.COSTOS_OFICINA_CENTRAL);
 *
 * NOTA: 'CONTRATISTA' (11) y 'CLINICA' (14) también existen como roles, pero sus
 * sesiones usan un flujo de auth propio (tipo en localStorage, no el claim role_id).
 * Para ellos se sigue usando `authService.isContratista()` / `isClinica()`, no estas
 * constantes.
 */
export const Roles = {
  ADMINISTRADOR_SISTEMA:            '1',  // ADMINISTRADOR DEL SISTEMA
  ADMINISTRADOR_UDP:                '2',  // ADMINISTRADOR DE UDP
  USUARIO_UDP:                      '3',  // USUARIO DE UDP
  ADMINISTRADOR_RESIDENTES:         '4',  // ADMINISTRADOR DE RESIDENTES
  RESIDENTE:                        '5',  // RESIDENTE
  COSTOS_OFICINA_CENTRAL:           '6',  // USUARIO DE COSTOS Y PRESUPUESTOS DE OFICINA CENTRAL
  COSTOS_ADMINISTRADOR:             '7',  // ADMINISTRADOR DE COSTOS Y PRESUPUESTOS
  USUARIO_ARQUITECTURA_COMERCIAL:   '8',  // USUARIO DE ARQUITECTURA COMERCIAL
  ADMINISTRADOR_SSOMA:              '9',  // JEFE SSOMA (antes ADMINISTRADOR SSOMA)
  ADMINISTRADOR_ADMINISTRACION:     '10', // ADMINISTRADOR ADMINISTRACION
  USUARIO_DE_ABRIL:                 '12', // USUARIO DE ABRIL
  // 15 (ADMINISTRADOR DE GESTIÓN ADMINISTRATIVA) eliminado el 2026-07-14; lo reemplaza el 76.
  CONTABILIDAD_FIRMANTE:            '16', // USUARIO FIRMANTE DE FACTURAS DE CONTABILIDAD
  ADMINISTRADOR_MEJORA_CONTINUA:    '48', // ADMINISTRADOR DE MEJORA CONTINUA
  SERVICIO_VIGILANCIA:              '49', // SERVICIO DE VIGILANCIA
  GESTOR_ARQUITECTURA_COMERCIAL:    '51', // GESTOR DE ARQUITECTURA COMERCIAL
  USUARIO_RECEPCION:                '52', // USUARIO DE RECEPCIÓN
  SALUD_OCUPACIONAL:                '53', // MÉDICO OCUPACIONAL (antes SALUD OCUPACIONAL)
  VISUALIZADOR_EVALUACIONES:        '56', // VISUALIZADOR DE EVALUACIONES
  EVALUADOR:                        '57', // EVALUADOR
  ADMINISTRADOR_EVALUACIONES:       '58', // ADMINISTRADOR DE EVALUACIONES
  ADMINISTRADOR_DE_OBRA:            '60', // ADMINISTRADOR DE OBRA
  COSTOS_OFICINA_TECNICA:           '61', // USUARIO DE COSTOS Y PRESUPUESTOS DE OFICINA TÉCNICA
  USUARIO_VECINOS:                  '62', // USUARIO DE VECINOS
  ADMINISTRADOR_OBRA_VECINOS:       '63', // ADMINISTRADOR DE OBRA DE VECINOS
  CONTABILIDAD_USUARIO:             '64', // USUARIO DE CONTABILIDAD
  VISUALIZADOR_DASHBOARD_RESIDENTES:'65', // VISUALIZADOR DE DASHBOARD RESIDENTES
  USUARIO_TRABAJADORES:             '66', // USUARIO DE TRABAJADORES
  COORDINADOR_SSOMA:                '70', // COORDINADOR SSOMA
  ASISTENTA_SOCIAL:                 '71', // ASISTENTA SOCIAL
  PREVENCIONISTA:                   '72', // PREVENCIONISTA
  CONTRATISTA_SUPERVISOR_CAMPO:     '74', // CONTRATISTA - SUPERVISOR DE CAMPO
  ADMINISTRADOR_SOLICITUD_SALIDAS:  '76', // ADMINISTRADOR DE SOLICITUD DE SALIDAS
  USUARIO_GTH:                      '77', // USUARIO DE GTH
  USUARIO_REVISOR_SALIDAS:          '78', // USUARIO REVISOR DE SALIDAS
  // TESORERO: no basta con tenerlo. El backend solo concede sus features si además el puesto del
  // trabajador es de categoría TESORERO (46) — ver AuthRepository.GetAllowedFeaturesAsync —, así
  // que un hasRole(TESORERO) puede ser true sin que la persona vea la pantalla. Para saber si
  // entra en modo tesorería, mirar `esTesorero` de gestion-salidas/filter-data, no este rol.
  TESORERO:                         '83', // TESORERO
} as const;

/** Unión de los valores literales de rol (para tipar parámetros que esperen un rol). */
export type Role = (typeof Roles)[keyof typeof Roles];
