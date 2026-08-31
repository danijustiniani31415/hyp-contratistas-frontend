import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { PasoService } from '../../services/paso.service';
import { PasoEjecucionService } from '../../services/paso-ejecucion.service';
import { PasoCategoriaDto, PasoSaludActividadListItemDto, PasoSaludListQuery } from '../../dtos/paso.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { SSOMA_TABS } from '../../../shared/salud-ocupacional-tabs';

type FiltroCumplida = 'todas' | 'cumplidas' | 'nocumplidas';

@Component({
  selector: 'app-paso-salud-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect, Paginator, BaseModal],
  templateUrl: './paso-salud-lista.component.html',
  styleUrl: './paso-salud-lista.component.css',
})
export class PasoSaludListaComponent implements OnInit {
  readonly tabs = SSOMA_TABS;
  readonly anioActual = new Date().getFullYear();
  readonly meses = [
    { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' },
  ];
  readonly anios: number[];
  get aniosOpts(): { id: number; label: string }[] {
    return this.anios.map(a => ({ id: a, label: String(a) }));
  }

  proyectos: { projectId: number; projectDescription: string }[] = [];
  categorias: PasoCategoriaDto[] = [];

  filtroProyectoId: number | null = null;
  filtroCategoriaId: number | null = null;
  filtroAnio: number | null = null;
  filtroMes: number | null = null;
  filtroCumplida: FiltroCumplida = 'todas';

  items: PasoSaludActividadListItemDto[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  totalPages = 0;
  loading = false;

  accionActividad: PasoSaludActividadListItemDto | null = null;
  fechaEjecutada = '';
  observaciones = '';
  evidenciaFile: File | null = null;
  guardandoAccion = false;

  constructor(
    private pasoService: PasoService,
    private ejecucionService: PasoEjecucionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
  ) {
    const anioMin = this.anioActual - 4;
    this.anios = Array.from({ length: this.anioActual - anioMin + 1 }, (_, i) => this.anioActual - i);
  }

  ngOnInit(): void {
    this.loaderService.show();
    forkJoin({
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200 }),
      categorias: this.pasoService.getCategorias(),
    }).subscribe({
      next: ({ proyectos, categorias }) => {
        this.proyectos = proyectos.data.map(p => ({ projectId: p.projectId, projectDescription: p.projectDescription }));
        this.categorias = categorias.filter(c => c.ambito === 'Salud');
        this.loaderService.hide();
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  cargar(): void {
    this.loading = true;
    const query: PasoSaludListQuery = {
      proyectoId: this.filtroProyectoId ?? undefined,
      categoriaId: this.filtroCategoriaId ?? undefined,
      anio: this.filtroAnio ?? undefined,
      mes: this.filtroMes ?? undefined,
      cumplida: this.filtroCumplida === 'todas' ? undefined : this.filtroCumplida === 'cumplidas',
      page: this.page,
      pageSize: this.pageSize,
    };
    this.pasoService.getActividadesSalud(query).subscribe({
      next: (res) => {
        this.items = res.items;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
      },
    });
  }

  onFiltroChange(): void {
    this.page = 1;
    this.cargar();
  }

  onPageChange(page: number): void {
    this.page = page;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroProyectoId = null;
    this.filtroCategoriaId = null;
    this.filtroAnio = null;
    this.filtroMes = null;
    this.filtroCumplida = 'todas';
    this.onFiltroChange();
  }

  estadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'Ejecutado': return 'estado-badge estado-badge--ok';
      case 'Vencido': return 'estado-badge estado-badge--vencido';
      case 'Programado': return 'estado-badge estado-badge--programado';
      default: return 'estado-badge';
    }
  }

  abrirAccion(item: PasoSaludActividadListItemDto): void {
    this.accionActividad = item;
    this.fechaEjecutada = item.fechaEjecutada ?? new Date().toISOString().substring(0, 10);
    this.observaciones = item.observaciones ?? '';
    this.evidenciaFile = null;
  }

  cerrarAccion(): void {
    this.accionActividad = null;
    this.evidenciaFile = null;
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.evidenciaFile = input.files[0];
  }

  guardarAccion(): void {
    if (!this.accionActividad || !this.fechaEjecutada) return;
    this.guardandoAccion = true;
    this.ejecucionService.create({
      actividadId: this.accionActividad.actividadId,
      fechaProgramada: this.accionActividad.fechaProgramada,
      fechaEjecutada: this.fechaEjecutada,
      observaciones: this.observaciones,
    }).subscribe({
      next: (ejecucion) => {
        if (this.evidenciaFile) {
          this.ejecucionService.subirEvidencia(ejecucion.id, this.evidenciaFile).subscribe({
            next: () => this.finalizarAccion(),
            error: () => {
              Swal.fire('Advertencia', 'Se registró como cumplida, pero falló la carga de evidencia.', 'warning');
              this.finalizarAccion();
            },
          });
        } else {
          this.finalizarAccion();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoAccion = false;
        this.errorService.handleError(err);
      },
    });
  }

  private finalizarAccion(): void {
    this.guardandoAccion = false;
    this.accionActividad = null;
    this.evidenciaFile = null;
    this.cargar();
  }

  verEvidencia(url: string): void {
    window.open(url, '_blank');
  }
}
