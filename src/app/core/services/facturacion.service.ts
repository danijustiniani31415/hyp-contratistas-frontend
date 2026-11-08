import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface CpeItem {
  codigo?: string | null;
  descripcion: string;
  unidadMedida: string;
  cantidad: number;
  /** Tal como lo digita el usuario: sin IGV, o con IGV si el documento marca preciosIncluyenIgv. */
  precioUnitario: number;
  /** Descuento de la línea en monto (no porcentaje). */
  descuento: number;
  /** 10 gravado, 20 exonerado, 30 inafecto, 40 exportación. */
  afectacionIgv: string;
  productoId?: number | null;
  partidaId?: number | null;
}

export interface CpeItemDetalle extends CpeItem {
  valorUnitario: number;
  valorVenta: number;
  igv: number;
}

export interface CpeCuota {
  monto: number;
  /** yyyy-MM-dd */
  fecha: string;
}

export interface CpeAviso {
  nivel: 'ERROR' | 'AVISO';
  mensaje: string;
}

/** Lo que se manda para crear o reemplazar un borrador. */
export interface CpeCreate {
  /** 01 factura, 07 nota de crédito, 08 nota de débito. */
  tipoDocumento: string;
  serie?: string | null;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  moneda: string;
  tipoCambio?: number | null;
  /** 0101 venta interna, 0200 exportación. */
  tipoOperacion: string;
  clienteTipoDoc: string;
  clienteNumeroDoc: string;
  clienteRazon: string;
  clienteDireccion?: string | null;
  clientePais?: string | null;
  preciosIncluyenIgv: boolean;
  formaPago: string;
  cuotas?: CpeCuota[] | null;
  detraccionCodigo?: string | null;
  detraccionPorcentaje?: number | null;
  detraccionCuenta?: string | null;
  refCpeId?: number | null;
  motivoCodigo?: string | null;
  motivoDescripcion?: string | null;
  observacion?: string | null;
  ordenCompraRef?: string | null;
  guiaRef?: string | null;
  contratoId?: number | null;
  proyectoId?: number | null;
  items: CpeItem[];
}

export interface CpeDetalle {
  id: number;
  tipoDocumento: string;
  serie: string;
  numero: number | null;
  identificador: string;
  estado: string;
  fechaEmision: string;
  fechaVencimiento: string | null;
  moneda: string;
  tipoCambio: number | null;
  tipoOperacion: string;
  clienteTipoDoc: string;
  clienteNumeroDoc: string;
  clienteRazon: string;
  clienteDireccion: string | null;
  clientePais: string | null;
  totalGravado: number;
  totalExonerado: number;
  totalInafecto: number;
  totalExportacion: number;
  totalDescuentos: number;
  igv: number;
  total: number;
  preciosIncluyenIgv: boolean;
  formaPago: string;
  cuotas: CpeCuota[];
  detraccionCodigo: string | null;
  detraccionPorcentaje: number | null;
  detraccionMonto: number | null;
  detraccionCuenta: string | null;
  refCpeId: number | null;
  refIdentificador: string | null;
  motivoCodigo: string | null;
  motivoDescripcion: string | null;
  observacion: string | null;
  ordenCompraRef: string | null;
  guiaRef: string | null;
  contratoId: number | null;
  proyectoId: number | null;
  sunatCodigo: string | null;
  sunatDescripcion: string | null;
  enviadoEn: string | null;
  respondidoEn: string | null;
  bajaMotivo: string | null;
  bajaTicket: string | null;
  tieneXml: boolean;
  tieneCdr: boolean;
  /** Beta o Produccion: a qué SUNAT apunta el servidor. */
  ambiente: string;
  emisorRuc: string;
  emisorRazonSocial: string;
  emisorDireccion: string | null;
  xmlHashFirma: string | null;
  totalEnLetras: string;
  contratoCodigo: string | null;
  items: CpeItemDetalle[];
  avisos: CpeAviso[];
}

export interface CpeListItem {
  id: number;
  tipoDocumento: string;
  identificador: string;
  estado: string;
  fechaEmision: string;
  clienteRazon: string;
  clienteNumeroDoc: string;
  moneda: string;
  total: number;
}

export interface CpeListResponse {
  data: CpeListItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
}

export interface CpeSerie {
  id: number;
  tipoDocumento: string;
  serie: string;
  ultimoNumero: number;
  activa: boolean;
}

export interface CpeSerieUpsert {
  tipoDocumento: string;
  serie: string;
  ultimoNumero: number;
  activa: boolean;
}

@Injectable({ providedIn: 'root' })
export class FacturacionService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/facturacion`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  list(search: string, estado: string, tipo: string, page: number, pageSize: number): Observable<CpeListResponse> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    if (estado) params.set('estado', estado);
    if (tipo) params.set('tipo', tipo);
    return this.http.get<CpeListResponse>(`${this.apiUrl}?${params}`, { headers: this.headers() });
  }

  get(id: number): Observable<CpeDetalle> {
    return this.http.get<CpeDetalle>(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }

  crear(dto: CpeCreate): Observable<CpeDetalle> {
    return this.http.post<CpeDetalle>(this.apiUrl, dto, { headers: this.headers() });
  }

  actualizar(id: number, dto: CpeCreate): Observable<CpeDetalle> {
    return this.http.put<CpeDetalle>(`${this.apiUrl}/${id}`, dto, { headers: this.headers() });
  }

  eliminar(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }

  emitir(id: number): Observable<CpeDetalle> {
    return this.http.post<CpeDetalle>(`${this.apiUrl}/${id}/emitir`, {}, { headers: this.headers() });
  }

  /** Libera el número de un comprobante rechazado: al reenviarlo toma el siguiente correlativo libre. */
  numeroNuevo(id: number): Observable<CpeDetalle> {
    return this.http.post<CpeDetalle>(`${this.apiUrl}/${id}/numero-nuevo`, {}, { headers: this.headers() });
  }

  baja(id: number, motivo: string): Observable<CpeDetalle> {
    return this.http.post<CpeDetalle>(`${this.apiUrl}/${id}/baja`, { motivo }, { headers: this.headers() });
  }

  consultarBaja(id: number): Observable<CpeDetalle> {
    return this.http.post<CpeDetalle>(`${this.apiUrl}/${id}/consultar-baja`, {}, { headers: this.headers() });
  }

  /** Descarga el XML firmado o la constancia (CDR) como archivo. */
  descargar(id: number, que: 'xml' | 'cdr', nombre: string): void {
    this.http.get(`${this.apiUrl}/${id}/${que}`, { headers: this.headers(), responseType: 'blob' }).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nombre}${que === 'cdr' ? '-CDR' : ''}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  series(): Observable<CpeSerie[]> {
    return this.http.get<CpeSerie[]>(`${this.apiUrl}/series`, { headers: this.headers() });
  }

  guardarSerie(dto: CpeSerieUpsert): Observable<CpeSerie> {
    return this.http.put<CpeSerie>(`${this.apiUrl}/series`, dto, { headers: this.headers() });
  }
}
