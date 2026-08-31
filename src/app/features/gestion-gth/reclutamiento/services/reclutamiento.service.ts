import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AsignacionGth,
  BandejaReclutamiento,
  DetalleRequerimientoGth,
  EntrevistaAccionResult,
  EstadoTransicionResult,
  EvaluacionAccionResult,
  EvaluacionGuardar,
  RetomarCandidatoResult,
} from '../dtos/reclutamiento.dto';
import {
  FormularioAccionResult,
  FormularioEnvioMasivoResult,
  FormularioRevision,
} from '../dtos/formulario-postulante.dto';

/** Un candidato del envío masivo del formulario: a quién y a qué correo. */
export interface FormularioEnvioMasivoItem {
  candidatoId: number;
  correo: string;
}

interface MessageResult {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ReclutamientoService {
  // API de dominio de reclutamiento (compartida): sirve los endpoints de la vista de GTH.
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/reclutamiento`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Bandeja de GTH: tarjeta "En proceso" + tabla de solicitudes de contratación, en una sola petición. */
  getBandeja(): Observable<BandejaReclutamiento> {
    return this.http.get<BandejaReclutamiento>(`${this.apiUrl}/bandeja`, {
      headers: this.headers,
    });
  }

  /** Actualiza la prioridad (Alta/Media/Baja) de un requerimiento desde la bandeja. */
  updatePrioridad(requerimientoId: number, prioridadId: number): Observable<MessageResult> {
    return this.http.patch<MessageResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/prioridad`,
      { prioridadId },
      { headers: this.headers },
    );
  }

  /** Detalle del requerimiento (modal del ojo): cabecera + asignación + catálogos + canales, en una sola petición. */
  getDetalle(requerimientoId: number): Observable<DetalleRequerimientoGth> {
    return this.http.get<DetalleRequerimientoGth>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/detalle-gth`,
      { headers: this.headers },
    );
  }

  /** Guarda la asignación interna de GTH (reemplaza los 4 campos del modal). */
  updateAsignacion(requerimientoId: number, asignacion: AsignacionGth): Observable<MessageResult> {
    return this.http.patch<MessageResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/asignacion-gth`,
      asignacion,
      { headers: this.headers },
    );
  }

  /**
   * Registra los canales donde se publicó la vacante y avanza el requerimiento a la fase
   * PUBLICACION. No publica en los portales (sin APIs integradas): solo registra y continúa
   * el flujo. Devuelve el estado resultante.
   */
  publicar(requerimientoId: number, canalIds: number[]): Observable<EstadoTransicionResult> {
    return this.http.put<EstadoTransicionResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/publicaciones`,
      { canalIds },
      { headers: this.headers },
    );
  }

  /** Inicia la revisión de CV: avanza el requerimiento de PUBLICACION a LONG_LIST. */
  iniciarRevisionCv(requerimientoId: number): Observable<EstadoTransicionResult> {
    return this.http.patch<EstadoTransicionResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/iniciar-revision-cv`,
      {},
      { headers: this.headers },
    );
  }

  /**
   * Envía la long list al solicitante (multipart): metadatos de cada candidato en `data`, su CV
   * como form file con la clave `cv_i` y cada anexo del portafolio con la clave `anexo_i_j`. El
   * backend envía el correo configurado (con el CV y los anexos adjuntos) y avanza el
   * requerimiento a LONG_LIST_ENVIADA.
   */
  enviarLongList(
    requerimientoId: number,
    candidatos: LongListCandidatoEnvio[],
  ): Observable<EstadoTransicionResult> {
    const formData = new FormData();
    const meta = candidatos.map((c, i) => {
      formData.append(`cv_${i}`, c.cv, c.cv.name);

      const anexoKeys = (c.anexos ?? []).map((anexo, j) => {
        const key = `anexo_${i}_${j}`;
        formData.append(key, anexo, anexo.name);
        return key;
      });

      return {
        nombre: c.nombre,
        comentario: c.comentario,
        cvKey: `cv_${i}`,
        anexoKeys,
      };
    });
    formData.append('data', JSON.stringify({ candidatos: meta }));

    return this.http.post<EstadoTransicionResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/long-list/enviar`,
      formData,
      { headers: this.headers },
    );
  }

  /** Marca/desmarca el check informativo del Multitest de un candidato aprobado. */
  setMultitest(candidatoId: number, realizado: boolean): Observable<MessageResult> {
    return this.http.patch<MessageResult>(
      `${this.apiUrl}/candidato/${candidatoId}/multitest`,
      { realizado },
      { headers: this.headers },
    );
  }

  /** Continúa a la programación de entrevistas: avanza el requerimiento de LONG_LIST_APROBADA a ENTREVISTAS. */
  continuarAEntrevistas(requerimientoId: number): Observable<EstadoTransicionResult> {
    return this.http.patch<EstadoTransicionResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/continuar-entrevistas`,
      {},
      { headers: this.headers },
    );
  }

  // ── Salidas de la fase «EMO no apto» ─────────────────────────────────────
  // Las dos formas de continuar cuando el EMO de ingreso del seleccionado salió No Apto. Son
  // excluyentes: o se sigue con alguien ya descartado, o se arma una long list nueva.

  /**
   * Retoma el proceso con un candidato del historial de rechazados. El requerimiento vuelve solo a
   * la fase en la que se lo había descartado; el frontend no la elige ni la manda.
   */
  retomarCandidato(requerimientoId: number, candidatoId: number): Observable<RetomarCandidatoResult> {
    return this.http.post<RetomarCandidatoResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/retomar-candidato/${candidatoId}`,
      {},
      { headers: this.headers },
    );
  }

  /** Descarta a los rechazados y devuelve el requerimiento a Long list para preparar una nueva. */
  volverALongList(requerimientoId: number): Observable<EstadoTransicionResult> {
    return this.http.post<EstadoTransicionResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/nueva-long-list`,
      {},
      { headers: this.headers },
    );
  }

  /**
   * Cierra el proceso desde «EMO apto» / «EMO apto con restricciones» y habilita el paso a
   * onboarding: el requerimiento pasa a CERRADO, que es lo que hace aparecer al seleccionado en la
   * bandeja de Onboarding como candidato por ingresar.
   */
  cerrarProceso(requerimientoId: number): Observable<EstadoTransicionResult> {
    return this.http.post<EstadoTransicionResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/cerrar-proceso`,
      {},
      { headers: this.headers },
    );
  }

  /**
   * Programa (o reprograma) la entrevista de un candidato y envía la invitación al correo que
   * declaró en su formulario. El correo destino lo resuelve el backend, no viaja en el body.
   */
  guardarEntrevista(
    candidatoId: number,
    fecha: string,
    hora: string,
    lugarId: number,
  ): Observable<EntrevistaAccionResult> {
    return this.http.post<EntrevistaAccionResult>(
      `${this.apiUrl}/candidato/${candidatoId}/entrevista`,
      { fecha, hora, lugarId },
      { headers: this.headers },
    );
  }

  /**
   * Guarda la evaluación de la entrevista de un candidato (multipart): los comentarios del informe
   * en `data` y, opcionalmente, sus dos archivos como form files (`informeFinal` y
   * `evaluacionConocimientos`). El backend los sube a SharePoint y los adjunta al correo del
   * finalista.
   */
  guardarEvaluacion(
    candidatoId: number,
    dto: EvaluacionGuardar,
    archivos?: EvaluacionArchivosEnvio,
  ): Observable<EvaluacionAccionResult> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(dto));
    if (archivos?.informeFinal) formData.append('informeFinal', archivos.informeFinal, archivos.informeFinal.name);
    if (archivos?.conocimientos)
      formData.append('evaluacionConocimientos', archivos.conocimientos, archivos.conocimientos.name);

    return this.http.put<EvaluacionAccionResult>(
      `${this.apiUrl}/candidato/${candidatoId}/evaluacion`,
      formData,
      { headers: this.headers },
    );
  }

  /**
   * Envía al candidato el correo de fin de proceso por no continuar y deja su resultado en
   * "No pasó". El correo destino lo resuelve el backend (el de su entrevista).
   */
  enviarAgradecimiento(candidatoId: number): Observable<EvaluacionAccionResult> {
    return this.http.post<EvaluacionAccionResult>(
      `${this.apiUrl}/candidato/${candidatoId}/agradecimiento`,
      {},
      { headers: this.headers },
    );
  }

  /**
   * Saca del proceso al postulante cuyo formulario quedó rechazado y le envía el mismo correo de
   * fin de proceso. El correo destino lo resuelve el backend (el del envío de su formulario);
   * este candidato aún no tiene entrevista de la que sacarlo.
   */
  rechazarPostulante(candidatoId: number): Observable<EvaluacionAccionResult> {
    return this.http.post<EvaluacionAccionResult>(
      `${this.apiUrl}/candidato/${candidatoId}/rechazo-postulante`,
      {},
      { headers: this.headers },
    );
  }

  // ── Formulario de información del postulante (fase "Long list aprobada") ──
  // Comparte dominio con reclutamiento pero vive en su propio controller.
  private readonly formApiUrl = `${environment.apiUrl}api/v1/gestion-gth/postulante-formulario`;

  /** Envía (o reenvía) el formulario al correo del postulante de un candidato aprobado. */
  enviarFormulario(candidatoId: number, correo: string): Observable<FormularioAccionResult> {
    return this.http.post<FormularioAccionResult>(
      `${this.formApiUrl}/candidato/${candidatoId}/enviar`,
      { correo },
      { headers: this.headers },
    );
  }

  /**
   * Envía (o reenvía) el formulario a varios candidatos de una sola vez. Responde 200 aunque alguno
   * falle: el resultado trae el detalle por candidato para actualizar los que sí salieron.
   */
  enviarFormularioMasivo(
    candidatos: FormularioEnvioMasivoItem[],
  ): Observable<FormularioEnvioMasivoResult> {
    return this.http.post<FormularioEnvioMasivoResult>(
      `${this.formApiUrl}/enviar-masivo`,
      { candidatos },
      { headers: this.headers },
    );
  }

  /** Trae el formulario del candidato para revisarlo (modal "Ver formulario"). */
  getFormularioRevision(candidatoId: number): Observable<FormularioRevision> {
    return this.http.get<FormularioRevision>(
      `${this.formApiUrl}/candidato/${candidatoId}`,
      { headers: this.headers },
    );
  }

  /** Registra la decisión de GTH sobre el formulario completado (aprobar/rechazar). */
  decisionFormulario(
    candidatoId: number,
    aprobado: boolean,
    motivo?: string | null,
  ): Observable<FormularioAccionResult> {
    return this.http.post<FormularioAccionResult>(
      `${this.formApiUrl}/candidato/${candidatoId}/decision`,
      { aprobado, motivo: motivo ?? null },
      { headers: this.headers },
    );
  }
}

/**
 * Archivos nuevos del informe de la entrevista. Los dos son opcionales y solo viajan cuando GTH
 * acaba de cargarlos: los que ya estaban subidos no se reenvían.
 */
export interface EvaluacionArchivosEnvio {
  informeFinal?: File | null;
  conocimientos?: File | null;
}

/**
 * Candidato de la long list a enviar: su CV y, opcionalmente, los archivos de su
 * "Portafolio/Anexos". El puesto no se manda: lo toma el backend del requerimiento, que es el
 * que registró el solicitante.
 */
export interface LongListCandidatoEnvio {
  nombre: string;
  comentario: string;
  cv: File;
  /** Portafolio/anexos del candidato (0..n), en el orden en que GTH los cargó. */
  anexos: File[];
}
