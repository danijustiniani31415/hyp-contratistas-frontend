/** Tipos de la configuración de correos de Solicitud de Salidas. */

/** Códigos estables del catálogo de tipos de destinatario. */
export type CorreoTipoCodigo = 'TRABAJADOR' | 'AREA' | 'CORREO';

/** Una regla ya guardada (fila viva de ga_correo_regla). */
export interface CorreoRegla {
  id: number;
  tipoCodigo: CorreoTipoCodigo;
  workerId?: number | null;
  areaScopeId?: number | null;
  correo?: string | null;
  incluirDescendientes: boolean;
  active: boolean;
}

/** Un correo configurable (ga_correo_evento) con sus dos listas de reglas. */
export interface CorreoEvento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  orden: number;
  /** Interruptor maestro: false = este correo no se envía. */
  active: boolean;
  /** Etiqueta del destinatario principal que calcula el backend (el revisor, el solicitante). */
  destinatarioPrincipalNombre?: string | null;
  /** false = el correo no se manda a su destinatario principal, solo a los configurados. */
  destinatarioPrincipalActivo: boolean;
  /** true = la pantalla muestra el interruptor maestro de este correo. */
  permiteDesactivarEnvio: boolean;
  /** true = la pantalla muestra el interruptor del destinatario principal. */
  permiteDesactivarPrincipal: boolean;
  /** "Se enviará a" (reglas con es_exclusion = false). */
  incluir: CorreoRegla[];
  /** "Nunca se enviará a" (reglas con es_exclusion = true). */
  excluir: CorreoRegla[];
}

export interface CorreoTipo {
  id: number;
  codigo: CorreoTipoCodigo;
  nombre: string;
}

export interface CorreoWorkerOption {
  workerId: number;
  fullName?: string;
  email?: string;
}

export interface CorreoAreaOption {
  areaScopeId: number;
  nombre: string;
  parentId?: number | null;
  /** Correo de grupo del área (area_scope.email), informativo. */
  email?: string | null;
  /** Etiqueta para el desplegable; desambigua áreas con el mismo nombre (se calcula en el front). */
  label?: string;
}

/** Carga inicial de la pantalla (1 sola petición). */
export interface CorreoConfigInicial {
  eventos: CorreoEvento[];
  tipos: CorreoTipo[];
  trabajadores: CorreoWorkerOption[];
  areas: CorreoAreaOption[];
}

// ── Update ─────────────────────────────────────────────────────────────────

export interface CorreoReglaInput {
  tipoCodigo: CorreoTipoCodigo;
  workerId?: number | null;
  areaScopeId?: number | null;
  correo?: string | null;
  incluirDescendientes: boolean;
  active: boolean;
}

export interface CorreoReglasUpdate {
  incluir: CorreoReglaInput[];
  excluir: CorreoReglaInput[];
  /** Interruptor maestro del correo. Se omite en los correos que no lo permiten. */
  active?: boolean;
  /** Interruptor del destinatario principal. Se omite en los correos que no lo permiten. */
  destinatarioPrincipalActivo?: boolean;
}
