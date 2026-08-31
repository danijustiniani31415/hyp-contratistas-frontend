import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { AbrilPageHeaderComponent, SsomaHeaderBtn } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { ProjectResidentService } from '../../../../core/services/projectResident.service';
import { ProjectSimpleDTO } from '../../../../core/dtos/project/projectSimple.model';
import { PROJECTS_TABS } from '../../shared/projects-tabs';
import { PlaneamientoBimService } from '../services/planeamiento-bim.service';
import { PlaneamientoBimSubnavComponent } from '../shared/planeamiento-bim-subnav/planeamiento-bim-subnav';
import { PlaneamientoBimEvidenciaGaleria } from '../shared/evidencia-galeria/evidencia-galeria';
import {
  ActividadCatalogoDto,
  CargaDiariaDto,
  CausaCatalogoDto,
  CeldaDto,
} from '../dtos/planeamiento-bim-carga-diaria.dto';
import { ZonaConfigDTO } from '../dtos/planeamiento-bim-config.dto';

@Component({
  selector: 'app-carga-diaria',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    PlaneamientoBimSubnavComponent,
    BaseModal,
    PlaneamientoBimEvidenciaGaleria,
  ],
  templateUrl: './carga-diaria.html',
  styleUrl: './carga-diaria.css',
})
export class CargaDiaria implements OnInit {
  readonly tabs = PROJECTS_TABS;
  projects: ProjectSimpleDTO[] = [];
  selectedProjectId: number | null = null;
  fechaSeleccionada: string = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  cargaDiariaData: CargaDiariaDto | null = null;
  zonas: ZonaConfigDTO[] = [];
  actividades: ActividadCatalogoDto[] = [];
  causasCatalogo: CausaCatalogoDto[] = [];
  celdasMap: Map<string, CeldaDto> = new Map();

  loadingProjects = false;
  loadingCarga = false;
  savingCarga = false;
  uploadingFotos = false;
  loadError: string | null = null;

  // Modal para detalle de Causa de Incumplimiento
  showCausaModal = false;
  activeCeldaKey: string | null = null;
  activeCelda: CeldaDto | null = null;
  modalCausaId: number | null = null;
  modalCausaDetalle: string = '';

  readonly btnGuardarHeader: SsomaHeaderBtn = {
    label: 'Guardar Carga Diaria',
    icono: 'ti ti-device-floppy',
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
    this.cargarCargaDiaria();
  }

  onFechaChange(fecha: string): void {
    this.fechaSeleccionada = fecha;
    if (this.selectedProjectId) {
      this.cargarCargaDiaria();
    }
  }

  cargarCargaDiaria(): void {
    if (!this.selectedProjectId || !this.fechaSeleccionada) return;

    this.loadingCarga = true;
    this.loadError = null;
    this.cdr.detectChanges();

    this.bimService.getCargaDiaria(this.selectedProjectId, this.fechaSeleccionada).subscribe({
      next: (data) => {
        this.cargaDiariaData = data;
        this.zonas = data.zonas || [];
        this.actividades = data.actividades || [];
        this.causasCatalogo = (data.causas || []).sort((a, b) => a.orden - b.orden);
        this.inicializarMapCeldas(data.celdas || []);
        this.loadingCarga = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCarga = false;
        this.handleError(err, 'No se pudo obtener la carga diaria para la fecha seleccionada.');
        this.cdr.detectChanges();
      },
    });
  }

  /** Suma los sectores de todos los niveles de la zona (ya no cuelgan de la zona misma). */
  totalSectoresZona(zona: ZonaConfigDTO): number {
    return (zona.niveles || []).reduce((acc, n) => acc + (n.sectores?.length || 0), 0);
  }

  private getKey(zId: number, nId: number, sId: number, aId: number): string {
    return `${zId}_${nId}_${sId}_${aId}`;
  }

  private inicializarMapCeldas(celdasExistentes: CeldaDto[]): void {
    this.celdasMap.clear();
    celdasExistentes.forEach((c) => {
      const key = this.getKey(c.zonaId, c.nivelId, c.sectorId, c.actividadId);
      this.celdasMap.set(key, { ...c });
    });
  }

  getCelda(zId: number, nId: number, sId: number, aId: number): CeldaDto | undefined {
    return this.celdasMap.get(this.getKey(zId, nId, sId, aId));
  }

  getCellTitle(zId: number, nId: number, sId: number, aId: number): string {
    const celda = this.getCelda(zId, nId, sId, aId);
    if (!celda) return 'Sin cargar (clic para marcar)';
    return celda.cumplida ? 'Cumplido' : `No Cumplido: ${celda.causaNombre || 'Sin causa'}`;
  }

  toggleCumplimiento(zId: number, nId: number, sId: number, aId: number): void {
    if (!this.cargaDiariaData?.esEditable) return;

    const key = this.getKey(zId, nId, sId, aId);
    let celda = this.celdasMap.get(key);

    if (!celda) {
      // Primera vez que se interactúa con la celda: pasa a cumplida = true
      celda = {
        zonaId: zId,
        nivelId: nId,
        sectorId: sId,
        actividadId: aId,
        cumplida: true,
        causaId: null,
        causaNombre: null,
        causaDetalle: null,
      };
      this.celdasMap.set(key, celda);
    } else {
      if (celda.cumplida) {
        // Pasa de cumplida a no cumplida -> abrir modal de causa de incumplimiento
        celda.cumplida = false;
        this.openCausaModal(key, celda);
      } else {
        // Pasa de no cumplida a cumplida -> reset causa
        celda.cumplida = true;
        celda.causaId = null;
        celda.causaNombre = null;
        celda.causaDetalle = null;
      }
    }
    this.cdr.detectChanges();
  }

  // ── Modal de Causa de Incumplimiento ──────────────────────────
  openCausaModal(key: string, celda: CeldaDto): void {
    this.activeCeldaKey = key;
    this.activeCelda = celda;
    this.modalCausaId = celda.causaId || null;
    this.modalCausaDetalle = celda.causaDetalle || '';
    this.showCausaModal = true;
    this.cdr.detectChanges();
  }

  closeCausaModal(): void {
    this.showCausaModal = false;
    this.activeCeldaKey = null;
    this.activeCelda = null;
    this.cdr.detectChanges();
  }

  saveCausaModal(): void {
    if (!this.activeCelda) return;

    this.activeCelda.causaId = this.modalCausaId;
    const causaObj = this.causasCatalogo.find((c) => c.id === this.modalCausaId);
    this.activeCelda.causaNombre = causaObj ? causaObj.nombre : null;
    this.activeCelda.causaDetalle = this.modalCausaDetalle.trim() || null;

    this.closeCausaModal();
  }

  // ── Subida de Fotos Evidencias ────────────────────────────────
  onFilesSelected(files: File[]): void {
    if (!files || files.length === 0 || !this.selectedProjectId) return;

    this.uploadingFotos = true;
    this.cdr.detectChanges();

    this.bimService.subirEvidencias(this.selectedProjectId, this.fechaSeleccionada, files, 'GENERAL').subscribe({
      next: (nuevasFotos) => {
        this.uploadingFotos = false;
        if (this.cargaDiariaData) {
          if (!this.cargaDiariaData.evidencias) this.cargaDiariaData.evidencias = [];
          this.cargaDiariaData.evidencias.push(...nuevasFotos);
        }
        Swal.fire({
          icon: 'success',
          title: 'Evidencias subidas',
          text: `Se han subido ${nuevasFotos.length} fotos de evidencia.`,
          timer: 1800,
          showConfirmButton: false,
        });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.uploadingFotos = false;
        this.handleError(err, 'No se pudieron subir las evidencias fotográficas.');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Guardar Carga Diaria ─────────────────────────────────────
  onGuardar(): void {
    if (!this.selectedProjectId || !this.fechaSeleccionada) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos requeridos',
        text: 'Por favor, seleccione un proyecto y una fecha válida.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    if (this.cargaDiariaData && !this.cargaDiariaData.esEditable) {
      Swal.fire({
        icon: 'warning',
        title: 'Lectura Solamente',
        text: 'Esta fecha corresponde a un día histórico y no es editable.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    this.savingCarga = true;
    this.cdr.detectChanges();

    const celdasArray = Array.from(this.celdasMap.values()).map((c) => ({
      zonaId: c.zonaId,
      nivelId: c.nivelId,
      sectorId: c.sectorId,
      actividadId: c.actividadId,
      cumplida: c.cumplida,
      causaId: c.causaId ?? null,
      causaDetalle: c.causaDetalle ?? null,
    }));

    this.bimService.saveCargaDiaria(this.selectedProjectId, this.fechaSeleccionada, { celdas: celdasArray }).subscribe({
      next: () => {
        this.savingCarga = false;
        Swal.fire({
          icon: 'success',
          title: 'Carga Diaria Guardada',
          text: 'Se han registrado los avances diarios correctamente.',
          timer: 2000,
          showConfirmButton: false,
        });
        this.cargarCargaDiaria();
      },
      error: (err: HttpErrorResponse) => {
        this.savingCarga = false;
        this.handleError(err, 'No se pudo guardar la carga diaria.');
        this.cdr.detectChanges();
      },
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
    } else if (err.status === 404) {
      title = 'No Encontrado (404)';
      message = err.error?.message || 'El proyecto o recurso solicitado no fue encontrado.';
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
