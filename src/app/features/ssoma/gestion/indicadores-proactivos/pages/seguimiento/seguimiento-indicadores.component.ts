import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IndicadoresProactivosService } from '../../indicadores-proactivos.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { IndicadorProactivoProyectoDto } from '../../indicadores-proactivos.dtos';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

@Component({
  selector: 'app-seguimiento-indicadores',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './seguimiento-indicadores.component.html',
  styleUrls: ['./seguimiento-indicadores.component.css'],
})
export class SeguimientoIndicadoresComponent implements OnInit {
  private svc = inject(IndicadoresProactivosService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);

  mes = signal<number>(new Date().getMonth() + 1);
  anio = signal<number>(new Date().getFullYear());
  proyectos = signal<IndicadorProactivoProyectoDto[]>([]);
  proyectoExpandido = signal<number | null>(null);
  verOcultos = signal<boolean>(false);

  meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
  ];

  anios = [2024, 2025, 2026, 2027].map(a => ({ valor: a, nombre: String(a) }));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loader.show();
    this.svc.getSeguimiento(this.mes(), this.anio(), this.verOcultos()).subscribe({
      next: data => {
        this.proyectos.set(data);
        this.loader.hide();
      },
      error: err => {
        this.loader.hide();
        this.errorSvc.handleError(err);
      },
    });
  }

  toggleExpandir(proyectoId: number): void {
    this.proyectoExpandido.set(
      this.proyectoExpandido() === proyectoId ? null : proyectoId,
    );
  }

  toggleOculto(emp: { empresaId: number | null; esOculto: boolean }): void {
    if (!emp.empresaId) return;
    const accion = emp.esOculto
      ? this.svc.mostrarEmpresa(emp.empresaId)
      : this.svc.ocultarEmpresa(emp.empresaId);
    accion.subscribe({
      next: () => this.cargar(),
      error: err => this.errorSvc.handleError(err),
    });
  }

  nombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre ?? '';
  }

  /** Clases semáforo estilo DS (c-verde / c-amarillo / c-naranja / c-rojo) */
  colorClass(pct: number): string {
    if (pct >= 100) return 'c-verde';
    if (pct >= 75)  return 'c-amarillo';
    if (pct >= 50)  return 'c-naranja';
    return 'c-rojo';
  }

  /** Clase border-left de la card según estado */
  cardStatusClass(pct: number): string {
    if (pct >= 100) return 'proy-card--completo';
    if (pct >= 75)  return 'proy-card--cerca';
    return 'proy-card--riesgo';
  }

  barWidth(pct: number): string {
    return `${Math.min(100, pct)}%`;
  }

  pctLabel(meta: number, pct: number): string {
    return meta > 0 ? `${Math.round(pct)}%` : 'N/A';
  }

  colorClassInd(meta: number, pct: number): string {
    return meta > 0 ? this.colorClass(pct) : 'c-na';
  }

  /** @deprecated use colorClass */
  pctClass = this.colorClass.bind(this);
  /** @deprecated use colorClassInd */
  pctClassInd = this.colorClassInd.bind(this);

  /** Ranking: ordena de mayor a menor pctProactivoGeneral */
  get ranking(): IndicadorProactivoProyectoDto[] {
    return [...this.proyectos()].sort((a, b) => b.pctProactivoGeneral - a.pctProactivoGeneral);
  }

  get kpis() {
    const data = this.proyectos();
    if (!data.length) return null;
    const avg = data.reduce((s, p) => s + p.pctProactivoGeneral, 0) / data.length;
    return {
      promedio: avg,
      enMeta:   data.filter(p => p.pctProactivoGeneral >= 100).length,
      enRiesgo: data.filter(p => p.pctProactivoGeneral >= 75 && p.pctProactivoGeneral < 100).length,
      criticos: data.filter(p => p.pctProactivoGeneral < 75).length,
    };
  }
}
