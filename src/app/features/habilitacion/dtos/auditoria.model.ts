export interface AuditoriaCambioDto {
  id: number;
  tabla: string;
  registroId: number;
  accion: string;
  datosAnteriores?: string;
  datosNuevos?: string;
  usuarioId?: number;
  usuarioNombre?: string;
  empresaContratistaId?: number;
  ipAddress?: string;
  createdAt: string;
}
