import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ReclutamientoService } from './reclutamiento.service';
import { CandidatoFormularioResumen, FormularioCoincidencia } from '../dtos/formulario-postulante.dto';

/** Resultado de una decisión ya aplicada sobre el formulario de un candidato. */
export interface DecisionFormularioAplicada {
  /** Estado resultante del formulario, para refrescar la bandeja o el modal. */
  resumen: CandidatoFormularioResumen;
  /** Observaciones que se le enviaron al postulante; null cuando se aprobó. */
  motivo: string | null;
}

/**
 * Aviso a pintar cuando el documento declarado ya existe en la base, con su severidad y colores
 * resueltos. Lo consumen el modal «Ver formulario» y la ficha del candidato del detalle, que
 * muestran el mismo aviso en dos sitios distintos.
 */
export interface CoincidenciaAviso {
  /** 'info' → existe pero nunca fue trabajador · 'aviso' → tuvo ficha · 'bloqueo' → trabaja acá hoy. */
  tono: 'info' | 'aviso' | 'bloqueo';
  icono: string;
  titulo: string;
  detalle: string;
  borde: string;
  fondo: string;
  color: string;
  /** true si con este aviso no se puede aprobar el formulario. */
  bloquea: boolean;
}

/**
 * Flujo de aprobar/rechazar el formulario del postulante (confirmación, llamada al backend y
 * avisos). Vive acá porque lo usan los dos lugares desde donde GTH decide: el modal "Ver
 * formulario" y los botones de la ficha del candidato en el detalle del requerimiento. Al estar
 * en un solo sitio, ambos piden las observaciones igual y muestran el mismo mensaje.
 */
@Injectable({ providedIn: 'root' })
export class FormularioDecisionService {
  constructor(
    private service: ReclutamientoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  /**
   * Aviso del documento declarado que ya existe en la base, con severidad y colores. null cuando
   * no hay coincidencia (el caso normal).
   *
   * Las tres severidades salen del estado de la ficha que coincide:
   *  • `info` — existe en la base maestra pero nunca tuvo ficha de trabajador.
   *  • `aviso` — tuvo ficha, pero hoy no está adentro (retirado, finalista de otro proceso…).
   *    Aprobar está permitido: es justamente el caso del extrabajador que vuelve a postular.
   *  • `bloqueo` — trabaja en Abril hoy. Aprobar reescribiría los datos de un trabajador con lo
   *    que tecleó alguien en un formulario público, así que no se permite.
   *
   * Nada de esto se le muestra nunca al postulante: su formulario no sabe con quién coincide.
   */
  avisoCoincidencia(c: FormularioCoincidencia | null | undefined): CoincidenciaAviso | null {
    if (!c) return null;

    const documento = [c.tipoDocumento, c.documento].filter(Boolean).join(' ');
    const persona = c.nombreEnBd ? `${documento} · ${c.nombreEnBd}` : documento;

    if (c.bloqueaAprobacion) {
      return {
        tono: 'bloqueo',
        icono: 'ti-alert-triangle',
        titulo: 'El documento declarado es de un trabajador actual de Abril.',
        detalle: `${persona} · ${c.workersEstadoNombre ?? 'Activo'}. No se puede aprobar este formulario.`,
        borde: '#fecaca',
        fondo: '#FEF2F2',
        color: '#B91C1C',
        bloquea: true,
      };
    }

    if (c.nivel === 'FICHA_PREVIA') {
      return {
        tono: 'aviso',
        icono: 'ti-user-search',
        titulo: 'Esta persona ya tuvo ficha de trabajador.',
        detalle: `${persona} · ${c.workersEstadoNombre ?? 'sin estado'}. Al aprobar se actualizará su ficha, no se creará una nueva.`,
        borde: '#fde68a',
        fondo: '#FFFBEB',
        color: '#B45309',
        bloquea: false,
      };
    }

    return {
      tono: 'info',
      icono: 'ti-info-circle',
      titulo: 'Esta persona ya está registrada en la base maestra.',
      detalle: `${persona}. Sin ficha de trabajador. Al aprobar se actualizará su ficha, no se creará una nueva.`,
      borde: 'var(--color-abril-border)',
      fondo: '#F8FAFC',
      color: '#475569',
      bloquea: false,
    };
  }

  /**
   * Aprueba el formulario del candidato. Devuelve null si la operación falló.
   *
   * `coincidencia` corta antes de llamar al backend cuando el documento declarado es de un
   * trabajador que está adentro. Es solo para explicar el motivo en el momento: el backend
   * revalida lo mismo al registrar la decisión (la ficha puede haber cambiado de estado mientras
   * el modal estaba abierto, y el endpoint existe con o sin pantalla).
   */
  aprobar(
    candidatoId: number,
    coincidencia?: FormularioCoincidencia | null,
  ): Promise<DecisionFormularioAplicada | null> {
    const aviso = this.avisoCoincidencia(coincidencia);
    if (aviso?.bloquea) {
      Swal.fire({
        icon: 'error',
        title: 'No se puede aprobar',
        html: `${aviso.titulo}<br><br>${aviso.detalle}`,
        confirmButtonColor: '#B91C1C',
      });
      return Promise.resolve(null);
    }
    return this.registrar(candidatoId, true, null);
  }

  /**
   * Rechaza el formulario. Hay dos casos y no se piden las mismas cosas:
   *  • Ya completado: las observaciones son obligatorias — se le envían por correo al postulante y
   *    se le muestran en cada página del formulario mientras corrige; sin ellas no sabría qué
   *    cambiar.
   *  • Enviado pero nunca llenado: es un descarte interno para que el proceso siga sin él, así que
   *    el motivo es opcional (queda como registro) y no se le escribe nada al postulante.
   *
   * Devuelve null si GTH canceló el diálogo o si la operación falló.
   */
  async rechazar(
    candidatoId: number,
    completado: boolean,
  ): Promise<DecisionFormularioAplicada | null> {
    const dialogo = completado
      ? {
          icon: 'warning' as const,
          title: 'Rechazar formulario',
          text: 'El postulante recibirá estas observaciones por correo, junto al enlace de su formulario con lo que ya llenó, para que corrija y lo vuelva a enviar.',
          inputLabel: 'Observaciones para el postulante',
          inputPlaceholder: 'Indica qué debe corregir o completar en su formulario…',
          inputValidator: (valor: string) =>
            (valor ?? '').trim()
              ? null
              : 'Escribe las observaciones que se le enviarán al postulante.',
        }
      : {
          icon: 'question' as const,
          title: 'Rechazar formulario sin completar',
          text:
            'El postulante todavía no llenó su formulario. Al rechazarlo el proceso puede continuar sin él, y no se le envía ningún correo. ' +
            'Su enlace sigue vigente: si lo completa más adelante volverá a aparecer como «Por revisar».',
          inputLabel: 'Motivo (opcional, queda como registro interno)',
          inputPlaceholder: 'Ej. No respondió tras dos recordatorios',
          inputValidator: undefined,
        };

    const { value: motivo, isConfirmed } = await Swal.fire({
      icon: dialogo.icon,
      title: dialogo.title,
      text: dialogo.text,
      input: 'textarea',
      inputLabel: dialogo.inputLabel,
      inputPlaceholder: dialogo.inputPlaceholder,
      inputValidator: dialogo.inputValidator,
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B91C1C',
    });
    if (!isConfirmed) return null;

    return this.registrar(candidatoId, false, motivo);
  }

  private async registrar(
    candidatoId: number,
    aprobado: boolean,
    motivo: string | null,
  ): Promise<DecisionFormularioAplicada | null> {
    this.loaderService.show();
    try {
      const res = await firstValueFrom(
        this.service.decisionFormulario(candidatoId, aprobado, motivo),
      );
      this.loaderService.hide();
      Swal.fire({
        icon: 'success',
        title: aprobado ? 'Formulario aprobado' : 'Formulario rechazado',
        // El backend distingue si le escribió o no al postulante; el mensaje viene de allá.
        text: res.message,
        confirmButtonColor: '#005D9D',
      });
      return { resumen: res.formulario, motivo: aprobado ? null : motivo || null };
    } catch (err) {
      this.loaderService.hide();
      this.errorService.handleError(err as HttpErrorResponse);
      return null;
    }
  }
}
