import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { BaseModal } from '../../../shared/components/base-modal/base-modal';
import { ClientPager } from '../../../shared/utils/client-pager';
import Swal from 'sweetalert2';
import { ArquitecturaComercialService } from '../../../core/services/arquitectura-comercial.service';
import {
  PlantillaActividadDTO,
  CreatePlantillaBody,
  PatchPlantillaBody,
  AcCategoriaDTO,
  AcEspecialidadDTO,
  AcEtapaDTO,
} from '../../../core/dtos/arquitectura-comercial/actividades.model';

import { AC_TABS } from '../shared/arquitectura-comercial-tabs';
type TipoFiltro = '' | 'HITO' | 'ENTREGABLE' | 'CONSULTA';
type ActivoFiltro = 'todos' | 'activas' | 'inactivas';

@Component({
  selector: 'app-arq-comercial-plantilla',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    Paginator,
    BaseModal,
  ],
  templateUrl: './plantilla.html',
  styleUrl: './plantilla.css',
})
export class Plantilla implements OnInit {
  readonly tabs = AC_TABS;
  anioActual = new Date().getFullYear();
  plantilla: PlantillaActividadDTO[] = [];
  categorias: AcCategoriaDTO[] = [];
  especialidades: AcEspecialidadDTO[] = [];
  etapas: AcEtapaDTO[] = [];

  tipoFiltro: TipoFiltro = '';
  etapaIdFiltro: number | null = null;
  activoFiltro: ActivoFiltro = 'todos';
  searchText = '';
  filtrosAbiertos = false;

  readonly tipoOptions = [
    { value: 'HITO', label: 'Hito' },
    { value: 'ENTREGABLE', label: 'Entregable' },
    { value: 'CONSULTA', label: 'Consulta' },
  ];
  readonly activoFiltroOptions: Array<{ value: ActivoFiltro; label: string }> = [
    { value: 'todos', label: 'Activas e inactivas' },
    { value: 'activas', label: 'Solo activas' },
    { value: 'inactivas', label: 'Solo inactivas' },
  ];

  private readonly pager = new ClientPager<PlantillaActividadDTO>();

  loading = false;

  showModal = false;
  form: CreatePlantillaBody = this.emptyForm();

  constructor(
    private service: ArquitecturaComercialService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadRefData();
    this.loadPlantilla();
  }

  loadRefData(): void {
    this.service.getCategorias().subscribe({
      next: data => { this.categorias = data; this.cdr.detectChanges(); },
      error: () => this.showError('No se pudieron cargar las categorías'),
    });
    this.service.getEspecialidades().subscribe({
      next: data => { this.especialidades = data; this.cdr.detectChanges(); },
      error: () => this.showError('No se pudieron cargar las especialidades'),
    });
    this.service.getEtapas().subscribe({
      next: data => { this.etapas = data; this.cdr.detectChanges(); },
      error: () => this.showError('No se pudieron cargar las etapas'),
    });
  }

  loadPlantilla(): void {
    this.loading = true;
    this.service.getPlantilla().subscribe({
      next: data => {
        this.plantilla = data;
        this.pager.reset();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.showError('No se pudo cargar la plantilla');
      },
    });
  }

  get filteredPlantilla(): PlantillaActividadDTO[] {
    return this.plantilla.filter(p => {
      if (this.searchText.trim() && !p.nombre.toLowerCase().includes(this.searchText.trim().toLowerCase())) return false;
      if (this.tipoFiltro && p.tipo !== this.tipoFiltro) return false;
      if (this.etapaIdFiltro != null && p.etapaId !== this.etapaIdFiltro) return false;
      if (this.activoFiltro === 'activas' && !p.activo) return false;
      if (this.activoFiltro === 'inactivas' && p.activo) return false;
      return true;
    });
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredPlantilla);
  }

  get pagedPlantilla(): PlantillaActividadDTO[] {
    return this.pager.page(this.filteredPlantilla);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.tipoFiltro) n++;
    if (this.etapaIdFiltro != null) n++;
    if (this.activoFiltro !== 'todos') n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.tipoFiltro = '';
    this.etapaIdFiltro = null;
    this.activoFiltro = 'todos';
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  setTipo(t: TipoFiltro): void {
    this.tipoFiltro = t;
    this.onFilterChange();
  }

  patchRow(id: number, body: PatchPlantillaBody): void {
    this.service.patchPlantilla(id, body).subscribe({
      next: updated => {
        const idx = this.plantilla.findIndex(p => p.id === id);
        if (idx >= 0) {
          this.plantilla[idx] = updated;
          this.plantilla = [...this.plantilla];
        }
        this.cdr.detectChanges();
      },
      error: err => {
        const msg = err?.error?.message ?? 'No se pudo guardar el cambio';
        this.showError(msg);
      },
    });
  }

  onNombreBlur(p: PlantillaActividadDTO, event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    if (!value || value === p.nombre) return;
    this.patchRow(p.id, { nombre: value });
  }

  onOrdenBlur(p: PlantillaActividadDTO, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = raw === '' ? null : Number(raw);
    if (value === p.orden) return;
    this.patchRow(p.id, { orden: value });
  }

  onActivoToggle(p: PlantillaActividadDTO): void {
    this.patchRow(p.id, { activo: !p.activo });
  }

  openModal(): void {
    this.form = this.emptyForm();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  submitForm(): void {
    const nombre = this.form.nombre?.trim();
    if (!nombre) {
      this.showError('El nombre es requerido.');
      return;
    }

    const body: CreatePlantillaBody = {
      nombre,
      tipo: this.form.tipo || null,
      etapaId: this.form.etapaId ?? null,
      categoriaId: this.form.categoriaId ?? null,
      especialidadId: this.form.especialidadId ?? null,
      orden: this.form.orden ?? null,
      activo: this.form.activo ?? true,
    };

    this.service.createPlantilla(body).subscribe({
      next: created => {
        this.plantilla = [...this.plantilla, created].sort((a, b) => {
          const ao = a.orden ?? Number.MAX_SAFE_INTEGER;
          const bo = b.orden ?? Number.MAX_SAFE_INTEGER;
          if (ao !== bo) return ao - bo;
          return a.id - b.id;
        });
        this.showModal = false;
        this.cdr.detectChanges();
        Swal.fire({ icon: 'success', title: 'Creada', timer: 1200, showConfirmButton: false });
      },
      error: err => {
        const msg = err?.error?.message ?? 'No se pudo crear la actividad';
        this.showError(msg);
      },
    });
  }

  tipoClass(tipo: string | null): string {
    switch (tipo) {
      case 'HITO': return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
      case 'ENTREGABLE': return 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]';
      case 'CONSULTA': return 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]';
      default: return 'bg-[#E5E7EB] text-[#6B7280] border-[#E5E7EB]';
    }
  }

  etapaClass(etapa: string | null): string {
    switch (etapa) {
      case 'PREVENTA': return 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]';
      case 'OBRA': return 'bg-[#DBEAFE] text-[#1E3A8A] border-[#BFDBFE]';
      case 'EDIFICIO ENTREGADO': return 'bg-[#CCFBF1] text-[#115E59] border-[#99F6E4]';
      case 'POST VENTA Y EXPERIENCIA': return 'bg-[#FCE7F3] text-[#9D174D] border-[#FBCFE8]';
      case 'ALMACEN': return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
      default: return 'bg-[#E5E7EB] text-[#6B7280] border-[#E5E7EB]';
    }
  }

  trackByRow(_: number, p: PlantillaActividadDTO): number {
    return p.id;
  }

  private emptyForm(): CreatePlantillaBody {
    return {
      nombre: '',
      tipo: null,
      etapaId: null,
      categoriaId: null,
      especialidadId: null,
      orden: null,
      activo: true,
    };
  }

  private showError(msg: string): void {
    Swal.fire({ icon: 'error', title: 'Error', text: msg });
  }
}
