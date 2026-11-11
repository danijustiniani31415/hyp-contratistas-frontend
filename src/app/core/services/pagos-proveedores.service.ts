import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface CuentaPorPagar {
  comprobanteId: number;
  proveedorId: number;
  proveedorNombre: string;
  proveedorRuc: string | null;
  tipo: string;
  documento: string;
  fechaEmision: string;
  moneda: string;
  total: number;
  detraccionMonto: number;
  pagado: number;
  saldo: number;
  estadoPago: 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
  diasAntiguedad: number;
}

export interface PagoProveedor {
  id: number;
  fechaPago: string;
  monto: number;
  medio: string;
  referencia: string | null;
  observacion: string | null;
  estado: 'VIGENTE' | 'ANULADO';
  registradoPorNombre: string;
  registradoEn: string;
  motivoAnulacion: string | null;
}

export interface CuentaPorPagarDetalle extends CuentaPorPagar {
  pagos: PagoProveedor[];
}

export interface PagosResumen {
  pendientePorMoneda: { moneda: string; saldo: number }[];
  documentosPendientes: number;
  proveedoresConDeuda: number;
}

export interface PagoRegistrar {
  monto: number;
  fechaPago: string;
  medio: string;
  referencia: string | null;
  observacion: string | null;
}

export interface PagedCuentas {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: CuentaPorPagar[];
}

/** Cuentas por pagar y pagos a proveedores. Exige el permiso PAGO_PROVEEDOR_REGISTRAR. */
@Injectable({ providedIn: 'root' })
export class PagosProveedoresService {
  private readonly url = `${environment.apiUrl}api/v1/pagos-proveedores`;

  constructor(private http: HttpClient, private auth: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  listar(search: string, estadoPago: string, page: number, pageSize: number): Observable<PagedCuentas> {
    const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) p.set('search', search);
    if (estadoPago) p.set('estadoPago', estadoPago);
    return this.http.get<PagedCuentas>(`${this.url}?${p}`, { headers: this.headers() });
  }

  resumen(): Observable<PagosResumen> {
    return this.http.get<PagosResumen>(`${this.url}/resumen`, { headers: this.headers() });
  }

  obtener(comprobanteId: number): Observable<CuentaPorPagarDetalle> {
    return this.http.get<CuentaPorPagarDetalle>(`${this.url}/${comprobanteId}`, { headers: this.headers() });
  }

  registrar(comprobanteId: number, dto: PagoRegistrar): Observable<CuentaPorPagarDetalle> {
    return this.http.post<CuentaPorPagarDetalle>(`${this.url}/${comprobanteId}/pagos`, dto, { headers: this.headers() });
  }

  anular(pagoId: number, motivo: string): Observable<CuentaPorPagarDetalle> {
    return this.http.post<CuentaPorPagarDetalle>(`${this.url}/pagos/${pagoId}/anular`, { motivo }, { headers: this.headers() });
  }
}
