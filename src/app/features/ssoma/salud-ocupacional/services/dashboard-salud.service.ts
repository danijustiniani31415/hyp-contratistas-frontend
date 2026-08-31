import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from './http-base';
import { DashboardSaludOcupacionalDto } from '../dtos/dashboard-salud.model';

@Injectable({ providedIn: 'root' })
export class DashboardSaludService {
  private readonly apiUrl = `${SALUD_OCUPACIONAL_BASE}/dashboard`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardSaludOcupacionalDto> {
    return this.http.get<DashboardSaludOcupacionalDto>(this.apiUrl, {
      headers: buildAuthHeaders(),
    });
  }
}
