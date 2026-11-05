import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

/**
 * Persona (DNI) o empresa (RUC) reconocida. `origen` dice de dónde salió: TRABAJADOR, TRANSPORTISTA o PROVEEDOR
 * si ya están registrados aquí; RENIEC o SUNAT si fue una consulta externa.
 */
export interface DocumentoEncontrado {
  origen: 'TRABAJADOR' | 'TRANSPORTISTA' | 'PROVEEDOR' | 'RENIEC' | 'SUNAT';
  numero: string;
  nombres: string | null;
  apellidos: string | null;
  personaId: number | null;
  razonSocial: string | null;
  direccion: string | null;
  aviso: string | null;
}

/** Reconoce DNI y RUC para no teclear nombres: primero lo que la empresa ya tiene, después RENIEC/SUNAT. */
@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/documentos`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  buscarDni(dni: string): Observable<DocumentoEncontrado> {
    return this.http.get<DocumentoEncontrado>(`${this.apiUrl}/dni/${dni}`, { headers: this.headers() });
  }

  buscarRuc(ruc: string): Observable<DocumentoEncontrado> {
    return this.http.get<DocumentoEncontrado>(`${this.apiUrl}/ruc/${ruc}`, { headers: this.headers() });
  }
}
