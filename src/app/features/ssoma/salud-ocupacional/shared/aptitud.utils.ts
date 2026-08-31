import { AptitudEmo } from '../dtos/emo.model';

export interface AptitudStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

const APTITUD_STYLES: Record<string, AptitudStyle> = {
  Apto: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    dot: '#22c55e',
  },
  'Apto con Restricciones': {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    dot: '#eab308',
  },
  'No Apto': {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: '#ef4444',
  },
  Observado: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200',
    dot: '#f97316',
  },
  Pendiente: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: '#9ca3af',
  },
};

const SIN_EMO_STYLE: AptitudStyle = {
  bg: 'bg-gray-100',
  text: 'text-gray-600',
  border: 'border-gray-200',
  dot: '#9ca3af',
};

export function aptitudStyle(aptitud: AptitudEmo | null | undefined): AptitudStyle {
  if (!aptitud) return SIN_EMO_STYLE;
  return APTITUD_STYLES[aptitud] ?? SIN_EMO_STYLE;
}

export function aptitudBadgeClass(aptitud: AptitudEmo | null | undefined): string {
  const style = aptitudStyle(aptitud);
  return `${style.bg} ${style.text} ${style.border}`;
}

export function aptitudDotColor(aptitud: AptitudEmo | null | undefined): string {
  return aptitudStyle(aptitud).dot;
}

export const APTITUD_CHART_ORDER: AptitudEmo[] = [
  'Apto',
  'Apto con Restricciones',
  'No Apto',
  'Observado',
  'Pendiente',
];

export const SIN_EMO_LABEL = 'Sin EMO';
export const SIN_EMO_COLOR = '#9ca3af';
