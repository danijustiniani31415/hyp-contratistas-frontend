import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { InvoiceFolderDto } from '../dtos/invoice-folder.dto';

@Injectable({ providedIn: 'root' })
export class InvoiceFolderService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/InvoiceFolder`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carpeta única configurada (null si aún no se configuró). */
  getSingleton(): Observable<InvoiceFolderDto | null> {
    return this.http.get<InvoiceFolderDto | null>(this.apiUrl, { headers: this.headers });
  }

  /** Configura/actualiza la carpeta única: el backend detecta el link y devuelve la carpeta resuelta. */
  save(linkUrl: string): Observable<InvoiceFolderDto> {
    return this.http.put<InvoiceFolderDto>(this.apiUrl, { linkUrl }, { headers: this.headers });
  }
}
