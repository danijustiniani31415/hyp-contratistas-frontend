import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { GaAdjuntoFolderDto } from '../dtos/ga-adjunto-folder.dto';

@Injectable({ providedIn: 'root' })
export class CarpetaAdjuntosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/carpeta-adjuntos`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carpeta única configurada (null si aún no se configuró). */
  getSingleton(): Observable<GaAdjuntoFolderDto | null> {
    return this.http.get<GaAdjuntoFolderDto | null>(this.apiUrl, { headers: this.headers });
  }

  /** Configura/actualiza la carpeta única: el backend detecta el link y devuelve la carpeta resuelta. */
  save(linkUrl: string): Observable<GaAdjuntoFolderDto> {
    return this.http.put<GaAdjuntoFolderDto>(this.apiUrl, { linkUrl }, { headers: this.headers });
  }
}
