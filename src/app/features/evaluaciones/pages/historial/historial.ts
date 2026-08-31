import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { EvEvaluacionService } from '../../services/ev-evaluacion.service';
import { EvPeriodoService } from '../../services/ev-periodo.service';
import { EvEvaluacionResponseDto } from '../../dtos/ev-evaluacion.model';
import { EvPeriodoDto } from '../../dtos/ev-periodo.model';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './historial.html',
  styleUrl: './historial.css',
})
export class Historial implements OnInit {
  periodos: EvPeriodoDto[] = [];
  periodoSeleccionado: EvPeriodoDto | null = null;
  evaluaciones: EvEvaluacionResponseDto[] = [];
  loading = false;
  filtroArea = '';
  filtroResidente = '';

  constructor(
    private evalService: EvEvaluacionService,
    private periodoService: EvPeriodoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.periodoService.getAll().subscribe({
      next: (ps) => {
        this.periodos = ps;
        if (ps.length) this.selectPeriodo(this.periodoPorDefecto(ps));
        this.cdr.detectChanges();
      },
    });
  }

  // Por defecto selecciona el mes calendario anterior al actual (el último que ya cerró),
  // no ps[0] a secas: la lista puede incluir períodos futuros o de prueba sembrados de
  // antemano (p. ej. para poblar la tendencia histórica de gráficos) sin evaluaciones reales.
  private periodoPorDefecto(ps: EvPeriodoDto[]): EvPeriodoDto {
    const hoy = new Date();
    const mesAnteriorMes = hoy.getMonth() === 0 ? 12 : hoy.getMonth();
    const mesAnteriorAnio = hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear();
    const delMesAnterior = ps.find((p) => p.mes === mesAnteriorMes && p.anio === mesAnteriorAnio);
    if (delMesAnterior) return delMesAnterior;

    const yaIniciados = ps.filter(
      (p) => p.anio < hoy.getFullYear() || (p.anio === hoy.getFullYear() && p.mes <= hoy.getMonth() + 1),
    );
    return yaIniciados[0] ?? ps[0];
  }

  selectPeriodo(p: EvPeriodoDto): void {
    this.periodoSeleccionado = p;
    this.loading = true;
    this.evalService.getByPeriodo(p.id).subscribe({
      next: (e) => {
        this.evaluaciones = e;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get filtradas(): EvEvaluacionResponseDto[] {
    return this.evaluaciones.filter(
      (e) =>
        (!this.filtroArea || e.areaNombre === this.filtroArea) &&
        (!this.filtroResidente ||
          e.evaluadoNombre.toLowerCase().includes(this.filtroResidente.toLowerCase())),
    );
  }

  get areas(): string[] {
    return [...new Set(this.evaluaciones.map((e) => e.areaNombre))].sort();
  }

  scoreClass(nota: number | null): string {
    if (nota === null) return '';
    if (nota >= 16) return 'score-hi';
    if (nota >= 12) return 'score-ok';
    return 'score-lo';
  }

  get hasAsignaciones(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem('allowed_features');
    return raw ? (JSON.parse(raw) as string[]).includes('evaluaciones.asignaciones') : false;
  }
}
