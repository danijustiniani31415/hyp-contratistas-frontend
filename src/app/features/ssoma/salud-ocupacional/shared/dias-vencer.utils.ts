export interface DiasVencerStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
}

export function diasVencerStyle(dias: number): DiasVencerStyle {
  if (dias < 0) {
    return {
      bg: 'bg-red-200',
      text: 'text-red-900',
      border: 'border-red-300',
      label: `Vencido hace ${Math.abs(dias)} d`,
    };
  }
  if (dias < 7) {
    return {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
      label: `${dias} d`,
    };
  }
  if (dias < 15) {
    return {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-200',
      label: `${dias} d`,
    };
  }
  if (dias <= 30) {
    return {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      label: `${dias} d`,
    };
  }
  return {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    label: `${dias} d`,
  };
}

export function diasVencerBadgeClass(dias: number): string {
  const style = diasVencerStyle(dias);
  return `${style.bg} ${style.text} ${style.border}`;
}
