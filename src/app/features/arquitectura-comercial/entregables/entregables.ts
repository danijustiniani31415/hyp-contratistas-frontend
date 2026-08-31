import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';

@Component({
  selector: 'app-arq-comercial-entregables',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent],
  templateUrl: './entregables.html',
  styleUrl: './entregables.css',
})
export class Entregables {

}
