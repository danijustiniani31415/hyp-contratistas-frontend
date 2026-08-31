import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VecinoListItemDTO } from '../../dtos/gestion-vecinos.dto';

@Component({
  selector: 'app-gestion-vecinos-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestion-vecinos-list.html',
})
export class GestionVecinosList {
  @Input() vecinos: VecinoListItemDTO[] = [];
  @Output() rowClick = new EventEmitter<VecinoListItemDTO>();
}
