export interface DashboardFiltroDTO {
  categoriaId : number | null;
  proyectoId  : number | null;
  userId      : number | null;
  semana      : number | null;
  mes         : number | null;
  anio        : number | null;
}

export interface ActividadAlertaDTO {
  id            : number;
  nombre        : string;
  proyecto      : string;
  responsable1  : string | null;
  responsable2  : string | null;
  emailResp1    : string | null;
  emailResp2    : string | null;
  fechaInicio   : string | null;
  fechaFin      : string | null;
  estado        : string | null;
  spi           : number | null;
  tipo          : string;
  categoria     : string | null;
  diasRestantes : number;
}

export interface EnviarAlertaRequestDTO {
  actividadIds: number[];
  tipoAlerta  : string;
}
