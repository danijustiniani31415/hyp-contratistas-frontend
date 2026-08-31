import { HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export const HABILITACION_BASE = `${environment.apiUrl}api/v1/habilitacion`;

export function buildHabHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function buildHabParams(source: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  Object.entries(source).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') {
      params = params.set(k, String(v));
    }
  });
  return params;
}
