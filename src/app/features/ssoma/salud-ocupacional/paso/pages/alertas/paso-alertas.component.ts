import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PasoService } from '../../services/paso.service';
import { PasoActividadService } from '../../services/paso-actividad.service';
import { PasoAlertaDto, PasoActividadDto } from '../../dtos/paso.dtos';
import { EjecucionModalComponent } from '../../components/ejecucion-modal/ejecucion-modal.component';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

import { PASO_TABS } from '../../paso-tabs';
@Component({
  selector: 'app-paso-alertas',
  standalone: true,
  imports: [CommonModule, EjecucionModalComponent, AbrilPageHeaderComponent],
  templateUrl: './paso-alertas.component.html',
  styleUrl: './paso-alertas.component.css',
})
export class PasoAlertasComponent implements OnInit {
  readonly headerTabs = PASO_TABS;
  alertas: PasoAlertaDto[] = [];
  loading = false;
  tabActiva: 'vencidas' | 'proximas' = 'vencidas';

  actividadEjecutando: PasoActividadDto | null = null;
  alertaSeleccionada: PasoAlertaDto | null = null;
  loadingActividad = false;

  constructor(
    private pasoService: PasoService,
    private actividadService: PasoActividadService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.pasoService.getAlertas().subscribe({
      next: (res) => {
        this.alertas = res;
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

  get vencidas(): PasoAlertaDto[] {
    return this.alertas.filter(a => a.tipoAlerta === 'Vencido');
  }

  get proximas(): PasoAlertaDto[] {
    return this.alertas.filter(a => a.tipoAlerta === 'ProximaAVencer');
  }

  get activas(): PasoAlertaDto[] {
    return this.tabActiva === 'vencidas' ? this.vencidas : this.proximas;
  }

  registrar(alerta: PasoAlertaDto): void {
    this.loadingActividad = true;
    this.alertaSeleccionada = alerta;
    this.actividadService.getById(alerta.ejecucionId).subscribe({
      next: (a) => {
        this.actividadEjecutando = a;
        this.loadingActividad = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingActividad = false;
        this.cdr.detectChanges();
      },
    });
  }

  get mesAlerta(): number {
    return this.alertaSeleccionada ? new Date(this.alertaSeleccionada.fechaProgramada).getMonth() + 1 : new Date().getMonth() + 1;
  }

  get anioAlerta(): number {
    return this.alertaSeleccionada ? new Date(this.alertaSeleccionada.fechaProgramada).getFullYear() : new Date().getFullYear();
  }

  onEjecucionCreada(): void {
    this.actividadEjecutando = null;
    this.alertaSeleccionada = null;
    this.load();
  }
}
