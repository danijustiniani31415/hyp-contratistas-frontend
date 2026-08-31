export interface InspeccionDestinatarioDto {
  nombre: string;
  email: string;
}

export interface InspeccionDestinatariosCierreDto {
  residenteEmail: string | null;
  coordSsomaEmail: string | null;
  gerenteInmobiliarioEmail: string | null;
  prevencionistas: InspeccionDestinatarioDto[];
  participantes: InspeccionDestinatarioDto[];
  jefeSsomaEmail: string | null;
  tuEmail: string | null;
}

export interface InspeccionTipoDto {
  id: number;
  nombre: string;
  ambito: 'Seguridad' | 'Salud' | 'Ambiente';
  esColaborativa: boolean;
}

export interface InspeccionChecklistItemDto {
  id: number;
  tipoId: number;
  pregunta: string;
  categoria: string | null;
  orden: number;
}

export interface ChecklistGrupo {
  categoria: string;
  items: InspeccionChecklistItemDto[];
}

export interface InspeccionRespuestaRequest {
  itemId: number;
  resultado: 'Cumple' | 'NoCumple' | 'NA';
  observacion?: string;
}

export interface InspeccionHallazgoRequest {
  descripcion: string;
  tipo: 'Critico' | 'Mayor' | 'Menor';
  area?: string;
  responsableNombre?: string;
  responsableCargo?: string;
  fechaLimite?: string;
  accionCorrectiva?: string;
  latitud?: number;
  longitud?: number;
  fotosBase64: string[];
}

export interface EditarHallazgoRequest {
  descripcion: string;
  tipo: 'Critico' | 'Mayor' | 'Menor';
  area?: string;
  responsableNombre?: string;
  responsableCargo?: string;
  fechaLimite?: string;
  accionCorrectiva?: string;
}

export interface CrearInspeccionRequest {
  proyectoId: number;
  tipoId: number;
  empresaId?: number;
  esPlanificada: boolean;
  fecha: string;
  horaInicio?: string;
  horaFin?: string;
  area?: string;
  responsableArea?: string;
  /** Worker del inspector. Fuente de verdad para Desempeño Supervisor (el nombre es solo texto). */
  inspectorWorkerId?: number;
  inspectorNombre?: string;
  inspectorCargo?: string;
  inspectorEmpresa?: string;
  firmaInspectorBase64?: string;
  representanteNombre?: string;
  representanteCargo?: string;
  firmaRepresentanteBase64?: string;
  descripcionCausas?: string;
  conclusiones?: string;
  esColaborativa?: boolean;
  respuestas: InspeccionRespuestaRequest[];
  hallazgos: InspeccionHallazgoRequest[];
  fotosAreaBase64?: string[];
}

export interface ParticipanteDto {
  id: number;
  nombre: string;
  cargo: string | null;
  empresa: string | null;
  fechaUnion: string;
}

export interface InspeccionAbiertaListItemDto {
  id: number;
  proyectoNombre: string;
  tipoNombre: string;
  fecha: string;
  totalHallazgos: number;
  totalParticipantes: number;
  createdAt: string;
}

export interface CerrarHallazgoRequest {
  accionCorrectiva: string;
  evidenciaCierreBase64?: string;
}

export interface InspeccionHallazgoFotoDto {
  id: number;
  url: string;
  descripcion: string | null;
  orden: number;
}

export interface InspeccionHallazgoDto {
  id: number;
  descripcion: string;
  tipo: 'Critico' | 'Mayor' | 'Menor';
  area: string | null;
  responsableNombre: string | null;
  responsableCargo: string | null;
  fechaLimite: string | null;
  estado: 'Abierto' | 'EnProceso' | 'Cerrado';
  accionCorrectiva: string | null;
  evidenciaCierreUrl: string | null;
  fechaCierre: string | null;
  latitud: number | null;
  longitud: number | null;
  creadoPorNombre: string | null;
  fotos: InspeccionHallazgoFotoDto[];
}

export interface InspeccionRespuestaDto {
  itemId: number;
  pregunta: string;
  categoria: string | null;
  orden: number;
  resultado: 'Cumple' | 'NoCumple' | 'NA';
  observacion: string | null;
}

export interface InspeccionDetalleDto {
  id: number;
  proyectoId: number;
  proyectoNombre: string;
  tipoId: number;
  tipoNombre: string;
  tipoAmbito: string;
  empresaId: number | null;
  empresaNombre: string | null;
  esPlanificada: boolean;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  area: string | null;
  responsableArea: string | null;
  inspectorNombre: string | null;
  inspectorCargo: string | null;
  inspectorEmpresa: string | null;
  firmaInspectorUrl: string | null;
  representanteNombre: string | null;
  representanteCargo: string | null;
  firmaRepresentanteUrl: string | null;
  descripcionCausas: string | null;
  conclusiones: string | null;
  totalItems: number;
  totalCumple: number;
  totalNoCumple: number;
  totalNa: number;
  tasaCumplimiento: number | null;
  estado: string;
  esColaborativa: boolean;
  createdAt: string;
  respuestas: InspeccionRespuestaDto[];
  hallazgos: InspeccionHallazgoDto[];
  fotosArea: InspeccionHallazgoFotoDto[];
  participantes: ParticipanteDto[];
}

export interface InspeccionListItemDto {
  id: number;
  proyectoNombre: string;
  tipoNombre: string;
  tipoAmbito: string;
  empresaNombre: string | null;
  esPlanificada: boolean;
  fecha: string;
  area: string | null;
  inspectorNombre: string | null;
  totalHallazgos: number;
  hallazgosCriticos: number;
  hallazgosAbiertos: number;
  tasaCumplimiento: number | null;
  estado: string;
  createdAt: string;
}

export interface InspeccionTendenciaMensualDto {
  anio: number;
  mes: number;
  mesNombre: string;
  total: number;
  tasaPromedio: number | null;
}

export interface InspeccionPorTipoDto {
  tipoNombre: string;
  ambito: string;
  total: number;
  tasaPromedio: number | null;
}

export interface InspeccionHallazgoPorAreaDto {
  area: string;
  total: number;
  criticos: number;
  abiertos: number;
}

export interface InspeccionHallazgoRecurrenteDto {
  descripcion: string;
  ocurrencias: number;
  ultimoTipo: string;
}

export interface InspeccionDashboardDto {
  totalInspecciones: number;
  totalEsteMes: number;
  hallazgosAbiertos: number;
  hallazgosCriticosAbiertos: number;
  tasaCumplimientoPromedio: number | null;
  tasaCumplimientoEsteMes: number | null;
  tendenciaMensual: InspeccionTendenciaMensualDto[];
  porTipo: InspeccionPorTipoDto[];
  hallazgosPorArea: InspeccionHallazgoPorAreaDto[];
  hallazgosRecurrentes: InspeccionHallazgoRecurrenteDto[];
}
