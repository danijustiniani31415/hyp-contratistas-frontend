import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-indicadores-ssoma',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './indicadores-ssoma.component.html',
  styleUrls: ['./indicadores-ssoma.component.css'],
})
export class IndicadoresSsomaComponent {
  readonly TABS = [
    { label: 'Seguimiento', icon: 'ti-chart-bar', path: 'seguimiento' },
    { label: 'Dashboard SSOMA', icon: 'ti-layout-dashboard', path: 'dashboard' },
    { label: 'Por Proyecto', icon: 'ti-building', path: 'dashboard-proyecto' },
    { label: 'Desempeño Supervisor', icon: 'ti-user-check', path: 'desempeno-supervisor' },
    { label: 'Reactivos IF/IG/IA', icon: 'ti-activity', path: 'reactivos' },
  ];
}
