import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VecinoListItemDTO } from '../../dtos/gestion-vecinos.dto';

@Component({
  selector: 'app-gestion-vecinos-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestion-vecinos-card.html',
})
export class GestionVecinosCard {
  @Input() item!: VecinoListItemDTO;
  @Output() cardClick = new EventEmitter<VecinoListItemDTO>();
}
