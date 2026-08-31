import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ViewToggleMode } from './view-toggle.model';

@Component({
  selector: 'app-view-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-toggle.html',
})
export class ViewToggle {
  @Input() modes: ViewToggleMode[] = [];
  @Input() value: string = '';
  /**
   * Color del modo activo (texto + ícono) y su fondo. Los defaults son el verde lima
   * histórico para que las pantallas que no pasan nada se vean igual que antes; las que
   * usan el acento verde oscuro estándar pasan --color-abril-standard(-light).
   */
  @Input() activeColor: string = '#64BC04';
  @Input() activeBackground: string = '#E5F7D1';
  @Output() valueChange = new EventEmitter<string>();

  constructor(private sanitizer: DomSanitizer) {}

  select(value: string): void {
    this.valueChange.emit(value);
  }

  safeIcon(icon: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  }
}
