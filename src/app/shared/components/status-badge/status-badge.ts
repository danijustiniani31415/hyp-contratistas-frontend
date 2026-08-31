import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';

interface BadgeStyle {
  bg: string;
  text: string;
}

const STATUS_MAP: Record<string, BadgeStyle> = {
  Aprobado:       { bg: '#D1FAE5', text: '#065F46' },
  Habilitado:     { bg: '#D1FAE5', text: '#065F46' },
  'En plazo':     { bg: '#DBEAFE', text: '#1E40AF' },
  Enviado:        { bg: '#DBEAFE', text: '#1E40AF' },
  Rechazado:      { bg: '#FEE2E2', text: '#991B1B' },
  'No Autorizado':{ bg: '#FEE2E2', text: '#991B1B' },
  Vencido:        { bg: '#FFEDD5', text: '#9A3412' },
  Falta:          { bg: '#FEF9C3', text: '#713F12' },
  Pendiente:      { bg: '#FEF9C3', text: '#713F12' },
  'No aplica':    { bg: '#F3F4F6', text: '#374151' },
};

const DEFAULT_STYLE: BadgeStyle = { bg: '#F3F4F6', text: '#374151' };

/**
 * Badge de estado reutilizable.
 *
 * Modo automático (recomendado): pasa `status` y el badge elige colores solo.
 *   <app-status-badge status="Aprobado" />
 *   <app-status-badge status="Rechazado" />
 *   <app-status-badge status="Vencido" />
 *   Valores: Aprobado | Rechazado | Falta | No aplica | En plazo | Vencido | Enviado | No Autorizado | Habilitado | Pendiente
 *
 * Modo manual (compatibilidad con código existente): pasa text + bgColor + textColor.
 *   <app-status-badge text="ACTIVO" bgColor="#D7FAF4" textColor="#009C87" />
 */
@Component({
  standalone: true,
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-block rounded-lg px-[8px] py-[2px] my-[4px] text-xs font-semibold"
      [class.whitespace-nowrap]="!wrap"
      [class.whitespace-normal]="wrap"
      [class.break-words]="wrap"
      [style.background-color]="style.bg"
      [style.color]="style.text">
      {{ label }}
    </span>
  `,
})
export class StatusBadge implements OnChanges {
  // Modo automático
  @Input() status = '';
  // Modo manual (legacy)
  @Input() text = '';
  @Input() bgColor = '';
  @Input() textColor = '';
  /**
   * Permite que la etiqueta ocupe varias líneas. Por defecto va en una sola
   * (`whitespace-nowrap`) porque casi siempre vive en una celda de tabla; actívalo
   * cuando el badge va dentro de una tarjeta angosta y el texto es largo
   * (ej. "Aprobación Gerencia General"), que si no se desborda de la tarjeta.
   */
  @Input() wrap = false;

  style: BadgeStyle = DEFAULT_STYLE;
  label = '';

  ngOnChanges(): void {
    if (this.bgColor && this.textColor) {
      this.style = { bg: this.bgColor, text: this.textColor };
      this.label = this.text || this.status;
    } else {
      this.style = STATUS_MAP[this.status] ?? DEFAULT_STYLE;
      this.label = this.text || this.status;
    }
  }
}
