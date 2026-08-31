export interface ProgramacionHabilitacionDto {
  id: number;
  trabajador: string;
  dni: string;
  proyecto: string;
  razonSocial: string;
  estado: string;
  fechaProgramada: string;
  hora?: string;
  notificado: boolean;
}
