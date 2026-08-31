import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { hoyIsoLocal } from '../../shared/utils/fecha-local.util';

@Injectable({ providedIn: 'root' })
export class ProgramacionAlertasService {
  private _rechazados = new BehaviorSubject<number>(0);
  rechazados$ = this._rechazados.asObservable();

  constructor(private http: HttpClient) {}

  /** Mismos featureKeys que exige el backend en ProgramacionEmoController — si el usuario no
   * tiene ninguno, ni vale la pena llamar al endpoint (403 seguro, solo ensucia la red). */
  private tienePermiso(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const allowed: string[] = JSON.parse(localStorage.getItem('allowed_features') ?? '[]');
      return ['ssoma.salud-ocupacional.programaciones', 'clinica.agenda', 'clinica.programaciones'].some((k) =>
        allowed.includes(k),
      );
    } catch {
      return false;
    }
  }

  checkRechazados(): void {
    const token =
      typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token || !this.tienePermiso()) return;
    const hoy = hoyIsoLocal();
    this.http
      .get<any>(
        `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/programaciones`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { desde: hoy, hasta: hoy, estado: 'Rechazado por Clínica', pageSize: '500' },
        },
      )
      .subscribe({
        next: (res) => {
          const count = Array.isArray(res) ? res.length : (res?.data?.length ?? res?.totalRecords ?? 0);
          this._rechazados.next(count);
        },
        error: () => this._rechazados.next(0),
      });
  }

  clear(): void {
    this._rechazados.next(0);
  }
}
