import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';

export interface SolicitudSalidaCapturaDto {
  id: number;
  imageUrl: string;
  filename: string;
  monto: number;
  uploadedAt: string;
}

export interface TrayectoAdjuntoDto {
  url: string;
  filename: string;
}

export interface TrayectoDetalleDto {
  id: number;
  orden: number;
  horaSalida: string;
  horaRetorno: string | null;
  motivo: string;
  /** Detalle que acompaña al motivo cuando este lo exige. Null si no aplica. */
  motivoAdicional: string | null;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  /** Documentos adjuntos del trayecto (motivos que requieren documento). Vacío si no tiene. */
  adjuntos: TrayectoAdjuntoDto[];
  capturas: SolicitudSalidaCapturaDto[];
  /** Monto del catálogo ga_trayecto (solo trabajador TI con match origen+destino). */
  montoCatalogo: number | null;
  /** Monto efectivo: suma de capturas si hay; sino montoCatalogo; sino 0. */
  montoTotal: number;
}

export interface SolicitudSalidaRendicionDto {
  id: number;
  pdfUrl: string;
  pdfFilename: string;
  rendidoAt: string;
}

export interface SolicitudSalidaDetalleDto {
  id: number;
  fechaSalida: string;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  motivoRechazo: string | null;
  /** PDF de la planilla de rendición. Null si la solicitud aún no fue rendida. */
  rendicion: SolicitudSalidaRendicionDto | null;
  /** Consolidado del S10 vigente (propio de la salida o heredado de su planilla). Null si no hay. */
  consolidadoS10: ConsolidadoS10Dto | null;
  trayectos: TrayectoDetalleDto[];
}
