import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface TareoCelda {
  dia: number;
  tipoDia: string; // '' | NORMAL | DL | F | P | VC | DM
  horasTrabajadas: number | null;
  horasExtra: number;
}

export interface TareoPersona {
  personaId: number;
  nombreCompleto: string;
  cargoNombre: string | null;
  dias: TareoCelda[];
}

export interface TareoMesResponse {
  anio: number;
  mes: number;
  diasEnMes: number;
  personas: TareoPersona[];
}

export interface TareoPersonaGuardar {
  personaId: number;
  dias: TareoCelda[];
}

export interface TareoGuardar {
  anio: number;
  mes: number;
  personas: TareoPersonaGuardar[];
}

@Injectable({ providedIn: 'root' })
export class TareoService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/tareo`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getMes(anio: number, mes: number): Observable<TareoMesResponse> {
    const params = new URLSearchParams({ anio: String(anio), mes: String(mes) });
    return this.http.get<TareoMesResponse>(`${this.apiUrl}?${params}`, { headers: this.headers() });
  }

  guardarMes(dto: TareoGuardar): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(this.apiUrl, dto, { headers: this.headers() });
  }
}
