import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Roles } from '../../../../core/constants/roles';
import { EvaluacionService } from '../../services/evaluacion.service';
import { EvalSupervisorListDto } from '../../dtos/evaluacion.model';
import { EvalForm } from './components/eval-form/eval-form';

@Component({
  selector: 'app-hab-evaluacion-supervisores',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, EvalForm],
  templateUrl: './evaluacion-supervisores.html',
  styleUrl: './evaluacion-supervisores.css',
})
export class EvaluacionSupervisores implements OnInit, OnDestroy {
  readonly pageSize = 20;

  evaluaciones: EvalSupervisorListDto[] = [];
  loading = false;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;

  filtroMes: number | null = null;
  filtroAnio: number = new Date().getFullYear();
  filtroProyectoId: number | null = null;

  modalNuevoOpen = false;

  meses = [
    { num: 1, label: 'Enero' },
    { num: 2, label: 'Febrero' },
    { num: 3, label: 'Marzo' },
    { num: 4, label: 'Abril' },
    { num: 5, label: 'Mayo' },
    { num: 6, label: 'Junio' },
    { num: 7, label: 'Julio' },
    { num: 8, label: 'Agosto' },
    { num: 9, label: 'Septiembre' },
    { num: 10, label: 'Octubre' },
    { num: 11, label: 'Noviembre' },
    { num: 12, label: 'Diciembre' },
  ];

  private filterChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private evalService: EvaluacionService,
    private authService: AuthService,
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

  isAdmin(): boolean {
    return (
      this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA) ||
      this.authService.hasRole(Roles.ADMINISTRADOR_UDP)
    );
  }

  load(page: number = this.currentPage): void {
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      mes: this.filtroMes ?? undefined,
      anio: this.filtroAnio || undefined,
      proyectoId: this.filtroProyectoId ?? undefined,
    };
    this.evalService.getEvaluaciones(params).subscribe({
      next: (res) => {
        this.evaluaciones = res.data ?? [];
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

  abrirNuevo(): void {
    this.modalNuevoOpen = true;
  }

  closeNuevo(): void {
    this.modalNuevoOpen = false;
  }

  onSaved(): void {
    this.modalNuevoOpen = false;
    this.load(this.currentPage);
  }

  notaChip(nota?: number): string {
    if (nota === undefined || nota === null) return 'chip-gray';
    if (nota >= 8) return 'chip-green';
    if (nota >= 5) return 'chip-orange';
    return 'chip-red';
  }

  getMesLabel(num: number): string {
    return this.meses.find((m) => m.num === num)?.label ?? String(num);
  }
}
