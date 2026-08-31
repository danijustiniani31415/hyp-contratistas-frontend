export interface EstadoStyle {
  bg: string;
  text: string;
  border: string;
  pulse?: boolean;
}

const PROGRAMACION: Record<string, EstadoStyle> = {
  // estados legacy
  Programada:       { bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-200' },
  Confirmada:       { bg: 'bg-green-100',   text: 'text-green-800',   border: 'border-green-200' },
  Completada:       { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  'No se presentó': { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-200' },
  Cancelada:        { bg: 'bg-gray-100',    text: 'text-gray-600',    border: 'border-gray-200' },
  // estados nuevos
  Programado:              { bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-200' },
  Confirmado:              { bg: 'bg-green-100',   text: 'text-green-800',   border: 'border-green-200' },
  Realizado:               { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  Cancelado:               { bg: 'bg-gray-100',    text: 'text-gray-600',    border: 'border-gray-200' },
  Reprogramado:            { bg: 'bg-purple-100',  text: 'text-purple-800',  border: 'border-purple-200' },
  'Aceptado por Clínica':  { bg: 'bg-teal-100',    text: 'text-teal-800',    border: 'border-teal-200' },
  'Rechazado por Clínica': { bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-red-200' },
  'En Atención':           { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-200' },
  Completado:              { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
};

const INTERCONSULTA: Record<string, EstadoStyle> = {
  Pendiente: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', pulse: true },
  Atendida: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  Cancelada: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
};

const CONVALIDACION: Record<string, EstadoStyle> = {
  Aprobada: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  Rechazada: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  Pendiente: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
};

const FALLBACK: EstadoStyle = {
  bg: 'bg-gray-100',
  text: 'text-gray-600',
  border: 'border-gray-200',
};

function style(dict: Record<string, EstadoStyle>, value: string | null | undefined): EstadoStyle {
  if (!value) return FALLBACK;
  return dict[value] ?? FALLBACK;
}

export function estadoProgramacionStyle(value: string | null | undefined): EstadoStyle {
  return style(PROGRAMACION, value);
}

export function estadoInterconsultaStyle(value: string | null | undefined): EstadoStyle {
  return style(INTERCONSULTA, value);
}

export function resultadoConvalidacionStyle(value: string | null | undefined): EstadoStyle {
  return style(CONVALIDACION, value);
}

export function estadoBadgeClass(s: EstadoStyle): string {
  return `${s.bg} ${s.text} ${s.border}`;
}
