export interface MotivoSalidaDto {
  id: number;
  descripcion: string;
  /** Si true, al elegir este motivo se exige subir un documento adjunto. */
  requiereAdjunto: boolean;
  /** Si true, las horas declaradas con este motivo son estimadas (cambia la etiqueta de la hora de retorno). */
  esHoraEstimada: boolean;
  /** Si true, al elegir este motivo el formulario exige escribir un motivo adicional (detalle). */
  requiereMotivoAdicional: boolean;
}

export interface LugarSalidaDto {
  id: number;
  nombreDisplay: string;
  esLibre: boolean;
}

export interface TrayectoCatalogoOptionDto {
  lugarOrigenId: number;
  lugarDestinoId: number;
  monto: number;
}

export interface SolicitudSalidaFormDataDto {
  motivos: MotivoSalidaDto[];
  lugares: LugarSalidaDto[];
  aprobadorEmail: string | null;
  /** True si el trabajador es de Tecnología de la Información. */
  esTI: boolean;
  /** Catálogo (lugarOrigenId, lugarDestinoId) → monto. Solo poblado si esTI. */
  trayectosCatalogo: TrayectoCatalogoOptionDto[];
}
