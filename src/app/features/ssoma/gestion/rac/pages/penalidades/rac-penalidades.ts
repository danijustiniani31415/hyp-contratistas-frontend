import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RacService } from '../../services/rac.service';
import {
  PenalidadListItemDto,
  PenalidadListQuery,
  PenalidadDetalleDto,
  PenalidadDescargaRequest,
  PenalidadResolverRequest,
  RacPagedResult,
} from '../../dtos/rac.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';

import { RAC_TABS } from '../../rac-tabs';
@Component({
  selector: 'app-rac-penalidades',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, FabButton, FilterTriggerButton, FilterModal, SearchSelect, Paginator],
  templateUrl: './rac-penalidades.html',
  styleUrl: './rac-penalidades.css',
})
export class RacPenalidades implements OnInit {
  readonly tabs = RAC_TABS;
  result: RacPagedResult<PenalidadListItemDto> | null = null;
  loading = false;

  readonly anioActual = new Date().getFullYear();

  filtroEstado = '';
  filtroProyectoId: number | undefined = undefined;
  filtrosAbiertos = false;

  readonly estadoFilterOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'EnEvaluacion', label: 'En evaluación' },
    { value: 'DescargoPresentado', label: 'Descargo presentado' },
    { value: 'Aplicada', label: 'Aplicada' },
    { value: 'Anulada', label: 'Anulada' },
  ];

  get filtrosActivos(): number {
    return this.filtroEstado ? 1 : 0;
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.load();
  }

  penalidadSeleccionada: PenalidadDetalleDto | null = null;
  loadingDetalle = false;
  mostrarModal = false;

  descargoTexto = '';
  resolucionTexto = '';
  resolucionTipo = '';
  guardandoAccion = false;

  documentoArchivo: File | null = null;
  documentoUrl: string | null = null;
  subiendoDocumento = false;

  query: PenalidadListQuery = { page: 1, pageSize: 20 };

  constructor(
    private racService: RacService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    const q: PenalidadListQuery = {
      ...this.query,
      estado: this.filtroEstado || undefined,
      page: 1,
    };
    this.query = q;
    this.racService.getPenalidadList(q).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  cambiarPagina(p: number): void {
    if (p < 1 || (this.result && p > this.result.totalPages)) return;
    this.query = { ...this.query, page: p };
    this.load();
  }

  get puedeDescargar(): boolean {
    return this.descargoTexto.trim().length >= 10 && !!this.documentoUrl && !this.guardandoAccion;
  }

  seleccionarDocumento(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.penalidadSeleccionada) return;
    this.documentoArchivo = file;
    this.documentoUrl = null;
    this.subirDocumento();
  }

  subirDocumento(): void {
    if (!this.documentoArchivo || !this.penalidadSeleccionada || this.subiendoDocumento) return;
    this.subiendoDocumento = true;
    this.cdr.detectChanges();
    this.racService.subirFoto(this.penalidadSeleccionada.racId, this.documentoArchivo, 'Descargo').subscribe({
      next: (res) => {
        this.documentoUrl = res.url;
        this.subiendoDocumento = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.subiendoDocumento = false;
        Swal.fire('Error', 'No se pudo subir el documento', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  abrirDetalle(id: number): void {
    this.loadingDetalle = true;
    this.mostrarModal = true;
    this.penalidadSeleccionada = null;
    this.descargoTexto = '';
    this.resolucionTexto = '';
    this.resolucionTipo = '';
    this.documentoArchivo = null;
    this.documentoUrl = null;
    this.subiendoDocumento = false;
    this.cdr.detectChanges();
    this.racService.getPenalidadDetalle(id).subscribe({
      next: (p) => {
        this.penalidadSeleccionada = p;
        this.loadingDetalle = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingDetalle = false;
        this.mostrarModal = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.penalidadSeleccionada = null;
    this.cdr.detectChanges();
  }

  presentarDescargo(): void {
    if (!this.penalidadSeleccionada || !this.puedeDescargar) return;
    const req: PenalidadDescargaRequest = {
      descargoTexto: this.descargoTexto.trim(),
      documentoUrl: this.documentoUrl!,
    };
    this.guardandoAccion = true;
    this.racService.presentarDescargo(this.penalidadSeleccionada.id, req).subscribe({
      next: () => {
        this.guardandoAccion = false;
        Swal.fire('Descargo presentado', '', 'success');
        this.cerrarModal();
        this.load();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.guardandoAccion = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  resolver(tipo: 'Aplicada' | 'Anulada'): void {
    if (!this.penalidadSeleccionada) return;
    Swal.fire({
      title: tipo === 'Aplicada' ? '¿Aplicar penalidad?' : '¿Anular penalidad?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: tipo === 'Aplicada' ? '#b91c1c' : '#2e7d32',
    }).then((result) => {
      if (!result.isConfirmed) return;
      const req: PenalidadResolverRequest = {
        tipo,
        resolucionTexto: this.resolucionTexto || undefined,
      };
      this.guardandoAccion = true;
      this.racService.resolverPenalidad(this.penalidadSeleccionada!.id, req).subscribe({
        next: () => {
          this.guardandoAccion = false;
          Swal.fire('Listo', `Penalidad ${tipo.toLowerCase()}`, 'success');
          this.cerrarModal();
          this.load();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.guardandoAccion = false;
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  irARac(racId: number): void {
    this.router.navigate(['/ssoma/gestion/rac', racId]);
  }

  irANuevo(): void {
    this.router.navigate(['/ssoma/gestion/rac/nuevo']);
  }

  estadoPenalClass(est: string): string {
    switch (est) {
      case 'EnEvaluacion':       return 'pen-evaluacion';
      case 'DescargoPresentado': return 'pen-descargo';
      case 'Aplicada':           return 'pen-aplicada';
      case 'Anulada':            return 'pen-anulada';
      default:                   return '';
    }
  }
}
