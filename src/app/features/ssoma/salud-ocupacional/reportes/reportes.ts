import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { ReporteService } from '../services/reporte.service';
import { ErrorService } from '../../../../core/services/error.service';
import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';

@Component({
  selector: 'app-salud-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css'],
})
export class Reportes {
  readonly tabs = SSOMA_TABS;
  anioActual = new Date().getFullYear();
  mes = new Date().getMonth() + 1;
  anio = new Date().getFullYear();
  loading = false;

  readonly meses = [
    { v: 1, l: 'Enero' },
    { v: 2, l: 'Febrero' },
    { v: 3, l: 'Marzo' },
    { v: 4, l: 'Abril' },
    { v: 5, l: 'Mayo' },
    { v: 6, l: 'Junio' },
    { v: 7, l: 'Julio' },
    { v: 8, l: 'Agosto' },
    { v: 9, l: 'Septiembre' },
    { v: 10, l: 'Octubre' },
    { v: 11, l: 'Noviembre' },
    { v: 12, l: 'Diciembre' },
  ];
  readonly anios = [2024, 2025, 2026];
  get aniosOpts(): { id: number; label: string }[] {
    return this.anios.map(a => ({ id: a, label: String(a) }));
  }

  constructor(
    private svc: ReporteService,
    private errorService: ErrorService,
  ) {}

  exportar(): void {
    this.loading = true;
    this.svc.exportarSunafilMensual(this.mes, this.anio).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ReporteEMO_${this.mes}_${this.anio}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorService.handleError(err);
      },
    });
  }
}
