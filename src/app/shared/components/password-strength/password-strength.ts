import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type PasswordStrength = 'none' | 'weak' | 'medium' | 'strong';

@Component({
  selector: 'app-password-strength',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './password-strength.html',
  styleUrl: './password-strength.css',
})
export class PasswordStrengthComponent {
  @Input() password = '';

  get strength(): PasswordStrength {
    const p = this.password ?? '';
    if (!p) return 'none';

    const hasUpper = /[A-Z]/.test(p);
    const hasLower = /[a-z]/.test(p);
    const hasDigit = /\d/.test(p);
    const hasSymbol = /[^A-Za-z0-9]/.test(p);

    if (p.length < 8 || (!hasUpper && !hasDigit && !hasSymbol)) {
      return 'weak';
    }

    if (p.length >= 8 && hasUpper && hasDigit && hasSymbol) {
      return 'strong';
    }

    return 'medium';
  }

  get strengthClass(): string {
    return this.strength;
  }

  get strengthLabel(): string {
    switch (this.strength) {
      case 'weak':
        return 'Débil';
      case 'medium':
        return 'Media';
      case 'strong':
        return 'Fuerte';
      default:
        return '';
    }
  }
}
