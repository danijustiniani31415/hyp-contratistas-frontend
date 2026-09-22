import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface ConceptoPlanilla {
  id: number;
  codigo: string;
  nombre: string;
  tipo: 'INGRESO' | 'DESCUENTO' | 'APORTE_EMPLEADOR';
  categoriaLaboral: 'OBRERO' | 'EMPLEADO' | null;
  formaCalculo: 'FIJO' | 'PORCENTAJE_SUELDO' | 'PORCENTAJE_JORNAL' | 'POR_DIA_TAREO';
  valor: number;
  orden: number;
  activo: boolean;
}

export interface ConceptoPlanillaCreate {
  codigo: string;
  nombre: string;
  tipo: string;
  categoriaLaboral: string | null;
  formaCalculo: string;
  valor: number;
}

export interface ConceptoPlanillaUpdate {
  nombre: string;
  tipo: string;
  categoriaLaboral: string | null;
  formaCalculo: string;
  valor: number;
  activo: boolean;
}

export interface PlanillaPeriodoListItem {
  id: number;
  anio: number;
  mes: number;
  proyectoNombre: string | null;
  estado: 'BORRADOR' | 'CALCULADO' | 'CERRADO';
  cantidadPersonas: number;
  totalNeto: number | null;
  creadoEn: string;
}

export interface PlanillaDetalleConcepto {
  conceptoNombre: string;
  tipo: string;
  monto: number;
}

export interface PlanillaDetalle {
  id: number;
  personaId: number;
  personaNombre: string;
  categoriaLaboral: string | null;
  sueldoBase: number | null;
  jornal: number | null;
  diasTrabajados: number;
  diasFalta: number;
  totalIngresos: number;
  totalDescuentos: number;
  totalAportesEmpleador: number;
  netoPagar: number;
  conceptos: PlanillaDetalleConcepto[];
}

export interface PlanillaPeriodoDetail {
  id: number;
  anio: number;
  mes: number;
  proyectoNombre: string | null;
  estado: string;
  calculadoEn: string | null;
  detalles: PlanillaDetalle[];
  personasOmitidas: string[];
}

@Injectable({ providedIn: 'root' })
export class PlanillaCalculoService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/planillas`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  listConceptos(): Observable<ConceptoPlanilla[]> {
    return this.http.get<ConceptoPlanilla[]>(`${this.apiUrl}/conceptos`, { headers: this.headers() });
  }

  crearConcepto(dto: ConceptoPlanillaCreate): Observable<ConceptoPlanilla> {
    return this.http.post<ConceptoPlanilla>(`${this.apiUrl}/conceptos`, dto, { headers: this.headers() });
  }

  actualizarConcepto(id: number, dto: ConceptoPlanillaUpdate): Observable<ConceptoPlanilla> {
    return this.http.put<ConceptoPlanilla>(`${this.apiUrl}/conceptos/${id}`, dto, { headers: this.headers() });
  }

  listPeriodos(): Observable<PlanillaPeriodoListItem[]> {
    return this.http.get<PlanillaPeriodoListItem[]>(`${this.apiUrl}/periodos`, { headers: this.headers() });
  }

  crearPeriodo(dto: { anio: number; mes: number; proyectoId: number | null }): Observable<PlanillaPeriodoDetail> {
    return this.http.post<PlanillaPeriodoDetail>(`${this.apiUrl}/periodos`, dto, { headers: this.headers() });
  }

  getPeriodo(id: number): Observable<PlanillaPeriodoDetail> {
    return this.http.get<PlanillaPeriodoDetail>(`${this.apiUrl}/periodos/${id}`, { headers: this.headers() });
  }

  calcular(id: number): Observable<PlanillaPeriodoDetail> {
    return this.http.post<PlanillaPeriodoDetail>(`${this.apiUrl}/periodos/${id}/calcular`, {}, { headers: this.headers() });
  }

  cerrar(id: number): Observable<PlanillaPeriodoDetail> {
    return this.http.post<PlanillaPeriodoDetail>(`${this.apiUrl}/periodos/${id}/cerrar`, {}, { headers: this.headers() });
  }
}
