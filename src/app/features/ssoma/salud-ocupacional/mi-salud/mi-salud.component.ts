import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { MiSaludService } from './mi-salud.service';
import { MiSaludModalComponent } from './mi-salud-modal.component';
import { MiSaludResumenDto, MiDescansoDto, MiDescansoAdjuntoDto } from './mi-salud.dtos';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';
import { abrirCertificado } from '../shared/certificado-descanso.utils';
import { FabButton } from '../../../../shared/components/fab-button/fab-button';
import { NavigationService } from '../../../../core/navigation/navigation.service';

/** Feature que habilita el botón "Configuración" de Mi Salud (rol ADMINISTRADOR DEL SISTEMA). */
const FEATURE_CONFIGURACION = 'ssoma.salud-ocupacional.mi-salud.configuracion';

@Component({
  selector: 'app-mi-salud',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FabButton, CommonModule, AbrilPageHeaderComponent, Paginator, MiSaludModalComponent],
  templateUrl: './mi-salud.component.html',
  styleUrl: './mi-salud.component.css',
})
export class MiSaludComponent implements OnInit, OnDestroy {
  readonly tabs       = SSOMA_TABS;
  readonly anioActual = new Date().getFullYear();
  readonly pageSize   = 10;

  resumen      : MiSaludResumenDto | null = null;
  descansos    : MiDescansoDto[] = [];
  loadingResumen  = false;
  loadingDescansos = false;
  totalPages   = 1;
  totalRecords = 0;
  currentPage  = 1;

  modalVisible = false;

  /** Adjunto que se está trayendo del backend (para bloquear su botón mientras descarga). */
  descargandoId: number | null = null;

  /** El botón "Configuración" del header se habilita solo con esta feature. */
  puedeConfigurar = false;

  private destroy$ = new Subject<void>();

  constructor(
    private svc         : MiSaludService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr         : ChangeDetectorRef,
    private route       : ActivatedRoute,
    private router      : Router,
    private navigationService: NavigationService,
  ) {}

  ngOnInit(): void {
    this.puedeConfigurar = this.navigationService.isFeatureAllowed(FEATURE_CONFIGURACION);
    this.loadResumen();
    this.loadDescansos(1);
    // Atajo desde el boletín (?nuevo=1): abre el formulario directo, sin pasos extra.
    if (this.route.snapshot.queryParamMap.get('nuevo') === '1') {
      this.abrirModal();
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadResumen(): void {
    this.loadingResumen = true;
    this.loaderService.show();
    this.svc.getResumen().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.resumen        = r;
        this.loadingResumen = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingResumen = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  loadDescansos(page: number): void {
    this.loadingDescansos = true;
    this.svc.getDescansos(page).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: PagedResponseDTO<MiDescansoDto>) => {
        this.descansos       = res.data;
        this.currentPage     = res.page;
        this.totalPages      = Math.max(res.totalPages, 1);
        this.totalRecords    = res.totalRecords;
        this.loadingDescansos = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDescansos = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  onPageChange(p: number): void { this.loadDescansos(p); }

  /**
   * Abre el certificado médico. El archivo vive en la carpeta de SharePoint configurada y lo
   * sirve el backend, que lo baja con su token de app: así el trabajador lo ve aunque no tenga
   * sesión de Microsoft 365 en el navegador.
   */
  verCertificado(adj: MiDescansoAdjuntoDto): void {
    if (this.descargandoId !== null) return;
    this.descargandoId = adj.id;
    this.loaderService.show();
    this.cdr.detectChanges();

    this.svc.getCertificado(adj.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        this.descargandoId = null;
        this.loaderService.hide();
        abrirCertificado(blob, adj.nombre);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.descargandoId = null;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  irAConfiguracion(): void {
    if (!this.puedeConfigurar) return;
    this.router.navigate(['/ssoma/salud-ocupacional/mi-salud/configuracion']);
  }

  abrirModal(): void  { this.modalVisible = true;  this.cdr.detectChanges(); }
  cerrarModal(): void { this.modalVisible = false; this.cdr.detectChanges(); }

  onGuardado(): void {
    this.cerrarModal();
    this.loadResumen();
    this.loadDescansos(1);
  }

  estadoClass(estado: string | null): string {
    const m: Record<string, string> = {
      'Pendiente':   'badge-amber',
      'En Revisión': 'badge-blue',
      'Aprobado':    'badge-green',
      'Rechazado':   'badge-red',
      'Vencido':     'badge-gray',
    };
    return m[estado ?? ''] ?? 'badge-gray';
  }

  aptitudClass(aptitud: string | null): string {
    if (aptitud === 'Apto') return 'chip-green';
    if (aptitud === 'Apto con Restricciones') return 'chip-amber';
    if (aptitud === 'No Apto') return 'chip-red';
    if (aptitud === 'Observado') return 'chip-orange';
    return 'chip-gray';
  }

  diasClass(dias: number | null): string {
    if (dias == null) return 'chip-gray';
    if (dias <= 0)   return 'chip-red';
    if (dias <= 30)  return 'chip-amber';
    return 'chip-green';
  }
}
