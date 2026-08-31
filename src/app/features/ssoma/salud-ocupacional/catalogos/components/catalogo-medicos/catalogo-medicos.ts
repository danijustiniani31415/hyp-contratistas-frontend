import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import { ClinicaSimpleDto, MedicoSimpleDto } from '../../../dtos/catalogos.model';
import { MedicoForm } from '../medico-form/medico-form';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { FirmaDigitalPad } from '../firma-digital-pad/firma-digital-pad';

interface FilterOption {
  id: string | number;
  nombre: string;
}

@Component({
  selector: 'app-catalogo-medicos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Paginator,
    SearchSelect,
    MedicoForm,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    StatusBadge,
    TitleCasePipe,
    AbrilBulkActionDirective,
    FirmaDigitalPad,
  ],
  templateUrl: './catalogo-medicos.html',
  styleUrl: './catalogo-medicos.css',
})
export class CatalogoMedicos implements OnInit, OnDestroy {
  readonly pageSize = 15;

  filters = {
    search: '',
    estado: '' as '' | 'activo' | 'inactivo',
    clinicaId: 0 as number,
  };

  all: MedicoSimpleDto[] = [];
  filtered: MedicoSimpleDto[] = [];
  pageItems: MedicoSimpleDto[] = [];

  clinicas: ClinicaSimpleDto[] = [];
  clinicaOptions: FilterOption[] = [{ id: 0, nombre: 'Todas las clínicas' }];

  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  formOpen = false;
  formMode: 'create' | 'edit' = 'create';
  formInitial: MedicoSimpleDto | null = null;

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

    this.service.listClinicas().subscribe({
      next: (res) => {
        this.clinicas = res ?? [];
        this.clinicaOptions = [
          { id: 0, nombre: 'Todas las clínicas' },
          ...this.clinicas.map((c) => ({ id: c.id, nombre: c.nombre })),
        ];
        this.cdr.detectChanges();
      },
    });
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.listMedicos().subscribe({
      next: (res) => {
        this.all = res ?? [];
        this.applyFilters(1);
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

  applyFilters(page: number): void {
    const q = this.filters.search.trim().toLowerCase();
    const estado = this.filters.estado;
    const clinicaId = this.filters.clinicaId;
    this.filtered = this.all.filter((m) => {
      if (estado === 'activo' && !m.activo) return false;
      if (estado === 'inactivo' && m.activo) return false;
      if (clinicaId && m.clinicaId !== clinicaId) return false;
      if (!q) return true;
      return (
        m.apellidoNombre.toLowerCase().includes(q) ||
        (m.cmp ?? '').toLowerCase().includes(q) ||
        (m.especialidad ?? '').toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q)
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
    this.filters = { search: '', estado: '', clinicaId: 0 };
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

  openEdit(item: MedicoSimpleDto): void {
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

  toggleActivo(item: MedicoSimpleDto): void {
    const next = !item.activo;
    Swal.fire({
      icon: 'question',
      title: next ? '¿Activar médico?' : '¿Desactivar médico?',
      text: item.apellidoNombre,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.service
        .updateMedico(item.id, {
          apellidoNombre: item.apellidoNombre,
          dni: item.dni ?? null,
          cmp: item.cmp ?? null,
          especialidad: item.especialidad ?? null,
          clinicaId: item.clinicaId ?? null,
          email: item.email ?? null,
          celular: item.celular ?? null,
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

  firmaPadOpen = false;
  medicoFirmaPadId: number | null = null;

  /** Paso 1 del flujo de firma: dibujar la firma digital, la que se imprime en el
   * SSO-FO-149 junto al recuadro de comparación manuscrita. */
  abrirFirmaDigital(item: MedicoSimpleDto): void {
    this.medicoFirmaPadId = item.id;
    this.firmaPadOpen = true;
  }

  onFirmaDigitalSaved(): void {
    this.firmaPadOpen = false;
  }

  onFirmaDigitalClosed(): void {
    this.firmaPadOpen = false;
  }

  /** Paso 3: subir el SSO-FO-149 ya impreso (con la firma digital), firmado a mano al
   * costado, y escaneado — requisito junto con la firma digital para poder definir el PIN. */
  subirAutorizacionEscaneada(item: MedicoSimpleDto, input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.loaderService.show();
    this.service.subirAutorizacionFirmada(item.id, file).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Autorización escaneada subida', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** El propio médico define su PIN de firma (distinto de su password de Microsoft),
   * exigido junto con la reautenticación de Microsoft al autorizar convalidaciones. */
  configurarPinFirma(item: MedicoSimpleDto): void {
    Swal.fire({
      icon: 'question',
      title: 'Configurar PIN de firma',
      html: `Define el PIN de firma de <b>${item.apellidoNombre}</b>. Debe conocerlo únicamente él/ella.`,
      input: 'password',
      inputPlaceholder: 'Nuevo PIN (mínimo 4 dígitos)',
      inputAttributes: { maxlength: '10', autocapitalize: 'off', autocorrect: 'off' },
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) return 'Ingresa el PIN.';
        if (value.length < 4) return 'El PIN debe tener al menos 4 dígitos.';
        return undefined;
      },
    }).then((res) => {
      if (!res.isConfirmed || !res.value) return;
      this.loaderService.show();
      this.service.setPinFirma(item.id, res.value).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'PIN configurado', timer: 1500, showConfirmButton: false });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  /** SSO-FO-149 — autorización de firma electrónica para imprimir, firmar a mano y
   * volver a subir escaneada. */
  descargarAutorizacionFirma(item: MedicoSimpleDto): void {
    this.loaderService.show();
    this.service.descargarAutorizacionFirmaPdf(item.id).subscribe({
      next: (blob) => {
        this.loaderService.hide();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Autorizacion_Firma_${item.apellidoNombre.replace(/\s+/g, '_')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.estado || this.filters.clinicaId);
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.search) n++;
    if (this.filters.estado) n++;
    if (this.filters.clinicaId) n++;
    return n;
  }
}
