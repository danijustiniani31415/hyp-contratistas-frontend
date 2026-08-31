/** Categoría del catálogo: es el campo que manda sobre entregables, permisos y filtros internos. */
export interface CategoriaAdminDto {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

/**
 * Puesto del catálogo único (reemplazó a la vieja "ocupación", cuya data se fusionó acá).
 * Cada puesto pertenece a exactamente una categoría, y esa es la categoría de todos los
 * trabajadores que lo tengan: el nombre del puesto no decide nada, pero su categoría sí.
 */
export interface PuestoAdminDto {
  id: number;
  nombre: string;
  /** Obligatoria. Es de acá de donde sale la categoría de cada trabajador con este puesto. */
  categoriaId: number;
  categoriaNombre: string | null;
  orden: number;
  activo: boolean;
  /**
   * Fichas de trabajadores que usan este puesto. Es lo que decide si se puede
   * eliminar: un puesto en uso solo se puede desactivar.
   */
  cantidadTrabajadores: number;
  /**
   * Área que puede PEDIR este puesto en Solicitud de Personal (nodo de `area_scope`): al
   * solicitante se le ofrecen los puestos de su área y de sus áreas hijas. Una sola. `null` =
   * sin área, que es válido: los puestos de obra no tienen porque el padrón de GTH solo
   * cubrió personal de oficina.
   */
  areaSolicitanteScopeId: number | null;

  /** Nombre del área solicitante ya resuelto por el backend, para pintarlo sin recorrer el árbol. */
  areaSolicitanteNombre: string | null;

  /**
   * Área a la que ENTRA el postulante si lo aprueban como finalista: es la que queda en su
   * ficha y con la que se resuelve su jefatura. No es la misma que la de arriba — la Gerencia
   * Inmobiliaria pide un Ingeniero Residente y el residente entra a Residencia. `null` = se
   * cae al área del solicitante.
   */
  areaDestinoScopeId: number | null;

  /** Nombre del área de destino ya resuelto por el backend. */
  areaDestinoNombre: string | null;
}

/**
 * Nodo del árbol `area_scope` como lista plana; el frontend arma la jerarquía con
 * `areaScopeParentId`. Alimenta el filtro por área en cascada y el selector del modal.
 */
export interface AreaNodoDto {
  areaScopeId: number;
  areaScopeParentId: number | null;
  areaItemName: string;
  displayOrder: number;
}

/**
 * Fila del detalle "trabajadores de este puesto". Es una ficha de workers, no una persona:
 * quien reingresó tiene más de una y puede salir dos veces si ambas apuntan al mismo
 * puesto — a propósito, para que la lista cuadre con `cantidadTrabajadores`.
 */
export interface PuestoTrabajadorDto {
  workerId: number;
  nombreCompleto: string;
  emailCorporativo: string | null;
}

/** Carga inicial de la pantalla: las tres listas en una sola respuesta. */
export interface CatalogosAdminDto {
  categorias: CategoriaAdminDto[];
  puestos: PuestoAdminDto[];
  /** Árbol de áreas (lista plana) para el filtro en cascada y el selector del modal. */
  areaTree: AreaNodoDto[];
}

/** Alta/edición de un puesto: nombre, categoría (obligatoria) y sus dos áreas. */
export interface PuestoUpsertRequest {
  nombre: string;
  categoriaId: number;
  /** Área que puede pedirlo. `null` = se queda sin área (válido: los de obra no tienen ninguna). */
  areaSolicitanteScopeId: number | null;
  /** Área a la que entra el postulante. `null` = se cae al área del solicitante. */
  areaDestinoScopeId: number | null;
}

/**
 * Resultado de eliminar en bloque. `omitidos` son los seleccionados que quedaron con
 * trabajadores usándolos entre la carga de la pantalla y el envío: se saltan en vez de
 * hacer fallar todo el lote.
 */
export interface PuestosEliminarResultDto {
  eliminados: number;
  omitidos: number;
}
