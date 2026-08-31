import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { AbrilPageHeaderComponent, SsomaHeaderBtn } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { ProjectResidentService } from '../../../../core/services/projectResident.service';
import { ProjectSimpleDTO } from '../../../../core/dtos/project/projectSimple.model';
import { PROJECTS_TABS } from '../../shared/projects-tabs';
import { PlaneamientoBimService } from '../services/planeamiento-bim.service';
import {
  NivelConfigDTO,
  PlaneamientoBimConfigDTO,
  ResponsableBimWorkerDTO,
  SectorConfigDTO,
  TipoEstructura,
  ZonaConfigDTO,
  ZonaUpdateDto,
} from '../dtos/planeamiento-bim-config.dto';

import { PlaneamientoBimSubnavComponent } from '../shared/planeamiento-bim-subnav/planeamiento-bim-subnav';

/** Estado local de edición de una zona: además de lo que devuelve el GET, agrega los sectores
 *  compartidos (derivados) como bucket propio, separado de los exclusivos de cada nivel. */
interface ZonaEdicion extends ZonaConfigDTO {
  sectoresCompartidos: SectorConfigDTO[];
}

const TIPOS_ESTRUCTURA: { id: TipoEstructura; nombre: string }[] = [
  { id: 'SUBESTRUCTURA', nombre: 'Subestructura' },
  { id: 'SUPERESTRUCTURA', nombre: 'Superestructura' },
];

@Component({
  selector: 'app-configuracion-inicial',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, PlaneamientoBimSubnavComponent, SearchSelect],
  templateUrl: './configuracion-inicial.html',
  styleUrl: './configuracion-inicial.css',
})
export class ConfiguracionInicial implements OnInit {
  readonly tabs = PROJECTS_TABS;
  readonly tiposEstructura = TIPOS_ESTRUCTURA;
  /** Meta PPC estándar del sistema (Fase A backend) — fija, ya no se edita ni se envía desde acá. */
  readonly metaPpcEstandar = 85;
  projects: ProjectSimpleDTO[] = [];
  selectedProjectId: number | null = null;

  responsables: ResponsableBimWorkerDTO[] = [];

  config: PlaneamientoBimConfigDTO = {
    responsableId: null,
    metaPpc: null,
    zonas: [],
    fases: [],
  };

  /** Zonas en edición, con el bucket de sectoresCompartidos ya derivado del GET. */
  zonas: ZonaEdicion[] = [];

  loadingProjects = false;
  loadingConfig = false;
  savingConfig = false;
  loadError: string | null = null;
  saveError: string | null = null;

  readonly btnGuardarHeader: SsomaHeaderBtn = {
    label: 'Guardar Configuración',
    icono: 'ti ti-device-floppy',
  };

  constructor(
    private bimService: PlaneamientoBimService,
    private projectResidentService: ProjectResidentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    this.loadingProjects = true;
    this.loadError = null;

    // Llamada ultraligera a GET /api/v1/projectResident/projects
    this.projectResidentService.getProjectsDescription().subscribe({
      next: (res) => {
        this.projects = (res || []).sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.loadingProjects = false;
        this.cdr.detectChanges();

        // Cargar catálogo de responsables de Planeamiento BIM
        this.bimService.getResponsables().subscribe({
          next: (respList) => {
            this.responsables = respList || [];
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            // DEBUG: Error cargando catálogo de responsables
            this.responsables = [];
            this.cdr.detectChanges();
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loadingProjects = false;
        this.loadError = 'No se pudo cargar la lista de proyectos. Verifique su conexión.';
        this.cdr.detectChanges();
      },
    });
  }

  onProjectChange(projectId: number | null): void {
    if (!projectId) return;
    this.selectedProjectId = Number(projectId);
    this.cargarConfiguracionProyecto(this.selectedProjectId);
  }

  cargarConfiguracionProyecto(projectId: number): void {
    this.loadingConfig = true;
    this.loadError = null;
    this.cdr.detectChanges();

    this.bimService.getConfiguracion(projectId).subscribe({
      next: (data) => {
        this.config = {
          projectId: data?.projectId ?? projectId,
          responsableId: data?.responsableId ?? null,
          metaPpc: data?.metaPpc ?? null,
          zonas: data?.zonas || [],
          fases: data?.fases || [],
        };
        this.zonas = (this.config.zonas || []).map((z) => this.derivarZonaEdicion(z));
        this.loadingConfig = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingConfig = false;
        this.loadError = `Error HTTP ${err.status}: ${err.error?.message || 'No se pudo obtener la configuración inicial del proyecto.'}`;
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * A partir del shape de lectura (donde un sector compartido viene repetido bajo CADA nivel de
   * la zona), separa: sectoresCompartidos (el sector aparece, por id, en TODOS los niveles) y dentro
   * de cada nivel, solo sus sectores exclusivos (los que no están en el bucket de compartidos).
   */
  private derivarZonaEdicion(zona: ZonaConfigDTO): ZonaEdicion {
    const niveles = (zona.niveles || []).map((n) => ({ ...n, sectores: [...(n.sectores || [])] }));

    // "Compartido" solo tiene sentido si hay más de un nivel para compartir entre sí — con un único
    // nivel, `every()` se cumple trivialmente para cualquier sector de ese nivel (verdad vacía) y
    // reclasificaría como compartido TODO sector exclusivo, aunque se haya guardado bien. Bug real
    // reportado y diagnosticado en sesión 2026-08-28 (ver CONTEXT.md).
    let compartidos: SectorConfigDTO[] = [];
    if (niveles.length > 1) {
      const primerNivel = niveles[0];
      compartidos = (primerNivel.sectores || []).filter((sector) => {
        if (sector.id == null) return false; // sectores nuevos sin id no se pueden comparar entre niveles
        return niveles.every((n) => (n.sectores || []).some((s) => s.id === sector.id));
      });
    }

    const idsCompartidos = new Set(compartidos.map((s) => s.id));
    niveles.forEach((n) => {
      n.sectores = (n.sectores || []).filter((s) => !idsCompartidos.has(s.id));
    });

    return { ...zona, niveles, sectoresCompartidos: compartidos };
  }

  // ── Gestión de Zonas ─────────────────────────────────────────
  addZona(): void {
    this.zonas.push({
      id: null,
      nombre: '',
      orden: this.zonas.length + 1,
      niveles: [],
      sectoresCompartidos: [],
    });
  }

  removeZona(index: number): void {
    this.zonas.splice(index, 1);
  }

  // ── Gestión de Niveles ───────────────────────────────────────
  addNivel(zona: ZonaEdicion): void {
    if (!zona.niveles) zona.niveles = [];
    const nuevoOrden = zona.niveles.length + 1;
    zona.niveles.push({
      id: null,
      nombre: '',
      orden: nuevoOrden,
      tipoEstructura: null,
      sectores: [],
    });
  }

  removeNivel(zona: ZonaEdicion, index: number): void {
    zona.niveles.splice(index, 1);
    // Reordenar automáticamente los niveles restantes
    zona.niveles.forEach((n, idx) => (n.orden = idx + 1));
  }

  // ── Gestión de Sectores exclusivos de un Nivel ────────────────
  addSectorNivel(nivel: NivelConfigDTO): void {
    if (!nivel.sectores) nivel.sectores = [];
    nivel.sectores.push({ id: null, nombre: '' });
  }

  removeSectorNivel(nivel: NivelConfigDTO, index: number): void {
    nivel.sectores.splice(index, 1);
  }

  // ── Gestión de Sectores Compartidos de la Zona ────────────────
  addSectorCompartido(zona: ZonaEdicion): void {
    if (!zona.sectoresCompartidos) zona.sectoresCompartidos = [];
    zona.sectoresCompartidos.push({ id: null, nombre: '' });
  }

  removeSectorCompartido(zona: ZonaEdicion, index: number): void {
    zona.sectoresCompartidos.splice(index, 1);
  }

  totalSectores(zona: ZonaEdicion): number {
    const exclusivos = (zona.niveles || []).reduce((acc, n) => acc + (n.sectores?.length || 0), 0);
    return exclusivos + (zona.sectoresCompartidos?.length || 0);
  }

  // ── Guardar Configuración ────────────────────────────────────
  onGuardar(): void {
    if (!this.selectedProjectId) {
      Swal.fire({
        icon: 'warning',
        title: 'Selección requerida',
        text: 'Por favor, seleccione un proyecto antes de guardar.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    // Validar fechas de fases (fechaInicio <= fechaFinMeta)
    for (const fase of (this.config.fases || [])) {
      if (fase.fechaInicio && fase.fechaFinMeta) {
        if (new Date(fase.fechaInicio) > new Date(fase.fechaFinMeta)) {
          Swal.fire({
            icon: 'warning',
            title: 'Fechas inconsistentes en Fases',
            text: `En la fase "${fase.nombre}", la fecha de inicio meta es posterior a la fecha de fin meta.`,
            confirmButtonColor: '#1E3A5F',
          });
          return;
        }
      }
    }

    // Validar nombres de zonas + duplicados de niveles/sectores
    for (let i = 0; i < this.zonas.length; i++) {
      const z = this.zonas[i];
      if (!z.nombre || !z.nombre.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Nombre de Zona requerido',
          text: `La zona #${i + 1} no tiene un nombre asignado.`,
          confirmButtonColor: '#1E3A5F',
        });
        return;
      }

      // Niveles duplicados dentro de la misma zona
      const nombresNiveles = (z.niveles || []).map((n) => n.nombre.trim().toLowerCase()).filter((n) => n);
      const nivelDuplicado = nombresNiveles.find((n, idx) => nombresNiveles.indexOf(n) !== idx);
      if (nivelDuplicado) {
        Swal.fire({
          icon: 'warning',
          title: 'Nivel duplicado',
          text: `El nivel "${nivelDuplicado}" ya existe en la zona "${z.nombre}". Cada nivel debe tener un nombre único dentro de su zona.`,
          confirmButtonColor: '#1E3A5F',
        });
        return;
      }

      // Sectores compartidos duplicados entre sí
      const nombresCompartidos = (z.sectoresCompartidos || []).map((s) => s.nombre.trim().toLowerCase()).filter((n) => n);
      const compartidoDuplicado = nombresCompartidos.find((n, idx) => nombresCompartidos.indexOf(n) !== idx);
      if (compartidoDuplicado) {
        Swal.fire({
          icon: 'warning',
          title: 'Sector compartido duplicado',
          text: `El sector "${compartidoDuplicado}" ya existe entre los sectores compartidos de la zona "${z.nombre}".`,
          confirmButtonColor: '#1E3A5F',
        });
        return;
      }

      // Sectores exclusivos duplicados dentro de un mismo nivel, o repetidos contra los compartidos
      for (const nivel of z.niveles || []) {
        const nombresExclusivos = (nivel.sectores || []).map((s) => s.nombre.trim().toLowerCase()).filter((n) => n);
        const exclusivoDuplicado = nombresExclusivos.find((n, idx) => nombresExclusivos.indexOf(n) !== idx);
        if (exclusivoDuplicado) {
          Swal.fire({
            icon: 'warning',
            title: 'Sector duplicado',
            text: `El sector "${exclusivoDuplicado}" ya existe en este nivel ("${nivel.nombre || 'sin nombre'}").`,
            confirmButtonColor: '#1E3A5F',
          });
          return;
        }
        const chocaConCompartido = nombresExclusivos.find((n) => nombresCompartidos.includes(n));
        if (chocaConCompartido) {
          Swal.fire({
            icon: 'warning',
            title: 'Sector duplicado',
            text: `El sector "${chocaConCompartido}" ya existe como sector compartido de la zona "${z.nombre}"; no puede repetirse como exclusivo del nivel "${nivel.nombre || 'sin nombre'}".`,
            confirmButtonColor: '#1E3A5F',
          });
          return;
        }
      }
    }

    this.savingConfig = true;
    this.saveError = null;
    this.cdr.detectChanges();

    const zonasPayload: ZonaUpdateDto[] = this.zonas.map((z, idx) => ({
      id: z.id ?? null,
      nombre: z.nombre.trim(),
      orden: z.orden || (idx + 1),
      niveles: (z.niveles || []).map((n, nIdx) => ({
        id: n.id ?? null,
        nombre: n.nombre.trim(),
        orden: Number(n.orden) || (nIdx + 1),
        tipoEstructura: n.tipoEstructura || null,
        sectores: (n.sectores || []).map((s) => ({
          id: s.id ?? null,
          nombre: s.nombre.trim(),
        })),
      })),
      sectoresCompartidos: (z.sectoresCompartidos || []).map((s) => ({
        id: s.id ?? null,
        nombre: s.nombre.trim(),
      })),
    }));

    // Meta PPC ya no se envía: es un estándar fijo que administra el backend (Fase A).
    const payload = {
      responsableId: this.config.responsableId ? Number(this.config.responsableId) : null,
      zonas: zonasPayload,
      fases: (this.config.fases || []).map((f) => ({
        id: f.id,
        fechaInicio: f.fechaInicio || null,
        fechaFinMeta: f.fechaFinMeta || null,
      })),
    };

    this.bimService.saveConfiguracion(this.selectedProjectId, payload).subscribe({
      next: () => {
        this.savingConfig = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Configuración guardada',
          text: 'Se han guardado todos los cambios correctamente.',
          timer: 2000,
          showConfirmButton: false,
        });
        // Recargar datos actualizados
        if (this.selectedProjectId) {
          this.cargarConfiguracionProyecto(this.selectedProjectId);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.savingConfig = false;
        this.cdr.detectChanges();
        if (err.status === 409) {
          Swal.fire({
            icon: 'error',
            title: 'Conflicto al eliminar (409)',
            text: 'No se puede eliminar la zona, nivel o sector indicado porque cuenta con registros asociados en la Carga Diaria.',
            confirmButtonColor: '#1E3A5F',
          });
        } else {
          const mensajeErr = err.error?.message || err.message || 'Error desconocido al guardar la configuración.';
          this.saveError = `Error HTTP ${err.status}: ${mensajeErr}`;
          Swal.fire({
            icon: 'error',
            title: 'Error al guardar',
            text: mensajeErr,
            confirmButtonColor: '#1E3A5F',
          });
        }
      },
    });
  }
}
