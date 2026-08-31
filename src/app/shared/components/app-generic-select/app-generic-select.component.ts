import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-generic-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-generic-select.component.html',
  styleUrl: './app-generic-select.component.css',
})
export class AppGenericSelectComponent {
  @Input() options: any[] = [];
  @Input() displayField: string = 'nombre';
  @Input() valueField: string = 'id';
  @Input() placeholder: string = 'Seleccionar...';
  @Input() value: any = null;
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() label: string = '';
  @Input() bgColor: string = '#354E6F';

  @Output() valueChange = new EventEmitter<any>();

  onValueChange(event: any) {
    const newValue = event.target.value;
    this.value = newValue === 'null' ? null : newValue;
    this.valueChange.emit(this.value);
  }
}
