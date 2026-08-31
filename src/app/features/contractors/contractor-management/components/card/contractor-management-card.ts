import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractorManagementDTO } from '../../dtos/contractor-management.dto';

@Component({
  selector: 'app-contractor-management-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contractor-management-card.html',
})
export class ContractorManagementCard {
  @Input() item!: ContractorManagementDTO;
  @Output() cardClick = new EventEmitter<ContractorManagementDTO>();
}
