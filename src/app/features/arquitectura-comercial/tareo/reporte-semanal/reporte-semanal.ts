import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { TareoService } from '../../../../core/services/arquitectura-comercial/tareo.service';
import { AC_TAREO_TABS } from '../../shared/arquitectura-comercial-tabs';
import { TareoReporteSemanalDTO } from '../../../../core/dtos/arquitectura-comercial/tareo.model';

const DIAS_LABEL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

@Component({
  selector: 'app-tareo-reporte-semanal',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent],
  templateUrl: './reporte-semanal.html',
  styleUrl: './reporte-semanal.css',
})
export class TareoReporteSemanal {
  readonly tabs = AC_TAREO_TABS;
  readonly diasLabel = DIAS_LABEL;

  semanaLunes = this.lunesDeEstaSemana();
  filas: TareoReporteSemanalDTO[] = [];
  cargando = false;

  constructor(private tareoService: TareoService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.cargar(); }

  private lunesDeEstaSemana(): Date {
    const hoy = new Date();
    const dow = hoy.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diff);
    lunes.setHours(0, 0, 0, 0);
    return lunes;
  }

  get semanaFin(): Date {
    const d = new Date(this.semanaLunes);
    d.setDate(d.getDate() + 6);
    return d;
  }

  get diasSemana(): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.semanaLunes);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  cambiarSemana(delta: number): void {
    const d = new Date(this.semanaLunes);
    d.setDate(d.getDate() + delta * 7);
    this.semanaLunes = d;
    this.cargar();
  }

  private fmtFechaISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  cargar(): void {
    this.cargando = true;
    this.tareoService.getReporteSemanal(this.fmtFechaISO(this.semanaLunes)).subscribe({
      next: (r) => { this.filas = r; this.cargando = false; this.cdr.detectChanges(); },
      error: () => { this.cargando = false; this.cdr.detectChanges(); },
    });
  }

  diaDe(fila: TareoReporteSemanalDTO, fecha: Date) {
    const iso = this.fmtFechaISO(fecha);
    return fila.dias.find((d) => d.fecha === iso) ?? null;
  }

  fmtHora(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  fmtHoras(horas: number | null): string {
    if (horas == null) return '';
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  }
}
