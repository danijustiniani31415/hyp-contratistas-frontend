import { ConvalidacionListDto } from './convalidacion.model';

export type AptitudEmo =
  | 'Apto'
  | 'Apto con Restricciones'
  | 'No Apto'
  | 'Observado'
  | 'Pendiente'
  | string;

export type EstadoEmo = 'Vigente' | 'Por Vencer' | 'Vencido' | 'Anulado' | string;

export interface EmoListItemDto {
  id: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  tipoEmo: string;
  empresa: string;
  fechaEmo: string;
  fechaVencimiento: string;
  aptitud: AptitudEmo;
  estado: EstadoEmo;
  diasParaVencer: number;
}

export interface EmoDetalleDto extends EmoListItemDto {
  clinica?: string;
  medico?: string;
  numeroInforme?: string;
  urlResultado?: string;
  urlAptitud?: string;
  urlEmoCompleto?: string;
  /** true = la lectura la hace el médico de Abril, no la clínica. */
  requiereLecturaAbril?: boolean;
  requiereInterconsulta: boolean;
  notas?: string;
  examenes?: EmoExamenDetalleDto[];
  restricciones?: EmoRestriccionDto[];
  convalidaciones?: ConvalidacionListDto[];
  programacion?: EmoProgramacionDetalleDto;
  interconsulta?: EmoInterconsultaResumenDto;
}

export interface EmoProgramacionDetalleDto {
  id: number;
  fechaProgramada: string;
  horaProgramada?: string;
  checkInHora?: string;
  clinicaNombre?: string;
  medicoNombre?: string;
  estado: string;
  origen?: string;
  motivoRechazo?: string;
}

export interface EmoInterconsultaResumenDto {
  id: number;
  especialidad: string;
  medicoDeriva?: string;
  fechaDerivacion: string;
  fechaAtencion?: string;
  centroAtencion?: string;
  diagnostico?: string;
  cie10?: string;
  resultado?: string;
  estado: string;
  requiereSeguimiento: boolean;
  urlInforme?: string;
}

export interface EmoExamenDetalleDto {
  id: number;
  examenTipo: string;
  resultado?: string;
  valor?: string;
  unidad?: string;
  observacion?: string;
}

export interface EmoRestriccionDto {
  id: number;
  restriccionTipo?: string;
  descripcionLibre?: string;
  vigente: boolean;
}

export interface EmoCreateDto {
  workerId: number;
  tipoEmoId: number;
  empresaOrigenId?: number;
  fechaEmo: string;
  clinicaId?: number;
  medicoId?: number;
  aptitud: AptitudEmo;
  requiereInterconsulta: boolean;
  numeroInforme?: string;
  urlResultado?: string;
  notas?: string;
  examenes: EmoExamenCreateDto[];
  restricciones: EmoRestriccionCreateDto[];
  fechaLectura?: string;
  /** true = la lectura la hace el médico de Abril, no la clínica. */
  requiereLecturaAbril?: boolean;
  interconsultaInline?: InterconsultaInlineCreateDto;
}

export interface EmoExamenCreateDto {
  examenTipoId: number;
  resultado?: string;
  valor?: string;
  unidad?: string;
  observacion?: string;
}

export interface EmoRestriccionCreateDto {
  restriccionTipoId?: number;
  descripcionLibre?: string;
  vigente?: boolean;
}

export interface WorkerEmoHistorialDto {
  workerId: number;
  workerNombre: string;
  workerDni: string;
  /** Nombre del puesto (campo de presentación). */
  puesto?: string;
  empresa?: string;
  vinculaciones?: VinculacionConEmosDto[];
}

export interface VinculacionConEmosDto {
  empresaNombre: string;
  fechaInicio: string;
  fechaFin?: string;
  emos?: EmoListItemDto[];
}

export interface EmoQueryParams {
  workerId?: number;
  estado?: string;
  aptitud?: string;
  empresaId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export type WorkerEstado = 'ACTIVO' | 'RETIRADO' | string;

export interface EmoPorTrabajadorDto {
  workerId: number;
  nombreCompleto: string;
  dni: string;
  estadoWorker?: WorkerEstado;
  empresaId?: number;
  empresa?: string;
  empresaOrigenNombre?: string;
  proyectoId?: number;
  proyecto?: string;
  proyectoNombre?: string;
  tipoContrata?: string;
  /**
   * true cuando la fila no es un trabajador todavía, sino la ficha de pre-ingreso de un finalista
   * aprobado en Reclutamiento que aún no firma contrato: solo se le puede programar EMO de Ingreso.
   */
  esFinalistaAprobado?: boolean;
  tieneEmo: boolean;
  emoId?: number;
  tipoEmo?: string;
  fechaEmo?: string;
  fechaVencimiento?: string;
  aptitud?: AptitudEmo;
  estado?: EstadoEmo;
  diasRestantes?: number;
  // Prellenado del modal de edición (Configuración → Trabajadores).
  documentIdentityTypeId?: number;
  cumpleanos?: string;
  urlAptitud?: string;
  urlEmoCompleto?: string;
  urlResultado?: string;
  /** true = la lectura la hace el médico de Abril, no la clínica. */
  requiereLecturaAbril?: boolean;
  requiereInterconsulta?: boolean;
  interconsultaId?: number;
  interconsultaEspecialidad?: string;
  interconsultaEstado?: string;
  interconsultaUrlInforme?: string;
  /** Estado de la programación de EMO más reciente (Programado, Aceptado por Clínica, etc.). */
  estadoProgramacionEmo?: string;
  // Campos editables (modal Configuración → Trabajadores). Todos opcionales: el endpoint
  // PUT /workers/{id} aún no existe en backend; los valores se muestran si vienen.
  celular?: string;
  emailCorporativo?: string;
  /** Correo personal / de contacto (person.email). */
  emailPersonal?: string;
  /** Nombre de la categoría (campo de lógica). */
  categoria?: string;
  /** Nombre del puesto (campo de presentación). */
  puesto?: string;
  /** FK a `categoria`, derivada del puesto. Solo lectura: precarga el filtro de categoría. */
  categoriaId?: number | null;
  /** FK a `puesto`, para prellenar el desplegable. */
  puestoId?: number | null;
  /** Nodo del árbol de áreas asignado al trabajador (workers.area_scope_id). */
  areaScopeId?: number | null;
  area?: string;
  subarea?: string;
  contrataCasa?: string;
  obraOficina?: string;
  jefatura?: string;
  sctr?: boolean;
  habilitadoObra?: boolean;
  notas?: string;
}

/** Catálogo de tipos de documento (DNI, CE, ...) para el select del modal. */
export interface DocumentTypeDto {
  id: number;
  abreviatura: string;
  descripcion: string;
}

/** Catálogo workers_category (categoría normalizada, usada por Salidas y Lecciones). */
export interface WorkerCategoryDto {
  id: number;
  nombre: string;
}

/** Edición mínima de datos de identidad del trabajador (modal Configuración). */
export interface WorkerDatosBasicosDto {
  nombreCompleto: string;
  documentIdentityTypeId?: number | null;
  numeroDocumento?: string | null;
  /** Formato 'YYYY-MM-DD'. */
  cumpleanos?: string | null;
  /** Nombre de la categoría (campo de lógica). */
  categoria?: string | null;
  /** Nombre del puesto (campo de presentación). */
  puesto?: string | null;
  /** Nodo del árbol de áreas asignado al trabajador (workers.area_scope_id). */
  areaScopeId?: number | null;
  /** FK a `categoria`, derivada de `puesto.categoriaId`. Solo lectura. */
  categoriaId?: number | null;
  /** FK a `puesto` (workers.puesto_id). Es de acá de donde sale la categoría. */
  puestoId?: number | null;
  /** Correo corporativo (workers.email_corporativo). Null/vacío = sin correo. */
  emailCorporativo?: string | null;
  /** Correo personal / de contacto (person.email). Puede repetirse entre trabajadores. */
  emailPersonal?: string | null;
}

/** Motivo por el que un correo corporativo no puede usarse (coincide con el backend). */
export type EmailCorporativoMotivo =
  | 'OBLIGATORIO'
  | 'FORMATO'
  | 'NO_EXISTE_EN_TENANT'
  | 'YA_TOMADO';

/**
 * Resultado de verificar un correo corporativo contra el directorio de Abril (tenant de
 * Microsoft) y contra los correos ya asignados en workers.
 */
export interface EmailCorporativoValidacionDto {
  valido: boolean;
  motivo?: EmailCorporativoMotivo | null;
  /** Mensaje listo para mostrar al usuario. Null cuando el correo es válido. */
  mensaje?: string | null;
  /** Correo canónico a guardar (el del directorio si se verificó en el tenant). */
  email?: string | null;
  /** Nombre para mostrar del buzón en el directorio de Abril. */
  nombreEnTenant?: string | null;
  /** True si el correo se contrastó contra el tenant (solo aplica a correos corporativos). */
  verificadoEnTenant: boolean;
  ocupadoPorWorkerId?: number | null;
  ocupadoPorNombre?: string | null;
}

export interface WorkerUpsertDto {
  apellidoNombre: string;
  dni?: string;
  celular?: string | null;
  emailCorporativo?: string | null;
  /** Correo personal / de contacto (person.email). Puede repetirse entre trabajadores. */
  emailPersonal?: string | null;
  fechaIngreso?: string | null;
  condicionMedica?: string | null;
  /**
   * FK a `puesto`: el campo de presentación del trabajador y el único camino a su categoría
   * (`puesto.categoriaId`). La categoría no se manda: cambiarla es cambiar de puesto, o
   * cambiarle la categoría al puesto desde Configuración → Categorías y Puestos.
   */
  puestoId?: number | null;
  /**
   * Nodo del árbol de áreas elegido (workers.area_scope_id). Cuando se manda, es la fuente de
   * verdad del área: el backend deriva de él `area`/`subarea`/`jefatura` e ignora lo que llegue
   * en esos tres campos.
   */
  areaScopeId?: number | null;
  area?: string | null;
  subarea?: string | null;
  contrataCasa?: string | null;
  /** FK a workers_obra_oficina_staff (Obra / Staff / Oficina Central). */
  obraOficinaStaffId?: number | null;
  jefatura?: string | null;
  sctr?: boolean;
  habilitadoObra?: boolean;
  notas?: string | null;
  tipoDocumento?: string;
  empresaId?: number | null;
  proyectoId?: number | null;
  fechaNacimiento?: string | null;
  /**
   * Checkbox "Mostrar en el boletín" (person.mostrar_en_boletin): true = su cumpleaños sale en el
   * calendario del boletín. Se omite cuando el formulario no gestiona el campo (contratistas, que
   * tampoco capturan fecha de nacimiento) y ahí el backend deja intacto lo guardado.
   */
  mostrarEnBoletin?: boolean;
  sexo?: string | null;
  aniosExperiencia?: number | null;
  /**
   * true = el formulario gestiona el jefe del trabajador y `jefePersonalizadoWorkerId` manda
   * (se guarda ese jefe o, con null, se quita el que tuviera y vuelve a mandar el revisor de
   * su área). false = el formulario no muestra el campo (obreros y contratistas) y el backend
   * no toca lo que ya estuviera guardado.
   */
  gestionaJefe?: boolean;
  /** Jefe elegido a mano (workers.id), que se sobrepone al revisor del área. */
  jefePersonalizadoWorkerId?: number | null;
}

export interface InterconsultaInlineCreateDto {
  especialidad: string;
  centroAtencion?: string;
  diagnostico?: string;
  cie10?: string;
  medicoDerivaId?: number;
  requiereSeguimiento: boolean;
}

export interface EmoPorTrabajadorQuery {
  /** Una sola ficha: lo usa el enlace desde Reclutamiento para abrir directo al finalista. */
  workerId?: number;
  /**
   * Trae TODAS las fichas de `workers` (solo se descartan las eliminadas, `person.state`),
   * sin exigir vinculación vigente con una empresa Abril. Lo manda únicamente
   * Configuración → Trabajadores, que es donde se corrige el puesto/área de cualquier ficha
   * —incluidas las de retirados—. Las pantallas de EMOs (SSOMA y Clínica) no lo mandan.
   */
  todasLasFichas?: boolean;
  search?: string;
  aptitud?: string;
  estado?: string;
  empresaId?: number;
  proyectoId?: number;
  areaScopeId?: number;
  fechaEmoDesde?: string;
  fechaEmoHasta?: string;
  sinLectura?: boolean;
  sinCertificado?: boolean;
  sinEmoCompleto?: boolean;
  sinInterconsulta?: boolean;
  /** Subtab "Pendientes de lectura": RequiereLecturaAbril = true y sin archivo de lectura aún. */
  pendienteLecturaAbril?: boolean;
  /** 'fechaEmo' | 'fechaVencimiento' */
  sortBy?: string;
  sortDesc?: boolean;
  page?: number;
  pageSize?: number;
}
