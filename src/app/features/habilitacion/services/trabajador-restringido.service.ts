import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HABILITACION_BASE, buildHabHeaders } from './http-base';

@Injectable({ providedIn: 'root' })
export class TrabajadorRestringidoService {
  constructor(private http: HttpClient) {}

  verificarDni(dni: string): Observable<boolean> {
    const params = new HttpParams().set('dni', dni).set('soloActivos', 'true');
    return this.http
      .get<{ id: number; dni: string }[]>(`${HABILITACION_BASE}/restringidos`, {
        headers: buildHabHeaders(),
        params,
      })
      .pipe(
        map((lista) => lista.length > 0),
        catchError(() => of(false)),
      );
  }
}
