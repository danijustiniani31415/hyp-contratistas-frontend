import { HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

export const SSOMA_BASE = `${environment.apiUrl}api/v1/ssoma`;
export const SALUD_OCUPACIONAL_BASE = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional`;

export function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function buildParams(source: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (value !== null && value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  });
  return params;
}
