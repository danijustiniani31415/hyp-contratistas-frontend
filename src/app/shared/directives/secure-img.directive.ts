import { Directive, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Reemplazo de [src] para imágenes cuyo archivo vive en SharePoint. En vez de
 * apuntar el <img> directo al `webUrl` de SharePoint (que solo carga si el
 * navegador ya tiene sesión interactiva de Microsoft 365 — funciona para admins
 * logueados en Outlook/Teams pero no para el resto del staff), pide el archivo
 * al backend (que lo descarga vía Graph con su propio token de app) y lo
 * muestra como blob. Funciona igual para cualquier usuario autenticado en la
 * intranet, sin depender de su sesión de Microsoft 365.
 *
 * Uso: <img [secureImg]="evidenciaUrl" alt="Evidencia" />
 */
@Directive({
  selector: 'img[secureImg]',
  standalone: true,
})
export class SecureImgDirective implements OnChanges, OnDestroy {
  @Input() secureImg: string | null | undefined;

  private objectUrl: string | null = null;

  constructor(private el: ElementRef<HTMLImageElement>, private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ('secureImg' in changes) this.load();
  }

  ngOnDestroy(): void {
    this.revoke();
  }

  private isSharePointUrl(url: string): boolean {
    return /sharepoint\.com/i.test(url);
  }

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private load(): void {
    this.revoke();
    const url = this.secureImg;
    if (!url) {
      this.el.nativeElement.removeAttribute('src');
      return;
    }

    if (!this.isSharePointUrl(url)) {
      // No es SharePoint (ej. ya es un blob: o data: url) — usar tal cual.
      this.el.nativeElement.src = url;
      return;
    }

    const proxyUrl = `${environment.apiUrl}api/v1/habilitacion/archivos/proxy?url=${encodeURIComponent(url)}`;
    this.http.get(proxyUrl, { headers: this.authHeaders(), responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.objectUrl = URL.createObjectURL(blob);
        this.el.nativeElement.src = this.objectUrl;
      },
      error: () => {
        // Si falla, no dejamos el <img> roto silenciosamente sin pista.
        this.el.nativeElement.removeAttribute('src');
      },
    });
  }

  private revoke(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
