import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent, AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvSupervisorContratistaService } from '../../../evaluaciones/services/ev-supervisor-contratista.service';
import { EvSupervisorContratistaMiPerfilDto } from '../../../evaluaciones/dtos/ev-supervisor-contratista.model';

@Component({
  selector: 'app-mi-perfil-supervisor',
  standalone: true,
  imports: [CommonModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './mi-perfil-supervisor.html',
  styleUrl: './mi-perfil-supervisor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiPerfilSupervisor implements OnInit {
  perfil: EvSupervisorContratistaMiPerfilDto | null = null;
  loading = true;

  readonly headerTabs: AbrilPageTab[] = [
    { label: 'Panel',         icono: 'ti-layout-dashboard', route: '/habilitacion/dashboard-contratista' },
    { label: 'Trabajadores',  icono: 'ti-users',            route: '/habilitacion/gestion/trabajadores' },
    { label: 'Empresa',       icono: 'ti-building',         route: '/habilitacion/gestion/empresa' },
    { label: 'Equipos',       icono: 'ti-truck',            route: '/habilitacion/gestion/equipos' },
    { label: 'SCTR',          icono: 'ti-shield-check',     route: '/habilitacion/gestion/sctr-vidaley' },
    { label: 'Inducciones',   icono: 'ti-school',           route: '/habilitacion/gestion/inducciones' },
    { label: 'Evaluar SSOMA', icono: 'ti-clipboard-check',  route: '/habilitacion/evaluar-prevencionista' },
    { label: 'Mi Desempeño',  icono: 'ti-report',           route: '/habilitacion/mi-perfil-supervisor' },
  ];

  notaClase(nota: number | null): string {
    if (nota === null) return 'nota-sin';
    if (nota > 15) return 'nota-aprobado';
    if (nota >= 12) return 'nota-regular';
    return 'nota-desaprobado';
  }

  notaDisplay(nota: number | null): string {
    return nota !== null ? nota.toFixed(1) : '—';
  }

  constructor(
    private svc: EvSupervisorContratistaService,
    private loader: LoaderService,
    private errorSvc: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.loader.show();
    this.svc.getMiPerfil().subscribe({
      next: (d) => {
        this.perfil = d;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.loader.hide();
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
