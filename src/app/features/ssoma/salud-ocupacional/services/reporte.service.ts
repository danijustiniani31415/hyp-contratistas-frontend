import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from './http-base';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  constructor(private http: HttpClient) {}

  exportarSunafilMensual(mes: number, anio: number): Observable<Blob> {
    return this.http.get(`${SALUD_OCUPACIONAL_BASE}/reportes/sunafil-mensual`, {
      headers: buildAuthHeaders(),
      params: { mes: mes.toString(), anio: anio.toString() },
      responseType: 'blob',
    });
  }
}
