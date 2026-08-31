export interface ProyectoConActividadesDTO {
  id: number;
  nombre: string;
  estado: string;
  responsableArqComId: number | null;
  responsableArqCom: string | null;
  totalActividades: number;
  activas: number;
  sinActividades: boolean;
}

export interface SupervisorAcDTO {
  id: number;
  apellidoNombre: string;
}

export interface ActividadListItemDTO {
  id: number;
  projectId: number;
  projectNombre: string | null;
  orden: number | null;
  spi?: number | null;
  nombre: string;
  partidaDeControl: string | null;
  etapaId: number | null;
  etapaNombre: string | null;
  categoriaId: number | null;
  categoriaNombre: string | null;
  especialidadId: number | null;
  especialidadNombre: string | null;
  userId: number | null;
  responsableNombre: string | null;
  userId2: number | null;
  responsableNombre2: string | null;
  encargado1: string | null;
  inicioProgramado: string | null;
  finProgramado: string | null;
  inicioEfectivo: string | null;
  finEfectivo: string | null;
  observaciones: string | null;
  activo: boolean;
  estado: string;
  retraso: number | null;
}

export interface ActividadListResponseDTO {
  total: number;
  pagina: number;
  porPagina: number;
  items: ActividadListItemDTO[];
}

export interface ActividadesQueryParams {
  proyectoId?: number | null;
  tipo?: string | null;
  etapaId?: number | null;
  search?: string | null;
  soloActivas?: boolean | null;
  filtroUserId?: number | null;
  pagina?: number;
  porPagina?: number;
}

export interface ActividadPatchBody {
  inicioProgramado?: string | null;
  finProgramado?: string | null;
  inicioEfectivo?: string | null;
  finEfectivo?: string | null;
  userId?: number | null;
  userId2?: number | null;
  observaciones?: string | null;
  estado?: string | null;
  activo?: boolean;
}

export interface ReasignarEncargadoResultDTO {
  actualizadas: number;
  workerNoEncontrado: boolean;
}

export interface PatchProyectoBody {
  responsableArqComId: number | null;
}

export interface GenerarActividadesResultDTO {
  generadas: number;
}

export interface GanttActividadDTO {
  id: number;
  projectId: number;
  projectNombre?: string | null;
  orden: number | null;
  nombre: string;
  tipo: string | null;
  etapaId: number | null;
  etapaNombre: string | null;
  activo: boolean;
  inicioProgramado: string | null;
  finProgramado: string | null;
  inicioEfectivo: string | null;
  finEfectivo: string | null;
}

export interface GanttQueryParams {
  proyectoId?: number | null;
  tipo?: string | null;
  etapa?: string | null;
  soloActivas?: boolean | null;
  filtroUserId?: number | null;
}

export interface PlantillaActividadDTO {
  id: number;
  orden: number | null;
  nombre: string;
  tipo: string | null;
  etapaId: number | null;
  etapaNombre: string | null;
  categoriaId: number | null;
  categoriaNombre: string | null;
  especialidadId: number | null;
  especialidadNombre: string | null;
  activo: boolean;
}

export interface CreatePlantillaBody {
  nombre: string;
  tipo?: string | null;
  etapaId?: number | null;
  categoriaId?: number | null;
  especialidadId?: number | null;
  orden?: number | null;
  activo?: boolean;
}

export interface PatchPlantillaBody {
  nombre?: string;
  tipo?: string | null;
  etapaId?: number | null;
  categoriaId?: number | null;
  especialidadId?: number | null;
  orden?: number | null;
  activo?: boolean;
}

export interface AcCategoriaDTO {
  id: number;
  nombre: string;
}

export interface AcEspecialidadDTO {
  id: number;
  nombre: string;
}

export interface AcEtapaDTO {
  id: number;
  nombre: string;
}

export interface UpdateActividadBody {
  nombre: string;
  tipo: string | null;
  etapaId: number | null;
  categoriaId?: number | null;
  especialidadId?: number | null;
  userId: number | null;
  userId2: number | null;
  inicioProgramado: string | null;
  finProgramado: string | null;
  inicioEfectivo: string | null;
  finEfectivo: string | null;
  observaciones: string | null;
}

export interface CreateActividadBody {
  nombre: string;
  tipo: string;
  projectId: number;
  etapaId: number | null;
  categoriaId?: number | null;
  especialidadId?: number | null;
  userId: number | null;
  inicioProgramado: string | null;
  finProgramado: string | null;
}
