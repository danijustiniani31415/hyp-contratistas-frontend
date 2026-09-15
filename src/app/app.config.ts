import { ApplicationConfig, provideBrowserGlobalErrorListeners, LOCALE_ID } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // [REVISADO] Se probó un interceptor que forzaba ApplicationRef.tick() en cada respuesta
    // HTTP (porque Zone.js no parcha fetch() acá) pero es frágil: choca con NG0101
    // ("tick is called recursively") cuando la respuesta llega mientras Angular ya está en
    // medio de otro tick. La solución correcta y estable es usar signals para el estado que se
    // actualiza desde callbacks asíncronos (ver features/personas/personas.ts) — los signals
    // notifican a Angular directo, sin depender de Zone.js. Usar ese patrón en componentes
    // nuevos en vez de reintroducir un interceptor de este tipo.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    // [REVISADO] withPreloading(PreloadAllModules) precargaba en segundo plano TODOS los
    // módulos heredados de Abril (SSOMA, Arquitectura Comercial, etc.) apenas se abría
    // cualquier página — cientos de compilaciones de Vite en simultáneo en dev, que saturaban
    // el hilo principal del navegador y demoraban todo (incluida la respuesta visual de
    // cualquier llamada HTTP). Quitado: cada ruta ahora carga bajo demanda al navegar a ella.
    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload',
      }),
    ),

    //descomentar si se requiere ssr
    //provideClientHydration(withEventReplay()),

    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'es-PE' }
  ],
};