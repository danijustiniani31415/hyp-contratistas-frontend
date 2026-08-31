import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FirmaPersonalDto } from './firma-personal.dto';

/**
 * Lee y guarda la firma del usuario logueado. Vive en `core/` y no dentro de una feature porque
 * la usan tres módulos —Contabilidad (Configuración → Firma), Gestión Administrativa
 * (Configuración → Tu firma) y el modal que aparece al firmar una planilla por primera vez— y
 * las tres escriben el mismo registro.
 *
 * El usuario nunca viaja en la petición: el backend lo saca del token, así que nadie puede
 * registrar la firma de otro.
 */
@Injectable({ providedIn: 'root' })
export class FirmaPersonalService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/configuracion/mi-firma`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Firma del usuario actual (null si aún no la registró). */
  get(): Observable<FirmaPersonalDto | null> {
    return this.http.get<FirmaPersonalDto | null>(this.apiUrl, { headers: this.headers });
  }

  /** Guarda/actualiza la firma (data URL PNG del canvas). */
  save(imageBase64: string): Observable<FirmaPersonalDto> {
    return this.http.put<FirmaPersonalDto>(this.apiUrl, { imageBase64 }, { headers: this.headers });
  }
}
