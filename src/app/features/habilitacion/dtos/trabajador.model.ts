export interface WorkerHabilitacionListDto {
  workerId: number;
  apellidoNombre: string;
  dni: string;
  empresaNombre?: string;
  empresaId?: number;
  proyectoActual?: string;
  proyectoActualId?: number;
  estadoHabilitacion: string;
  /** Habilitación SSOMA de la empresa Contratista (ignora entregables administrativos) —
   * siempre true para Casa/oficina central. Si es false y estadoHabilitacion es "No Autorizado",
   * el motivo es la empresa y no la documentación propia del trabajador. */
  empresaHabilitada?: boolean;
  /** Nombre de la categoría (campo de lógica). */
  categoria?: string;
  /** FK a `categoria`, derivada de `puesto.categoriaId` — necesaria para filtrar el catálogo
   * de puestos por categoría en "Cambiar obra". Solo lectura. */
  categoriaId?: number | null;
  /** Nombre del puesto (campo de presentación). */
  puesto?: string;
  /** FK a `puesto` — necesaria para prellenar el selector de "Cambiar obra". */
  puestoId?: number | null;
  estadoWorker: string;
  contrataCasa?: string;
  /** FK a workers_obra_oficina_staff. */
  obraOficinaStaffId?: number | null;
  /** Nombre del catálogo (solo lectura). */
  obraOficina?: string;
  tieneEmo?: boolean;
  diasRestantesEmo?: number | null;
  estadoProgramacionEmo?: string | null;
  fechaIngreso?: string;
  aniosExperiencia?: number;
  /** "Pendiente" si el trabajador tiene una interconsulta sin levantar. */
  interconsultaEstado?: string | null;
  interconsultaEspecialidad?: string | null;
}

/** Fila del widget "Interconsultas pendientes" (junto a "EMOs Programados"). Sin datos
 * clínicos: solo lo necesario para coordinar la cita. */
export interface InterconsultaPendienteHabDto {
  workerId: number;
  workerNombre: string;
  razonSocial?: string | null;
  proyectoActual?: string | null;
  diasPendiente: number;
}

export interface WorkerEntregableDto {
  id: number;
  itemId: number;
  nombreItem: string;
  estado: string;
  vigencia?: string;
  /** Fecha propuesta en una renovación (estado "Renovando"); null en otros casos. */
  vigenciaPropuesta?: string;
  archivoUrl?: string;
  obsAbril?: string;
  obsContratista?: string;
  requiereVigencia: boolean;
  esSctrVidaley: boolean;
  responsable: string;
}

export interface WorkerEntregableUpdateDto {
  estado?: string;
  vigencia?: string;
  archivoUrl?: string;
  obsAbril?: string;
  obsContratista?: string;
}

export interface DocumentoArchivoDto {
  id: number;
  archivoUrl: string;
  nombreArchivo?: string;
  esZip: boolean;
  zipContenido?: { nombre: string; tamaño: number }[];
  orden: number;
}

export interface DocumentoVersionDto {
  id: number;
  version: number;
  archivoUrl: string;
  subidoPorUserId?: number;
  subidoPorEmpresaId?: number;
  subidoPorNombre?: string;
  estadoAlSubir?: string;
  createdAt: string;
  archivos?: DocumentoArchivoDto[];
}

export interface ArchivoStagingDto {
  file: File;
  nombre: string;
  path?: string;
  esZip: boolean;
  zipContenido?: string;
  subiendo: boolean;
  error: boolean;
}

export interface WorkerDetalleDto {
  workerId: number;
  /**
   * Persona de la ficha (`workers.person_id`). El formulario la usa para descartar al propio
   * trabajador de los candidatos a jefe: una persona puede tener varias fichas en `workers`
   * (reingreso), así que comparar solo por ficha dejaría pasar el caso.
   */
  personId?: number | null;
  apellidoNombre: string;
  dni?: string;
  celular?: string;
  emailCorporativo?: string;
  /** Correo personal / de contacto (person.email). */
  emailPersonal?: string;
  fechaIngreso?: string;
  condicionMedica?: string;
  fechaNacimiento?: string;
  /**
   * person.mostrar_en_boletin: true = su cumpleaños aparece en el calendario del boletín.
   * Precarga el checkbox "Mostrar en el boletín" del formulario.
   */
  mostrarEnBoletin?: boolean;
  sexo?: string;
  fechaRetiro?: string;
  sctr?: boolean;
  /**
   * Nodo del árbol de áreas asignado (workers.area_scope_id). Es lo que el formulario usa para
   * precargar los desplegables de área; `area`/`subarea` son su equivalencia legacy.
   */
  areaScopeId?: number | null;
  area?: string;
  subarea?: string;
  jefatura?: string;
  /** FK a workers_obra_oficina_staff. */
  obraOficinaStaffId?: number | null;
  /** Nombre del catálogo (solo lectura). */
  obraOficina?: string;
  aniosExperiencia?: number;
  /** FK a `categoria`, derivada de `puesto.categoriaId`. Solo lectura. */
  categoriaId?: number | null;
  /** FK a `puesto`: el campo de presentación y el único camino a la categoría. */
  puestoId?: number | null;
  /** Nombre del puesto, ya resuelto por el backend. */
  puesto?: string;
  /**
   * Jefe elegido a mano para este trabajador, que se sobrepone al revisor de su área.
   * Null/ausente = no tiene, así que su jefe es el que sugiere el sistema por el área.
   */
  jefePersonalizadoWorkerId?: number | null;
  jefePersonalizadoNombre?: string | null;
  jefePersonalizadoEmail?: string | null;
}

export interface WorkerEditDto {
  apellidoNombre: string;
  celular?: string;
  fechaNacimiento?: string;
  fechaRetiro?: string;
  sctr?: boolean;
  area?: string;
  subarea?: string;
  jefatura?: string;
}

export interface WorkerReingresoDto {
  nuevoProyectoId?: number;
  nuevaEmpresaId?: number;
  fechaReingreso?: string;
}

export interface WorkerEventoDto {
  id: number;
  tipoEvento: string;
  descripcion?: string;
  proyectoAnterior?: string;
  proyectoNuevo?: string;
  empresaAnterior?: string;
  empresaNueva?: string;
  datos?: string;
  createdAt: string;
}

export interface WorkerProyectoDto {
  id: number;
  workerId: number;
  proyectoId: number;
  proyectoNombre?: string;
  empresaId?: number;
  empresaNombre?: string;
  fechaInicio: string;
  fechaFin?: string;
  induccionCompletada: boolean;
  fechaInduccion?: string;
  activo: boolean;
}

export interface AgregarProyectoDto {
  proyectoId: number;
  empresaId?: number;
  fechaInicio?: string;
}
