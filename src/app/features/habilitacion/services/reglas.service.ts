import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReglaDto } from '../dtos/catalogos.model';
import { HABILITACION_BASE, buildHabHeaders } from './http-base';

@Injectable({ providedIn: 'root' })
export class ReglasService {
  private readonly base = `${HABILITACION_BASE}/reglas`;

  constructor(private http: HttpClient) {}

  getReglas(): Observable<ReglaDto[]> {
    return this.http.get<ReglaDto[]>(this.base, {
      headers: buildHabHeaders(),
    });
  }

  create(dto: Partial<ReglaDto>): Observable<ReglaDto> {
    return this.http.post<ReglaDto>(this.base, dto, {
      headers: buildHabHeaders(),
    });
  }

  update(id: number, dto: Partial<ReglaDto>): Observable<ReglaDto> {
    return this.http.put<ReglaDto>(`${this.base}/${id}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`, {
      headers: buildHabHeaders(),
    });
  }
}
