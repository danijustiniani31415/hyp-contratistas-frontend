import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PostulanteEntrevistaService } from './services/postulante-entrevista.service';
import {
  EntrevistaRespuestaPublica,
  RespuestaEntrevista,
} from './dtos/postulante-entrevista.dto';

/**
 * Página PÚBLICA a la que llegan los botones «Confirmar» y «Rechazar» del correo de invitación a
 * entrevista (acceso por token, sin login). Registra la respuesta apenas carga —el candidato ya
 * eligió al pulsar el botón del correo, volver a preguntárselo acá sería pedirle dos clicks para
 * la misma decisión— y le muestra sobre qué cita respondió.
 *
 * Reintentar el mismo enlace es inofensivo: el backend es idempotente y no le reenvía a GTH un
 * aviso repetido.
 */
@Component({
  standalone: true,
  selector: 'app-postulante-entrevista',
  imports: [CommonModule],
  templateUrl: './postulante-entrevista.html',
  styleUrl: './postulante-entrevista.css',
})
export class PostulanteEntrevista implements OnInit {
  enviando = true;
  /** true cuando el token o la respuesta no son válidos, o el registro falló. */
  error = false;
  mensajeError = '';

  data: EntrevistaRespuestaPublica | null = null;

  constructor(
    private route: ActivatedRoute,
    private service: PostulanteEntrevistaService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const token = params.get('token') ?? '';
    const respuesta = this.normalizar(params.get('r'));

    if (!token || !respuesta) {
      this.fallar('El enlace de la entrevista no es válido. Responde desde el correo de invitación que recibiste.');
      return;
    }

    // App zoneless: forzamos el refresco para que el resultado aparezca sin un click extra.
    this.service.responder(token, respuesta).subscribe({
      next: (data) => {
        this.data = data;
        this.enviando = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.fallar(
          err.error?.message ??
            'No pudimos registrar tu respuesta. Inténtalo de nuevo desde el correo en unos minutos.',
        );
      },
    });
  }

  /** true si el candidato confirmó su asistencia (define el color y el texto de la pantalla). */
  get confirmada(): boolean {
    return this.data?.respuestaCodigo === 'CONFIRMADA';
  }

  /** Fecha de la cita en `dd/MM/yyyy`, armada sin `new Date` para no correrla por zona horaria. */
  get fechaLegible(): string {
    const [anio, mes, dia] = (this.data?.fecha ?? '').split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : '';
  }

  /** Solo se aceptan los dos verbos del enlace del correo; cualquier otra cosa es un enlace roto. */
  private normalizar(valor: string | null): RespuestaEntrevista | null {
    const v = (valor ?? '').trim().toLowerCase();
    return v === 'confirmar' || v === 'rechazar' ? v : null;
  }

  private fallar(mensaje: string): void {
    this.enviando = false;
    this.error = true;
    this.mensajeError = mensaje;
    this.cdr.detectChanges();
  }
}
