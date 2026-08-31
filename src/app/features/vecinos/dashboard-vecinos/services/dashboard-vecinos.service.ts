import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { VecinosDashboardDTO } from '../dtos/dashboard-vecinos.dto';

@Injectable({ providedIn: 'root' })
export class DashboardVecinosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/GestionVecinos`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { [header: string]: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  getDashboard(): Observable<VecinosDashboardDTO> {
    return this.http.get<VecinosDashboardDTO>(`${this.apiUrl}/dashboard`, {
      headers: this.authHeaders(),
    });
  }
}
