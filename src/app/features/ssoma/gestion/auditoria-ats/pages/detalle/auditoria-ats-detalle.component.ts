import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';

import { AuditoriaAtsService } from '../../auditoria-ats.service';
import { AuditoriaAtsDetalleDto } from '../../auditoria-ats.dtos';
import { SCORE_CONFIG } from '../nueva/auditoria-ats-nueva.component';

@Component({
  selector: 'app-auditoria-ats-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AbrilPageHeaderComponent, TitleCasePipe],
  templateUrl: './auditoria-ats-detalle.component.html',
  styleUrl: './auditoria-ats-detalle.component.css',
})
export class AuditoriaAtsDetalleComponent implements OnInit {
  auditoria?: AuditoriaAtsDetalleDto;
  loading = true;
  readonly scoreConfig = SCORE_CONFIG;
  fotoAmpliada: string | null = null;
  zoom = 1;
  readonly zoomMin = 1;
  readonly zoomMax = 4;

  constructor(
    private service: AuditoriaAtsService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getDetalle(id).subscribe({
      next: (data) => {
        this.auditoria = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  nivelConfig(nivel?: string): (typeof SCORE_CONFIG)[number] | null {
    if (!nivel) return null;
    return SCORE_CONFIG.find((s) => s.label === nivel) ?? null;
  }

  scoreForPregunta(puntaje: number): (typeof SCORE_CONFIG)[number] {
    return SCORE_CONFIG[Math.min(5, Math.max(0, puntaje))];
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/auditoria-ats/lista']);
  }

  ampliarFoto(foto: string): void {
    this.fotoAmpliada = foto;
    this.zoom = 1;
  }

  cerrarFotoAmpliada(): void {
    this.fotoAmpliada = null;
    this.zoom = 1;
  }

  onWheelZoom(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.2 : -0.2;
    this.zoom = Math.min(this.zoomMax, Math.max(this.zoomMin, this.zoom + delta));
  }
}
