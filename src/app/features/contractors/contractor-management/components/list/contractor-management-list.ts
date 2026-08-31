import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractorManagementDTO } from '../../dtos/contractor-management.dto';

@Component({
  selector: 'app-contractor-management-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contractor-management-list.html',
})
export class ContractorManagementList {
  @Input() contractors: ContractorManagementDTO[] = [];
  @Output() rowClick = new EventEmitter<ContractorManagementDTO>();
}
