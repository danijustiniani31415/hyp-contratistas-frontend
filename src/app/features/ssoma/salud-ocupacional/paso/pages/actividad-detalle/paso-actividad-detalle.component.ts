import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PasoActividadService } from '../../services/paso-actividad.service';
import { PasoActividadDto, PasoEjecucionDto } from '../../dtos/paso.dtos';
import { SpiBadgeComponent } from '../../components/spi-badge/spi-badge.component';
import { EjecucionModalComponent } from '../../components/ejecucion-modal/ejecucion-modal.component';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

@Component({
  selector: 'app-paso-actividad-detalle',
  standalone: true,
  imports: [CommonModule, SpiBadgeComponent, EjecucionModalComponent],
  templateUrl: './paso-actividad-detalle.component.html',
})
export class PasoActividadDetalleComponent implements OnInit {
  actividad: PasoActividadDto | null = null;
  loading = false;
  registrarEjecucionOpen = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private actividadService: PasoActividadService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);
  }

  private load(id: number): void {
    this.loading = true;
    this.loaderService.show();
    this.actividadService.getById(id).subscribe({
      next: (a) => {
        this.actividad = a;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get spiActividad(): number | null {
    if (!this.actividad?.cantidadPlanificada) return null;
    const ej = this.ejecutadas;
    return Math.min(1, ej / this.actividad.cantidadPlanificada);
  }

  get ejecutadas(): number {
    return (this.actividad?.ejecuciones ?? []).filter(e => e.estado === 'Ejecutado').length;
  }

  estadoBadge(e: string): string {
    const m: Record<string, string> = {
      Programado: 'bg-blue-100 text-blue-700',
      Ejecutado: 'bg-green-100 text-green-700',
      Vencido: 'bg-red-100 text-red-700',
      Cancelado: 'bg-gray-100 text-gray-500',
    };
    return m[e] ?? 'bg-gray-100 text-gray-500';
  }

  ambitoBadge(a: string): string {
    const m: Record<string, string> = { Seguridad: 'bg-blue-100 text-blue-700', Salud: 'bg-green-100 text-green-700', Ambiente: 'bg-teal-100 text-teal-700' };
    return m[a] ?? 'bg-gray-100 text-gray-500';
  }

  onEjecucionCreada(e: PasoEjecucionDto): void {
    this.registrarEjecucionOpen = false;
    if (this.actividad) {
      this.actividad = { ...this.actividad, ejecuciones: [...(this.actividad.ejecuciones ?? []), e] };
    }
    this.cdr.detectChanges();
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/paso', this.actividad?.pasoId ?? '']);
  }
}
