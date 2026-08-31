import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, forkJoin, of, takeUntil } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import { ClinicaSimpleDto } from '../../../dtos/catalogos.model';
import { ClinicaForm } from '../clinica-form/clinica-form';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';

@Component({
  selector: 'app-catalogo-clinicas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Paginator,
    ClinicaForm,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    StatusBadge,
    TitleCasePipe,
    AbrilBulkActionDirective,
  ],
  templateUrl: './catalogo-clinicas.html',
  styleUrl: './catalogo-clinicas.css',
})
export class CatalogoClinicas implements OnInit, OnDestroy {
  readonly pageSize = 15;

  filters = { search: '', estado: '' as '' | 'activo' | 'inactivo' };

  all: ClinicaSimpleDto[] = [];
  filtered: ClinicaSimpleDto[] = [];
  pageItems: ClinicaSimpleDto[] = [];
  emailsMap: Map<number, string> = new Map();

  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  formOpen = false;
  formMode: 'create' | 'edit' = 'create';
  formInitial: ClinicaSimpleDto | null = null;

  filtrosAbiertos = false;
  readonly estadoFilterOptions = [
    { value: '', label: 'Todos' },
    { value: 'activo', label: 'Activos' },
    { value: 'inactivo', label: 'Inactivos' },
  ];

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters(1));
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.listClinicas().subscribe({
      next: (clinicas) => {
        this.all = clinicas ?? [];

        if (this.all.length === 0) {
          this.emailsMap = new Map();
          this.applyFilters(1);
          this.loading = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          return;
        }

        forkJoin(
          this.all.map((c) =>
            this.service.getClinicaEmails(c.id).pipe(catchError(() => of([]))),
          ),
        ).subscribe({
          next: (results) => {
            this.emailsMap = new Map(
              this.all.map((c, i) => [c.id, results[i].map((e) => e.email).join(', ')]),
            );
            this.applyFilters(1);
            this.loading = false;
            this.loaderService.hide();
            this.cdr.detectChanges();
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  applyFilters(page: number): void {
    const q = this.filters.search.trim().toLowerCase();
    const estado = this.filters.estado;
    this.filtered = this.all.filter((c) => {
      if (estado === 'activo' && !c.activo) return false;
      if (estado === 'inactivo' && c.activo) return false;
      if (!q) return true;
      const emails = this.emailsMap.get(c.id) ?? '';
      return (
        c.nombre.toLowerCase().includes(q) ||
        (c.ruc ?? '').toLowerCase().includes(q) ||
        emails.toLowerCase().includes(q)
      );
    });
    this.totalRecords = this.filtered.length;
    this.totalPages = Math.max(Math.ceil(this.totalRecords / this.pageSize), 1);
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
    const start = (this.currentPage - 1) * this.pageSize;
    this.pageItems = this.filtered.slice(start, start + this.pageSize);
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChange$.next(value);
  }

  onFilterChange(): void {
    this.applyFilters(1);
  }

  clearFilters(): void {
    this.filters = { search: '', estado: '' };
    this.applyFilters(1);
  }

  onPageChange(page: number): void {
    this.applyFilters(page);
  }

  openCreate(): void {
    this.formMode = 'create';
    this.formInitial = null;
    this.formOpen = true;
  }

  openEdit(item: ClinicaSimpleDto): void {
    this.formMode = 'edit';
    this.formInitial = item;
    this.formOpen = true;
  }

  closeForm(): void {
    this.formOpen = false;
    this.formInitial = null;
  }

  onSaved(): void {
    this.formOpen = false;
    this.formInitial = null;
    this.load();
  }

  toggleActivo(item: ClinicaSimpleDto): void {
    const next = !item.activo;
    Swal.fire({
      icon: 'question',
      title: next ? '¿Activar clínica?' : '¿Desactivar clínica?',
      text: item.nombre,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.service
        .updateClinica(item.id, {
          nombre: item.nombre,
          ruc: item.ruc ?? null,
          telefono: item.telefono ?? null,
          direccion: item.direccion ?? null,
          activo: next,
        })
        .subscribe({
          next: () => {
            this.loaderService.hide();
            this.load();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.estado);
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.search) n++;
    if (this.filters.estado) n++;
    return n;
  }

  enviarActivacion(item: ClinicaSimpleDto): void {
    const emailsRaw = this.emailsMap.get(item.id) ?? '';
    const emails = emailsRaw.split(',').map((e) => e.trim()).filter((e) => !!e);

    if (emails.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Sin emails', text: 'Esta clínica no tiene emails registrados.' });
      return;
    }

    const checkboxes = emails
      .map(
        (e, i) => `
        <label style="display:flex;align-items:center;gap:8px;margin:6px 0;font-size:0.9rem;">
          <input type="checkbox" id="email_${i}" value="${e}" checked
                 style="width:16px;height:16px;accent-color:#16a34a;">
          ${e}
        </label>`,
      )
      .join('');

    Swal.fire({
      title: 'Enviar activación de cuenta',
      html: `
        <p style="font-size:0.85rem;color:#64748b;margin-bottom:12px;">
          Selecciona los emails que recibirán el link de activación:
        </p>
        <div style="text-align:left;">${checkboxes}</div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      preConfirm: () => {
        const seleccionados: string[] = [];
        emails.forEach((e, i) => {
          const cb = document.getElementById(`email_${i}`) as HTMLInputElement;
          if (cb?.checked) seleccionados.push(e);
        });
        if (seleccionados.length === 0) {
          Swal.showValidationMessage('Selecciona al menos un email');
        }
        return seleccionados;
      },
    }).then((result) => {
      if (!result.isConfirmed || !result.value?.length) return;
      this.procesarActivaciones(item.id, item.nombre, result.value);
    });
  }

  private procesarActivaciones(clinicaId: number, clinicaNombre: string, emails: string[]): void {
    const flujos = emails.map((email) =>
      this.service.crearClinicaUsuario(clinicaId, clinicaNombre, email).pipe(
        catchError(() => of(null)),
        switchMap(() => this.service.solicitarActivacionClinica(email).pipe(catchError(() => of(null)))),
      ),
    );

    forkJoin(flujos).subscribe(() => {
      Swal.fire({
        icon: 'success',
        title: 'Activaciones enviadas',
        text: `Se enviaron ${emails.length} email(s) de activación.`,
        timer: 2500,
        showConfirmButton: false,
      });
    });
  }
}
