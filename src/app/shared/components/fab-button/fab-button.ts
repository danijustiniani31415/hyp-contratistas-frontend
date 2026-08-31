import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-fab',
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="fab"
      [disabled]="disabled"
      [title]="label"
      (click)="clicked.emit()">
      <i class="ti ti-plus"></i>
      <span class="fab__label">{{ label }}</span>
    </button>
  `,
  styles: [`
    .fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100;
      background: #1b3a2d;
      color: #fff;
      border: none;
      border-radius: 999px;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(27, 58, 45, 0.3);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s, transform 0.1s;
      min-height: 44px;
      min-width: 44px;
      font-family: inherit;
    }

    .fab:hover:not(:disabled) {
      background: #152e23;
      transform: scale(1.02);
    }

    .fab:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .fab__label {
      display: none;
    }

    @media (min-width: 640px) {
      .fab__label {
        display: inline;
      }
    }
  `],
})
export class FabButton {
  @Input() label = 'Nuevo';
  @Input() disabled = false;
  @Output() clicked = new EventEmitter<void>();
}
