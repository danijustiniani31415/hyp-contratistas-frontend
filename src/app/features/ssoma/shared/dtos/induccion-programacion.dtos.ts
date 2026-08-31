export interface ProyectoSimpleInduccionDTO {
  proyectoId: number;
  nombre: string;
}

export interface ResponsableProyectoDTO {
  workerId: number;
  nombre: string;
  rol: string;
}

export interface RotacionProyectoDTO {
  id: number;
  proyectoId: number;
  proyectoNombre: string;
  orden: number;
  activo: boolean;
  responsableWorkerId: number | null;
  responsableNombre: string | null;
}

export interface RotacionReordenarItemDTO {
  id: number;
  orden: number;
}

export interface ProgramacionInduccionDTO {
  id: number;
  fecha: string; // yyyy-MM-dd
  proyectoId: number;
  proyectoNombre: string;
  responsableWorkerId: number | null;
  responsableNombre: string | null;
  estado: 'Programada' | 'Cancelada' | 'Realizada';
  esManual: boolean;
  motivoCambio: string | null;
  avisoEnviado: boolean;
}
