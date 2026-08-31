/** Tipo de destinatario: PRINCIPAL va en "Para", COPIA va en "CC". */
export type EmoCorreoTipo = 'PRINCIPAL' | 'COPIA';

/** Códigos de los 4 correos de EMO configurables (una sección por cada uno). */
export type EmoCorreoEventoCodigo =
  | 'PROGRAMACION_AUTOMATICA'
  | 'PROGRAMACION_MANUAL'
  | 'ACEPTADA'
  | 'RECHAZADA';

/** Una columna de la matriz: el perfil del trabajador. */
export interface EmoCorreoPerfilDto {
  id: number;
  codigo: 'OFICINA_CENTRAL' | 'STAFF' | 'OBRA' | 'CONTRATISTA';
  nombre: string;
  descripcion: string | null;
}

/** El interruptor de una celda: a este destinatario le llega este correo para este perfil. */
export interface EmoCorreoCeldaDto {
  reglaId: number;
  perfilId: number;
  perfilCodigo: string;
  active: boolean;
}

/** Una fila de la matriz de un correo. */
export interface EmoCorreoFilaDto {
  destinatarioId: number;
  /** null en los correos adicionales agregados a mano. */
  codigo: string | null;
  nombre: string | null;
  descripcion: string | null;
  /** null en los destinatarios dinámicos: su correo se resuelve al enviar. */
  email: string | null;
  tipo: EmoCorreoTipo;
  /** true = se puede cambiar el correo desde la pantalla. */
  editable: boolean;
  /** true = se puede eliminar (solo los correos adicionales). */
  eliminable: boolean;
  /** true = además de estar activo, exige que el proyecto tenga arquitectura comercial. */
  requiereArqCom: boolean;
  /** true = está activo en algún perfil pero no tiene correo cargado, así que no le llega nada. */
  sinCorreo: boolean;
  orden: number;
  celdas: EmoCorreoCeldaDto[];
}

/** Una sección de la pantalla: un correo con toda su matriz. */
export interface EmoCorreoEventoDto {
  id: number;
  codigo: EmoCorreoEventoCodigo;
  nombre: string;
  descripcion: string | null;
  orden: number;
  destinatarios: EmoCorreoFilaDto[];
}

/** Respuesta única de la pantalla: columnas + los 4 correos con su matriz. */
export interface EmoCorreosConfigDto {
  perfiles: EmoCorreoPerfilDto[];
  eventos: EmoCorreoEventoDto[];
}

export interface EmoCorreoAdicionalCreateDto {
  /** Correo desde cuya sección se agrega: nace activo en sus 4 perfiles. */
  eventoCodigo: string;
  email: string;
  nombre?: string | null;
  tipo?: EmoCorreoTipo;
}

export interface EmoCorreoDestinatarioUpdateDto {
  email: string;
  nombre?: string | null;
  tipo?: EmoCorreoTipo;
}
