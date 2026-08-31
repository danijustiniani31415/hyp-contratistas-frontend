export interface SsItemTrabajadorDto {
  id: number;
  nombre: string;
  aplicaA: string;
  responsable: string;
  requiereVigencia: boolean;
  esSctrVidaley: boolean;
  orden: number;
  activo: boolean;
}

export interface SsItemEmpresaDto {
  id: number;
  nombre: string;
  responsable: string;
  orden: number;
  requiereVigencia: boolean;
  activo: boolean;
}

export interface ReglaDto {
  id: number;
  itemId: number;
  nombreItem?: string;
  categoriaId?: number;
  tipoTrabajador?: string;
  requerido: boolean;
  evaluadorRol?: string;
  nota?: string;
  activo: boolean;
}

export interface AreaCatDto {
  area: string;
}

export interface SubareaCatDto {
  id?: number;
  subarea: string;
  area: string;
  jefatura: string;
}

/**
 * Un nodo del árbol de áreas (`area_scope`) para los desplegables en cascada del formulario de
 * trabajadores. El backend ya resuelve por nodo la equivalencia legacy (`area`/`subarea`/`jefatura`,
 * lo que quedará guardado si se elige el nodo) y los revisores que le tocarían al trabajador, así
 * que el formulario no replica ninguna regla ni pide nada más al cambiar de área.
 */
export interface AreaArbolNodoDto {
  areaScopeId: number;
  areaScopeParentId: number | null;
  areaItemName: string;
  /** "Área de Gerencia" / "Área Estándar". */
  areaTypeName: string;
  displayOrder: number;
  area?: string | null;
  subarea?: string | null;
  jefatura?: string | null;
  /**
   * Candidatos a revisor en orden de resolución: los de este nodo, después los de sus áreas
   * superiores y al final el área de GTH. El formulario muestra el primero que no sea el propio
   * trabajador — los jefes de área son el revisor de su área, así que sin descartarlo se verían
   * como su propio jefe.
   */
  revisores: AreaArbolRevisorDto[];
  /** Revisores por proyecto, solo en áreas configuradas como "filtrar por proyecto". */
  revisoresPorProyecto: AreaArbolRevisorProyectoDto[];
}

/**
 * Un candidato a revisor. `workerId`/`personId` son con lo que el formulario reconoce al propio
 * trabajador (por persona, porque un reingreso deja varias fichas para la misma persona); ambos
 * vienen en null cuando el candidato es el área de GTH.
 */
export interface AreaArbolRevisorDto {
  workerId?: number | null;
  personId?: number | null;
  nombre?: string | null;
  email?: string | null;
}

export interface AreaArbolRevisorProyectoDto {
  proyectoId: number;
  revisores: AreaArbolRevisorDto[];
}

/**
 * Opción del desplegable que aparece al marcar "Jefe personalizado" en el formulario de
 * trabajadores: cualquier trabajador con correo corporativo @abril.pe, tenga o no usuario
 * del sistema.
 */
export interface JefeCandidatoDto {
  workerId: number;
  /** Persona del candidato, para descartar al propio trabajador aunque su ficha sea otra. */
  personId?: number | null;
  fullName?: string | null;
  email?: string | null;
}

/**
 * Opción del catálogo workers_obra_oficina_staff: Obra / Staff / Oficina Central.
 * Sustituye a la lista hardcodeada del formulario de trabajadores y al antiguo
 * tipo de área "Área Obra_Oficina".
 */
export interface ObraOficinaStaffDto {
  obraOficinaStaffId: number;
  name: string;
}

/** Catálogo de tipos de equipo (Volquete, Excavadora de Oruga, ...) para el formulario de equipos. */
export interface TipoEquipoDto {
  id: number;
  nombre: string;
}

export interface TipoEquipoAdminDto {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

/** Ítem/entregable exigido a un equipo. tipoEquipoId null = genérico (aplica a todos los tipos). */
export interface ItemEquipoAdminDto {
  id: number;
  nombre: string;
  requiereVigencia: boolean;
  orden: number;
  activo: boolean;
  tipoEquipoId: number | null;
  tipoEquipoNombre: string | null;
}

export interface ItemEquipoUpsertRequest {
  nombre: string;
  requiereVigencia: boolean;
  tipoEquipoId: number | null;
}
