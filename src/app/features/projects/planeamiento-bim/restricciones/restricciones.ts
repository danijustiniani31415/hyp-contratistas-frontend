import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { AbrilPageHeaderComponent, SsomaHeaderBtn } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { ProjectResidentService } from '../../../../core/services/projectResident.service';
import { ProjectSimpleDTO } from '../../../../core/dtos/project/projectSimple.model';
import { PROJECTS_TABS } from '../../shared/projects-tabs';
import { PlaneamientoBimService } from '../services/planeamiento-bim.service';
import { RestriccionDto } from '../dtos/planeamiento-bim-restriccion.dto';
import { NivelConfigDTO, SectorConfigDTO, ZonaConfigDTO } from '../dtos/planeamiento-bim-config.dto';
import { ActividadCatalogoDto } from '../dtos/planeamiento-bim-carga-diaria.dto';
import { PlaneamientoBimSubnavComponent } from '../shared/planeamiento-bim-subnav/planeamiento-bim-subnav';

function hoyISO(): string {
  return new Date().toISOString().split('T')[0];
}

@Component({
  selector: 'app-restricciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    PlaneamientoBimSubnavComponent,
    BaseModal,
    SearchSelect,
  ],
  templateUrl: './restricciones.html',
  styleUrl: './restricciones.css',
})
export class Restricciones implements OnInit {
  readonly tabs = PROJECTS_TABS;
  projects: ProjectSimpleDTO[] = [];
  selectedProjectId: number | null = null;

  restricciones: RestriccionDto[] = [];
  soloActivos: boolean = false;

  loadingProjects = false;
  loadingRestricciones = false;
  savingRestriccion = false;
  loadError: string | null = null;

  // ── Catálogo de ubicación (Zona/Nivel/Sector/Actividad) del formulario ──
  // Se carga una sola vez por proyecto, al abrir el modal (no en la selección de
  // proyecto ni en el listado), reutilizando GET carga-diaria (trae zonas+actividades
  // en una sola llamada, igual que ya hace Dashboard para evidencias).
  zonasCatalogo: ZonaConfigDTO[] = [];
  actividadesCatalogo: ActividadCatalogoDto[] = [];
  loadingCatalogos = false;
  catalogoError: string | null = null;
  private catalogoProjectId: number | null = null;

  // Modal State
  showModal = false;
  modalMode: 'CREATE' | 'EDIT' = 'CREATE';
  editingId: number | null = null;

  formDescripcion: string = '';
  formEstado: string = 'ABIERTO'; // "ABIERTO" | "EN_GESTION"
  formFechaLevantamientoPrevista: string | null = null;
  formZonaId: number | null = null;
  formNivelId: number | null = null;
  formSectorId: number | null = null;
  formActividadId: number | null = null;

  readonly btnCrearHeader: SsomaHeaderBtn = {
    label: 'Nueva Restricción',
    icono: 'ti ti-plus',
  };

  constructor(
    private bimService: PlaneamientoBimService,
    private projectResidentService: ProjectResidentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarProyectos();
  }

  cargarProyectos(): void {
    this.loadingProjects = true;
    this.loadError = null;

    this.projectResidentService.getProjectsDescription().subscribe({
      next: (res) => {
        this.projects = (res || []).sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.loadingProjects = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingProjects = false;
        this.handleError(err, 'No se pudo cargar la lista de proyectos.');
        this.cdr.detectChanges();
      },
    });
  }

  onProjectChange(projectId: number | null): void {
    if (!projectId) return;
    this.selectedProjectId = Number(projectId);
    this.cargarRestricciones();
  }

  cargarRestricciones(): void {
    if (!this.selectedProjectId) return;

    this.loadingRestricciones = true;
    this.loadError = null;
    this.cdr.detectChanges();

    this.bimService.getRestricciones(this.selectedProjectId, this.soloActivos).subscribe({
      next: (data) => {
        this.restricciones = data || [];
        this.loadingRestricciones = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingRestricciones = false;
        this.handleError(err, 'No se pudo cargar el listado de restricciones.');
        this.cdr.detectChanges();
      },
    });
  }

  toggleSoloActivos(): void {
    this.soloActivos = !this.soloActivos;
    if (this.selectedProjectId) {
      this.cargarRestricciones();
    }
  }

  /**
   * REGLA CLAVE RESTRICCIONES:
   * "activo" se determina estrictamente por fechaCierre === null (NUNCA por estado).
   */
  esActivo(r: RestriccionDto): boolean {
    return r.fechaCierre === null;
  }

  // ── Catálogo de ubicación (cascada Zona → Nivel → Sector, + Actividad) ──
  get nivelesDisponibles(): NivelConfigDTO[] {
    return this.zonasCatalogo.find((z) => z.id === this.formZonaId)?.niveles || [];
  }

  get sectoresDisponibles(): SectorConfigDTO[] {
    return this.nivelesDisponibles.find((n) => n.id === this.formNivelId)?.sectores || [];
  }

  onFormZonaChange(zonaId: number | null): void {
    this.formZonaId = zonaId;
    this.formNivelId = null;
    this.formSectorId = null;
  }

  onFormNivelChange(nivelId: number | null): void {
    this.formNivelId = nivelId;
    this.formSectorId = null;
  }

  private cargarCatalogoUbicacion(projectId: number): void {
    // Ya cargado para este proyecto: no repetir la llamada (1 GET por apertura de modal, no por proyecto).
    if (this.catalogoProjectId === projectId && (this.zonasCatalogo.length > 0 || this.actividadesCatalogo.length > 0)) {
      return;
    }

    this.loadingCatalogos = true;
    this.catalogoError = null;
    this.cdr.detectChanges();

    this.bimService.getCargaDiaria(projectId, hoyISO()).subscribe({
      next: (data) => {
        this.zonasCatalogo = (data.zonas || []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
        this.actividadesCatalogo = (data.actividades || []).slice().sort((a, b) => a.orden - b.orden);
        this.catalogoProjectId = projectId;
        this.loadingCatalogos = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCatalogos = false;
        this.catalogoError = 'No se pudo cargar el catálogo de zonas, niveles, sectores y actividades. Puede guardar la restricción sin especificar ubicación, o reintentar.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Modales y Formulario ─────────────────────────────────────
  openCreateModal(): void {
    if (!this.selectedProjectId) {
      Swal.fire({
        icon: 'warning',
        title: 'Selección requerida',
        text: 'Por favor, seleccione un proyecto antes de registrar una restricción.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    this.modalMode = 'CREATE';
    this.editingId = null;
    this.formDescripcion = '';
    this.formEstado = 'ABIERTO';
    this.formFechaLevantamientoPrevista = null;
    this.formZonaId = null;
    this.formNivelId = null;
    this.formSectorId = null;
    this.formActividadId = null;
    this.showModal = true;
    this.cargarCatalogoUbicacion(this.selectedProjectId);
    this.cdr.detectChanges();
  }

  openEditModal(r: RestriccionDto): void {
    if (!this.esActivo(r)) {
      Swal.fire({
        icon: 'info',
        title: 'Restricción Cerrada',
        text: 'Esta restricción ya fue levantada/cerrada y no se puede editar.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    this.modalMode = 'EDIT';
    this.editingId = r.id;
    this.formDescripcion = r.descripcion;
    // Si el estado en BD es CERRADO por algún motivo erróneo, fallback a EN_GESTION
    this.formEstado = r.estado === 'CERRADO' ? 'EN_GESTION' : r.estado;
    this.formFechaLevantamientoPrevista = r.fechaLevantamientoPrevista;
    this.formZonaId = r.zonaId;
    this.formNivelId = r.nivelId;
    this.formSectorId = r.sectorId;
    this.formActividadId = r.actividadId;
    this.showModal = true;
    if (this.selectedProjectId) this.cargarCatalogoUbicacion(this.selectedProjectId);
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.formDescripcion = '';
    this.formEstado = 'ABIERTO';
    this.formFechaLevantamientoPrevista = null;
    this.formZonaId = null;
    this.formNivelId = null;
    this.formSectorId = null;
    this.formActividadId = null;
    this.editingId = null;
    this.cdr.detectChanges();
  }

  saveModal(): void {
    if (!this.formDescripcion || !this.formDescripcion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Descripción requerida',
        text: 'Por favor ingrese la descripción de la restricción.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    if (this.formEstado !== 'ABIERTO' && this.formEstado !== 'EN_GESTION') {
      Swal.fire({
        icon: 'warning',
        title: 'Estado inválido',
        text: 'El estado de la restricción solo puede ser "ABIERTO" o "EN GESTIÓN".',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    this.savingRestriccion = true;
    this.cdr.detectChanges();

    const payload = {
      descripcion: this.formDescripcion.trim(),
      estado: this.formEstado,
      fechaLevantamientoPrevista: this.formFechaLevantamientoPrevista || null,
      zonaId: this.formZonaId,
      nivelId: this.formNivelId,
      sectorId: this.formSectorId,
      actividadId: this.formActividadId,
    };

    if (this.modalMode === 'CREATE') {
      if (!this.selectedProjectId) return;
      this.bimService.createRestriccion(this.selectedProjectId, payload).subscribe({
        next: () => {
          this.savingRestriccion = false;
          this.closeModal();
          Swal.fire({
            icon: 'success',
            title: 'Restricción registrada',
            text: 'La restricción ha sido creada exitosamente.',
            timer: 1800,
            showConfirmButton: false,
          });
          this.cargarRestricciones();
        },
        error: (err: HttpErrorResponse) => {
          this.savingRestriccion = false;
          this.handleError(err, 'No se pudo registrar la restricción.');
          this.cdr.detectChanges();
        },
      });
    } else {
      if (!this.editingId) return;
      this.bimService.updateRestriccion(this.editingId, payload).subscribe({
        next: () => {
          this.savingRestriccion = false;
          this.closeModal();
          Swal.fire({
            icon: 'success',
            title: 'Restricción actualizada',
            text: 'Los cambios han sido guardados exitosamente.',
            timer: 1800,
            showConfirmButton: false,
          });
          this.cargarRestricciones();
        },
        error: (err: HttpErrorResponse) => {
          this.savingRestriccion = false;
          this.handleError(err, 'No se pudo actualizar la restricción.');
          this.cdr.detectChanges();
        },
      });
    }
  }

  cerrarRestriccion(r: RestriccionDto): void {
    if (!this.esActivo(r)) {
      Swal.fire({
        icon: 'info',
        title: 'Ya Cerrada',
        text: 'Esta restricción ya fue cerrada previamente.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    Swal.fire({
      title: '¿Cerrar restricción?',
      text: `¿Está seguro de cerrar la restricción: "${r.descripcion}"? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1E3A5F',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'Sí, cerrar restricción',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loadingRestricciones = true;
        this.cdr.detectChanges();

        this.bimService.cerrarRestriccion(r.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Restricción Cerrada',
              text: 'La restricción se ha cerrado correctamente.',
              timer: 1800,
              showConfirmButton: false,
            });
            this.cargarRestricciones();
          },
          error: (err: HttpErrorResponse) => {
            this.loadingRestricciones = false;
            this.handleError(err, 'No se pudo cerrar la restricción.');
            this.cdr.detectChanges();
          },
        });
      }
    });
  }

  // ── Manejo Distinguible de Errores (F9) ────────────────────────
  private handleError(err: HttpErrorResponse, defaultMsg: string): void {
    let title = 'Error';
    let message = defaultMsg;

    if (err.status === 401) {
      title = 'Sesión Expirada (401)';
      message = 'Su sesión no es válida o ha caducado. Por favor vuelva a iniciar sesión.';
    } else if (err.status === 403) {
      title = 'Acceso Denegado (403)';
      message = 'No tiene permisos suficientes para realizar esta acción en el sistema.';
    } else if (err.status === 409) {
      title = 'Conflicto (409)';
      message = err.error?.message || 'La restricción indicada ya se encuentra cerrada o en un estado no modificable.';
    } else if (err.status === 404) {
      title = 'No Encontrado (404)';
      message = err.error?.message || 'El recurso solicitado no fue encontrado.';
    } else if (err.status === 400) {
      title = 'Solicitud Inválida (400)';
      message = err.error?.message || 'Los datos enviados son inválidos. Verifique la descripción y el estado.';
    } else if (err.error?.message) {
      message = err.error.message;
    }

    this.loadError = `${title}: ${message}`;

    Swal.fire({
      icon: 'error',
      title: title,
      text: message,
      confirmButtonColor: '#1E3A5F',
    });
  }
}
