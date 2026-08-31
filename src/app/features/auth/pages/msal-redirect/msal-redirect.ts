import { Component, OnInit, inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MicrosoftAuthService } from '../login/services/microsoft-auth.service';

@Component({
  selector: 'app-msal-redirect',
  template: ''
})
export class MsalRedirect implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly microsoftAuthService = inject(MicrosoftAuthService);

  async ngOnInit(): Promise<void> {
    // Solo se ejecuta en el browser (no en SSR).
    // Este componente corre dentro del popup de Microsoft: llama a
    // handleRedirectPromise() que extrae el auth code de la URL y lo
    // comunica al padre via window.opener.postMessage(), cerrando el popup.
    if (isPlatformBrowser(this.platformId)) {
      await this.microsoftAuthService.handleRedirect();
    }
  }
}
