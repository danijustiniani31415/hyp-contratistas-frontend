import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuditoriaHabService } from '../../services/auditoria.service';
import { AuditoriaCambioDto } from '../../dtos/auditoria.model';

@Component({
  selector: 'app-hab-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator],
  templateUrl: './auditoria.html',
  styleUrl: './auditoria.css',
})
export class Auditoria implements OnInit, OnDestroy {
  readonly pageSize = 25;

  items: AuditoriaCambioDto[] = [];
  loading = false;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;

  filtroTabla = '';
  filtroAccion = '';
  filtroDesde = '';
  filtroHasta = '';
  filtroUsuario = '';

  detalleOpen: AuditoriaCambioDto | null = null;
  detalleAnterior = '';
  detalleNuevo = '';

  tablaOptions = [
    { id: '', label: 'Todas las tablas' },
    { id: 'ss_hab_trabajador', label: 'Trabajador' },
    { id: 'ss_hab_empresa', label: 'Empresa' },
    { id: 'ss_hab_equipo', label: 'Equipo' },
    { id: 'ss_sctr_vidaley', label: 'SCTR / Vida Ley' },
    { id: 'ss_empresa_contratista', label: 'Empresa contratista' },
    { id: 'ss_equipo', label: 'Equipo (catálogo)' },
    { id: 'ss_induccion', label: 'Inducción' },
    { id: 'ss_eval_supervisor', label: 'Evaluación supervisor' },
  ];

  private filterChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private auditoriaService: AuditoriaHabService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.filterChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.load(1));
    this.load(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(page: number = this.currentPage): void {
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      tabla: this.filtroTabla || undefined,
      accion: this.filtroAccion || undefined,
      desde: this.filtroDesde || undefined,
      hasta: this.filtroHasta || undefined,
      usuarioNombre: this.filtroUsuario.trim() || undefined,
    };
    this.auditoriaService.getAuditoria(params).subscribe({
      next: (res) => {
        this.items = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
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

  onFilter(): void {
    this.filterChange$.next();
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  verCambios(item: AuditoriaCambioDto): void {
    this.detalleOpen = item;
    this.detalleAnterior = this.formatJson(item.datosAnteriores);
    this.detalleNuevo = this.formatJson(item.datosNuevos);
  }

  closeDetalle(): void {
    this.detalleOpen = null;
    this.detalleAnterior = '';
    this.detalleNuevo = '';
  }

  private formatJson(raw?: string): string {
    if (!raw) return '—';
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }

  accionChip(accion: string): string {
    switch (accion) {
      case 'INSERT':
        return 'chip-green';
      case 'UPDATE':
        return 'chip-orange';
      case 'DELETE':
        return 'chip-red';
      default:
        return 'chip-gray';
    }
  }
}
