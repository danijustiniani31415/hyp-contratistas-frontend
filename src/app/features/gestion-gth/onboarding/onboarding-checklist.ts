import { ActividadOnboarding, FaseOnboarding, OnboardingListItem } from './dtos/onboarding.dto';

/**
 * Lectura del checklist progresivo de un colaborador.
 *
 * El catálogo de actividades (`gth_onboarding_actividad`) es el mismo para todos y viene con la
 * bandeja; cuáles están cumplidas lo resuelve el backend y llega en `actividadesHechas`. Acá NO se
 * deduce nada: si la regla de una actividad se dedujera también en la pantalla, el % de la tabla y
 * los checks del detalle podrían discrepar. Este archivo solo cuenta y agrupa.
 */

/** Códigos estables de las fases (espejo de `gth_onboarding_fase.codigo`). */
export const FASE = {
  cartaOfertaFirmada: 'CARTA_OFERTA_FIRMADA',
  fileDigital: 'FILE_DIGITAL',
  correoBienvenida: 'CORREO_BIENVENIDA',
  formularioWeb: 'FORMULARIO_WEB',
  preinicio: 'PREINICIO',
  cierreOnboarding: 'CIERRE_ONBOARDING',
  baseMaestra: 'BASE_MAESTRA',
} as const;

/** Códigos estables de las actividades con tarjeta propia en el detalle. */
export const ACTIVIDAD = {
  revisarAprobarCarta: 'REVISAR_APROBAR_CARTA',
  avisoTi: 'AVISO_TI',
  avisoObra: 'AVISO_OBRA',
} as const;

/** Una actividad del checklist ya resuelta contra el colaborador que se está viendo. */
export interface ActividadEstado {
  actividad: ActividadOnboarding;
  hecha: boolean;
}

/** True si la fase ya quedó atrás para este colaborador. */
export function faseCompletada(fase: FaseOnboarding, item: OnboardingListItem): boolean {
  return fase.orden < item.faseOrden;
}

/** ¿Está cumplida esta actividad? Lo dice el backend, no se deduce acá. */
export function actividadHecha(actividad: ActividadOnboarding, item: OnboardingListItem): boolean {
  return item.actividadesHechas.includes(actividad.codigo);
}

/** Las actividades de una fase con su estado resuelto, en orden. */
export function actividadesDeFase(fase: FaseOnboarding, item: OnboardingListItem): ActividadEstado[] {
  return fase.actividades.map((actividad) => ({
    actividad,
    hecha: actividadHecha(actividad, item),
  }));
}

/** Cuántas actividades de la fase están hechas (el número que va bajo su círculo). */
export function hechasEnFase(fase: FaseOnboarding, item: OnboardingListItem): number {
  return fase.actividades.filter((a) => actividadHecha(a, item)).length;
}

/** Avance del onboarding medido en actividades (una fase puede tener 1 y otra 8). */
export interface AvanceChecklist {
  hechas: number;
  total: number;
  /** Actividades previas a la migración a base maestra (la última fase no es onboarding operativo). */
  hechasPrevias: number;
  totalPrevias: number;
  /** Primera actividad pendiente de todo el checklist: es el «siguiente paso» de la pantalla. */
  siguiente: ActividadOnboarding | null;
}

export function avanceChecklist(fases: FaseOnboarding[], item: OnboardingListItem): AvanceChecklist {
  let hechas = 0;
  let total = 0;
  let hechasPrevias = 0;
  let totalPrevias = 0;
  let siguiente: ActividadOnboarding | null = null;

  const ultimaFase = fases.length ? Math.max(...fases.map((f) => f.orden)) : 0;

  for (const fase of fases) {
    const previa = fase.orden < ultimaFase;
    for (const actividad of fase.actividades) {
      const hecha = actividadHecha(actividad, item);
      total++;
      if (hecha) hechas++;
      if (previa) {
        totalPrevias++;
        if (hecha) hechasPrevias++;
      }
      if (!hecha && siguiente === null) siguiente = actividad;
    }
  }

  return { hechas, total, hechasPrevias, totalPrevias, siguiente };
}
