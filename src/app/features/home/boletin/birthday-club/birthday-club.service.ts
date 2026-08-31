import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';
import { environment } from '../../../../../environments/environment';

/** Una persona cumpleañera del trimestre (espejo del DTO del backend). */
export interface CumpleaneroDto {
  workerId: number;
  nombreCompleto: string;
  /** Puesto del trabajador; el backend hace fallback a ocupación si puesto es null. */
  puesto?: string | null;
  email: string;
  /** Mes del cumpleaños (1-12). */
  mes: number;
  /** Día del cumpleaños (1-31). */
  dia: number;
  /**
   * Foto en data URI base64. Ya no llega en la carga del trimestre: se resuelve a demanda al
   * hacer hover. `undefined` = aún no pedida, `null` = pedida y sin foto, string = foto lista.
   */
  fotoBase64?: string | null;
}

export interface TrimestreCumpleanosDto {
  trimestre: number;
  cumpleaneros: CumpleaneroDto[];
}

/**
 * Trae los cumpleaños del boletín por trimestre (solo datos, sin fotos) y, aparte, la foto de
 * cada persona a demanda cuando se hace hover. Ambas cosas se cachean con `shareReplay`: el
 * trimestre para que navegar entre trimestres ya visitados sea instantáneo, y cada foto por
 * correo para no volver a pedirla a Graph si se vuelve a pasar el mouse por la misma persona.
 */
@Injectable({ providedIn: 'root' })
export class BirthdayClubService {
  private readonly base = `${environment.apiUrl}api/v1/boletin/cumpleanos`;
  private readonly cache = new Map<number, Observable<TrimestreCumpleanosDto>>();
  private readonly fotoCache = new Map<string, Observable<string | null>>();

  constructor(private http: HttpClient) {}

  getTrimestre(trimestre: number): Observable<TrimestreCumpleanosDto> {
    let cached = this.cache.get(trimestre);
    if (!cached) {
      cached = this.http
        .get<TrimestreCumpleanosDto>(`${this.base}/trimestre/${trimestre}`, {
          headers: this.authHeaders(),
        })
        .pipe(shareReplay(1));
      this.cache.set(trimestre, cached);
    }
    return cached;
  }

  /**
   * Foto de perfil (data URI base64) de un correo, o `null` si Graph no tiene foto. Se pide una
   * sola vez por correo y queda cacheada, así el hover repetido sobre la misma persona no vuelve
   * a pegarle al backend.
   */
  getFoto(email: string): Observable<string | null> {
    let cached = this.fotoCache.get(email);
    if (!cached) {
      cached = this.http
        .get<{ fotoBase64: string | null }>(`${this.base}/foto`, {
          headers: this.authHeaders(),
          params: { email },
        })
        .pipe(
          map((r) => r.fotoBase64 ?? null),
          shareReplay(1),
        );
      this.fotoCache.set(email, cached);
    }
    return cached;
  }

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
