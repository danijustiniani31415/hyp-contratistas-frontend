import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RegistroModeloDto } from '../dtos/registros-modelo.model';
import { HABILITACION_BASE, buildHabHeaders } from './http-base';

@Injectable({ providedIn: 'root' })
export class RegistrosModeloService {
  private readonly base = `${HABILITACION_BASE}/registros-modelo`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<RegistroModeloDto[]> {
    return this.http.get<RegistroModeloDto[]>(this.base, {
      headers: buildHabHeaders(),
    });
  }
}
