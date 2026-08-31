import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-generic-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-generic-search.component.html',
  styleUrl: './app-generic-search.component.css',
})
export class AppGenericSearchComponent {
  @Input() placeholder: string = 'Buscar...';
  @Input() value: string = '';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();

  onInput(event: any) {
    this.value = event.target.value;
    this.valueChange.emit(this.value);
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.search.emit(this.value);
    }
  }
}
