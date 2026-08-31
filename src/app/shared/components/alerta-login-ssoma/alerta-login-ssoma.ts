import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AlertaLoginSsomaService } from '../../../core/services/alerta-login-ssoma.service';
import { AlertaLoginSsomaResultDto } from '../../../core/dtos/ssoma/alerta-login-ssoma.model';

/**
 * Aviso que se muestra una vez al ingresar al Administrador/Coordinador SSOMA de un proyecto:
 * interconsultas pendientes y EMOs vencidos de los trabajadores en SUS proyectos. Montado en
 * app-layout (una sola instancia para toda la sesión autenticada), así que se verifica una sola
 * vez por login, no en cada navegación.
 */
@Component({
  standalone: true,
  selector: 'app-alerta-login-ssoma',
  imports: [CommonModule],
  templateUrl: './alerta-login-ssoma.html',
  styleUrl: './alerta-login-ssoma.css',
})
export class AlertaLoginSsoma implements OnInit {
  visible = false;
  resultado: AlertaLoginSsomaResultDto | null = null;

  private readonly platformId = inject(PLATFORM_ID);

  constructor(private svc: AlertaLoginSsomaService) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.svc.verificar().subscribe((res) => {
      if (res?.tieneAlertas) {
        this.resultado = res;
        this.visible = true;
      }
    });
  }

  cerrar(): void {
    this.visible = false;
  }

  totalDe(proyecto: { interconsultas: unknown[]; emosVencidos: unknown[] }): number {
    return proyecto.interconsultas.length + proyecto.emosVencidos.length;
  }
}
