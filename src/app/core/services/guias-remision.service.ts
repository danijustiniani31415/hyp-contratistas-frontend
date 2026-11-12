import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface GuiaRemisionItemCreate {
  /** null = línea libre (sin inventario): requiere `descripcion` y no mueve stock. */
  productoId: number | null;
  descripcion?: string;
  esBienTercero?: boolean;
  /** Solo del formulario (no se guarda): distingue línea libre de producto sin elegir todavía. */
  libre?: boolean;
  talla: string;
  color: string;
  cantidad: number;
  unidadMedida: string;
  pedidoItemId?: number | null;
}

export interface ConductorSecundario { numDoc: string; nombres: string; apellidos: string; licencia: string }
export interface VehiculoSecundario { placa: string; nroCirculacion?: string | null }

export interface GuiaRemisionCreate {
  motivoTraslado: string;
  modalidadTraslado: string;
  fechaTraslado: string;
  pesoBrutoTotal: number;
  pesoBrutoUnidad: string;
  numBultos?: number;
  almacenOrigenId: number;
  almacenDestinoId?: number;
  destinatarioRuc?: string;
  destinatarioRazonSocial?: string;
  transportistaRuc?: string;
  transportistaRazonSocial?: string;
  vehiculoPlaca?: string;
  conductorNombres?: string;
  conductorLicencia?: string;
  conductorDni?: string;
  conductorApellidos?: string;
  vehiculoNroCirculacion?: string;
  conductoresSecundarios: ConductorSecundario[];
  vehiculosSecundarios: VehiculoSecundario[];
  observacion?: string;
  items: GuiaRemisionItemCreate[];
}

export interface GuiaRemisionListItem {
  recepcionEstado?: RecepcionEstado;
  tieneDestino?: boolean;
  diferenciasAbiertas?: number;
  id: number;
  codigo: string;
  estado: string;
  almacenOrigenNombre: string;
  almacenDestinoNombre: string | null;
  fechaTraslado: string;
  cantidadItems: number;
  creadoEn: string;
}

export interface GuiaRemisionListResponse {
  data: GuiaRemisionListItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface GuiaRemisionItemDetalle {
  id: number;
  productoId: number | null;
  esLineaLibre: boolean;
  esBienTercero: boolean;
  productoNombre: string;
  productoCodigo: string | null;
  talla: string;
  color: string;
  cantidad: number;
  unidadMedida: string;
  pedidoItemId: number | null;
  pedidoCodigo: string | null;
  /** Lo que llegó bien (acumulado de todos los viajes). */
  cantidadConfirmada: number | null;
  cantidadDanada: number;
  cantidadFaltante: number;
  /** Lo que todavía no se ha declarado. */
  cantidadPendiente: number;
  confirmadoEn: string | null;
  confirmadoPorNombre: string | null;
}

export type RecepcionEstado = 'PENDIENTE' | 'PARCIAL' | 'COMPLETA' | 'CON_DIFERENCIAS';

export interface RecepcionItemDto {
  itemId: number;
  cantidadOk: number;
  cantidadDanada: number;
  motivo: string | null;
  observacion: string | null;
}

export interface RecepcionRegistrar {
  cierra: boolean;
  observacion: string | null;
  items: RecepcionItemDto[];
}

export interface RecepcionResultado {
  recepcionId: number;
  recepcionEstado: RecepcionEstado;
  diferenciasNuevas: number;
}

export interface RecepcionHistorial {
  id: number;
  recibidoEn: string;
  recibidoPorNombre: string;
  cierra: boolean;
  observacion: string | null;
  fotoIds: number[];
  items: { productoNombre: string; talla: string; cantidadOk: number; cantidadDanada: number; cantidadFaltante: number; motivo: string | null; observacion: string | null }[];
}

export interface Diferencia {
  id: number;
  guiaId: number;
  guiaCodigo: string;
  almacenDestinoNombre: string | null;
  productoNombre: string;
  talla: string;
  unidadMedida: string;
  tipo: 'FALTANTE' | 'DANADO';
  cantidad: number;
  motivo: string | null;
  observacion: string | null;
  estado: 'ABIERTA' | 'RESUELTA';
  resolucion: string | null;
  resolucionNota: string | null;
  reportadoPorNombre: string | null;
  creadoEn: string;
  resueltaPorNombre: string | null;
  resueltaEn: string | null;
  valorEstimado: number;
}

export interface DiferenciasResumen {
  abiertas: number;
  resueltas: number;
  data: Diferencia[];
}

export const MOTIVOS_DANIO: { codigo: string; nombre: string }[] = [
  { codigo: 'GOLPEADO', nombre: 'Golpeado' }, { codigo: 'ROTO', nombre: 'Roto' }, { codigo: 'HUMEDAD', nombre: 'Humedad' },
  { codigo: 'VENCIDO', nombre: 'Vencido' }, { codigo: 'DEFECTUOSO', nombre: 'Defectuoso' }, { codigo: 'OTRO', nombre: 'Otro' },
];
export const MOTIVOS_FALTANTE: { codigo: string; nombre: string }[] = [
  { codigo: 'NO_LLEGO', nombre: 'No llegó' }, { codigo: 'LLEGO_INCOMPLETO', nombre: 'Llegó incompleto' },
  { codigo: 'EXTRAVIADO', nombre: 'Extraviado' }, { codigo: 'OTRO', nombre: 'Otro' },
];
export function nombreMotivo(c: string | null): string {
  return [...MOTIVOS_DANIO, ...MOTIVOS_FALTANTE].find((m) => m.codigo === c)?.nombre ?? '';
}

export interface GuiaRemisionDetalle {
  id: number;
  serie: string;
  numero: number | null;
  codigo: string;
  estado: string;
  motivoTraslado: string;
  modalidadTraslado: string;
  fechaTraslado: string;
  pesoBrutoTotal: number;
  pesoBrutoUnidad: string;
  numBultos: number | null;
  almacenOrigenNombre: string;
  almacenDestinoNombre: string | null;
  destinatarioRuc: string | null;
  destinatarioRazonSocial: string | null;
  transportistaRuc: string | null;
  transportistaRazonSocial: string | null;
  vehiculoPlaca: string | null;
  conductorNombres: string | null;
  conductorLicencia: string | null;
  conductorDni: string | null;
  conductorApellidos: string | null;
  vehiculoNroCirculacion: string | null;
  conductoresSecundarios: ConductorSecundario[];
  vehiculosSecundarios: VehiculoSecundario[];
  /** Enlace del QR oficial de SUNAT, o null si no lo entregó. */
  qrUrl: string | null;
  anulacionMotivo: string | null;
  anulacionConstancia: string | null;
  anuladaEn: string | null;
  emisorRuc: string;
  emisorRazonSocial: string;
  almacenOrigenDireccion: string | null;
  almacenOrigenUbigeo: string | null;
  almacenDestinoDireccion: string | null;
  almacenDestinoUbigeo: string | null;
  observacion: string | null;
  creadoPorNombre: string;
  creadoEn: string;
  ticket: string | null;
  cdrCodigoRespuesta: string | null;
  cdrDescripcion: string | null;
  enviadoEn: string | null;
  respondidoEn: string | null;
  confirmacionPendiente: boolean;
  recepcionEstado: RecepcionEstado;
  /** Aceptada por SUNAT, con destino y sin cerrar la recepción. */
  puedeRecibir: boolean;
  diferenciasAbiertas: number;
  recepciones: RecepcionHistorial[];
  diferencias: Diferencia[];
  items: GuiaRemisionItemDetalle[];
}

/** Datos maestros de transporte: se registran una vez y rellenan el formulario de la guía. */
export interface Transportista { id: number; ruc: string; razonSocial: string; nroMtc: string | null; activo: boolean }
export interface Vehiculo { id: number; placa: string; nroCirculacion: string | null; activo: boolean }
export interface Conductor { id: number; numDoc: string; nombres: string; apellidos: string; licencia: string; personaId?: number | null; activo: boolean }

@Injectable({ providedIn: 'root' })
export class GuiasRemisionService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/guias-remision`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  crear(dto: GuiaRemisionCreate): Observable<GuiaRemisionDetalle> {
    return this.http.post<GuiaRemisionDetalle>(this.apiUrl, dto, { headers: this.headers() });
  }

  list(search: string, estado: string, page: number, pageSize: number): Observable<GuiaRemisionListResponse> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    if (estado) params.set('estado', estado);
    return this.http.get<GuiaRemisionListResponse>(`${this.apiUrl}?${params}`, { headers: this.headers() });
  }

  getById(id: number): Observable<GuiaRemisionDetalle> {
    return this.http.get<GuiaRemisionDetalle>(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }

  enviar(id: number): Observable<GuiaRemisionDetalle> {
    return this.http.post<GuiaRemisionDetalle>(`${this.apiUrl}/${id}/enviar`, {}, { headers: this.headers() });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }

  // ── Datos maestros de transporte ──
  listTransportistas(): Observable<Transportista[]> {
    return this.http.get<Transportista[]>(`${this.apiUrl}/maestros/transportistas`, { headers: this.headers() });
  }
  guardarTransportista(id: number | null, dto: Omit<Transportista, 'id'>): Observable<Transportista> {
    const url = `${this.apiUrl}/maestros/transportistas`;
    return id
      ? this.http.put<Transportista>(`${url}/${id}`, dto, { headers: this.headers() })
      : this.http.post<Transportista>(url, dto, { headers: this.headers() });
  }
  listVehiculos(): Observable<Vehiculo[]> {
    return this.http.get<Vehiculo[]>(`${this.apiUrl}/maestros/vehiculos`, { headers: this.headers() });
  }
  guardarVehiculo(id: number | null, dto: Omit<Vehiculo, 'id'>): Observable<Vehiculo> {
    const url = `${this.apiUrl}/maestros/vehiculos`;
    return id
      ? this.http.put<Vehiculo>(`${url}/${id}`, dto, { headers: this.headers() })
      : this.http.post<Vehiculo>(url, dto, { headers: this.headers() });
  }
  listConductores(): Observable<Conductor[]> {
    return this.http.get<Conductor[]>(`${this.apiUrl}/maestros/conductores`, { headers: this.headers() });
  }
  guardarConductor(id: number | null, dto: Omit<Conductor, 'id'>): Observable<Conductor> {
    const url = `${this.apiUrl}/maestros/conductores`;
    return id
      ? this.http.put<Conductor>(`${url}/${id}`, dto, { headers: this.headers() })
      : this.http.post<Conductor>(url, dto, { headers: this.headers() });
  }

  anular(id: number, dto: { motivo: string; constanciaBaja: string }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${id}/anular`, dto, { headers: this.headers() });
  }

  consultarEstado(id: number): Observable<GuiaRemisionDetalle> {
    return this.http.post<GuiaRemisionDetalle>(`${this.apiUrl}/${id}/consultar-estado`, {}, { headers: this.headers() });
  }

  registrarRecepcion(id: number, dto: RecepcionRegistrar): Observable<RecepcionResultado> {
    return this.http.post<RecepcionResultado>(`${this.apiUrl}/${id}/recepciones`, dto, { headers: this.headers() });
  }

  subirFotoRecepcion(recepcionId: number, foto: File): Observable<{ id: number }> {
    const fd = new FormData();
    fd.append('foto', foto);
    return this.http.post<{ id: number }>(`${this.apiUrl}/recepciones/${recepcionId}/fotos`, fd, { headers: this.headers() });
  }

  verFoto(fotoId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/recepciones/fotos/${fotoId}`, { headers: this.headers(), responseType: 'blob' });
  }

  listarDiferencias(estado: string): Observable<DiferenciasResumen> {
    const q = estado ? `?estado=${estado}` : '';
    return this.http.get<DiferenciasResumen>(`${this.apiUrl}/diferencias${q}`, { headers: this.headers() });
  }

  resolverDiferencia(id: number, resolucion: string, nota: string): Observable<Diferencia> {
    return this.http.post<Diferencia>(`${this.apiUrl}/diferencias/${id}/resolver`, { resolucion, nota }, { headers: this.headers() });
  }
}
