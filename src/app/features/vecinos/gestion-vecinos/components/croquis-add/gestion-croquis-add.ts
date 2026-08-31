import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { environment } from '../../../../../../environments/environment';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { GestionVecinosService } from '../../services/gestion-vecinos.service';
import {
  CatalogOptionDTO,
  CroquisGestionDTO,
  CroquisGestionLoteDTO,
  ProjectOptionDTO,
  VecinoLoteRegisterDTO,
  VecinoPersonaCreateDTO,
} from '../../dtos/gestion-vecinos.dto';

/** Un vecino/departamento del formulario de alta (interior + uso/colindancia/tipo + personas + imágenes). */
interface VecinoBlock {
  vecinoUsoId: number | null;
  interiorDepartamento: string;
  vecinoColindanciaId: number | null;
  vecinoTipoConstruccionId: number | null;
  personas: VecinoPersonaCreateDTO[];
  imagenes: SelectedFile[];
}

@Component({
  selector: 'app-gestion-croquis-add',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, SectionTabs, FileSelector],
  templateUrl: './gestion-croquis-add.html',
})
export class GestionCroquisAdd implements OnInit {
  /** Todos los proyectos (con o sin croquis). */
  @Input() projects: ProjectOptionDTO[] = [];
  /** Croquis registrados (proyecto + lotes) para seleccionar el lote. */
  @Input() croquis: CroquisGestionDTO[] = [];
  @Input() colindancias: CatalogOptionDTO[] = [];
  @Input() tiposConstruccion: CatalogOptionDTO[] = [];
  @Input() usos: CatalogOptionDTO[] = [];
  @Input() relacionTipos: CatalogOptionDTO[] = [];
  /** Proyecto pre-seleccionado al abrir (ej. desde el modal del croquis). */
  @Input() initialProjectId: number | null = null;
  /** Lote (polígono) pre-seleccionado al abrir (ej. al añadir vecinos a un lote). */
  @Input() initialLoteId: number | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  readonly tabs: SectionTab[] = [
    { id: 'lote', label: 'Lote' },
    { id: 'vecinos', label: 'Vecinos' },
  ];
  activeTab = 'lote';

  /** Datos a nivel de lote. */
  lote = {
    projectId: null as number | null,
    projectCroquisLoteId: null as number | null,
    direccion: '',
    observaciones: '',
  };

  /** Vecinos/departamentos a registrar en el lote. */
  vecinos: VecinoBlock[] = [this.emptyVecino()];

  selectedCroquis: CroquisGestionDTO | null = null;
  selectedLote: CroquisGestionLoteDTO | null = null;

  /** Clave "{vi}-{pi}" de la persona cuya consulta RENIEC está en curso (null = ninguna). */
  dniLookupKey: string | null = null;

  constructor(
    private service: GestionVecinosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Preselección de proyecto/lote cuando se abre desde el croquis agrandado.
    if (this.initialProjectId != null) {
      this.onProjectChange(this.initialProjectId);
      if (this.initialLoteId != null && this.selectedCroquis) {
        const lote = this.selectedCroquis.lotes.find(
          (l) => l.projectCroquisLoteId === this.initialLoteId,
        );
        if (lote) this.selectLote(lote);
      }
    }
  }

  private emptyVecino(): VecinoBlock {
    return {
      vecinoUsoId: null,
      interiorDepartamento: '',
      vecinoColindanciaId: null,
      vecinoTipoConstruccionId: null,
      personas: [{ nombre: '', dni: '', celular: '', vecinoRelacionTipoId: null }],
      imagenes: [],
    };
  }

  trackByIndex(index: number): number {
    return index;
  }

  imageSrc(url: string): string {
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  // ── Lote / croquis ─────────────────────────────────────────────────────
  onProjectChange(projectId: number | null): void {
    this.lote.projectId = projectId;
    this.selectedCroquis = this.croquis.find((c) => c.projectId === projectId) ?? null;
    this.selectedLote = null;
    this.lote.projectCroquisLoteId = null;
    this.lote.direccion = '';
    this.lote.observaciones = '';
  }

  selectLote(lote: CroquisGestionLoteDTO): void {
    this.selectedLote = lote;
    this.lote.projectCroquisLoteId = lote.projectCroquisLoteId;
    this.lote.direccion = lote.direccion ?? '';
    this.lote.observaciones = lote.observaciones ?? '';
  }

  pointsToSvg(puntos: number[][]): string {
    return puntos.map((p) => `${p[0] * 100},${p[1] * 100}`).join(' ');
  }

  centroid(puntos: number[][]): { x: number; y: number } {
    const n = puntos.length || 1;
    return {
      x: (puntos.reduce((a, p) => a + p[0], 0) / n) * 100,
      y: (puntos.reduce((a, p) => a + p[1], 0) / n) * 100,
    };
  }

  loteFill(lote: CroquisGestionLoteDTO): string {
    if (this.selectedLote === lote) return 'rgba(0,134,165,0.45)';
    return lote.vecinosCount > 0 ? 'rgba(76,175,80,0.35)' : 'rgba(156,163,175,0.25)';
  }

  loteStroke(lote: CroquisGestionLoteDTO): string {
    if (this.selectedLote === lote) return '#0086A5';
    return lote.vecinosCount > 0 ? '#4CAF50' : '#9CA3AF';
  }

  // ── Vecinos / personas / imágenes ──────────────────────────────────────
  addVecino(): void {
    this.vecinos.push(this.emptyVecino());
  }

  removeVecino(index: number): void {
    if (this.vecinos.length <= 1) return;
    this.vecinos.splice(index, 1);
  }

  addPersona(vi: number): void {
    this.vecinos[vi].personas.push({ nombre: '', dni: '', celular: '', vecinoRelacionTipoId: null });
  }

  removePersona(vi: number, pi: number): void {
    if (this.vecinos[vi].personas.length <= 1) return;
    this.vecinos[vi].personas.splice(pi, 1);
  }

  onImageSelected(vi: number, file: SelectedFile): void {
    if (!file.file.type.startsWith('image/')) return;
    this.vecinos[vi].imagenes.push(file);
  }

  removeImage(vi: number, index: number): void {
    this.vecinos[vi].imagenes.splice(index, 1);
  }

  // ── DNI / RENIEC (por persona de un vecino) ────────────────────────────
  searchReniec(vi: number, pi: number): void {
    const persona = this.vecinos[vi]?.personas[pi];
    if (!persona || persona.dni.length !== 8) return;
    this.dniLookupKey = `${vi}-${pi}`;
    this.loaderService.show();
    this.service.getPersonByDni(persona.dni).subscribe({
      next: (data) => {
        persona.nombre = data.full_name?.trim()
          || `${data.first_name} ${data.first_last_name} ${data.second_last_name}`.trim();
        this.dniLookupKey = null;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.dniLookupKey = null;
        this.loaderService.hide();
        Swal.fire({
          icon: err.status === 404 ? 'warning' : 'info',
          title: err.status === 404 ? 'DNI no encontrado' : 'No se pudo consultar RENIEC',
          text: 'Ingresa el nombre de la persona manualmente.',
        });
      },
    });
  }

  onDniKeydown(event: KeyboardEvent, vi: number, pi: number): void {
    if (event.key === 'Enter') { event.preventDefault(); this.searchReniec(vi, pi); return; }
    this.blockNonDigits(event);
  }

  onNumericKeydown(event: KeyboardEvent): void {
    this.blockNonDigits(event);
  }

  private blockNonDigits(event: KeyboardEvent): void {
    const isControl = event.ctrlKey || event.metaKey || event.altKey;
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (isControl || allowed.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  // ── Validación + submit ────────────────────────────────────────────────
  private getValidationErrors(): { tab: string; campo: string }[] {
    const errors: { tab: string; campo: string }[] = [];
    if (!this.lote.projectId) errors.push({ tab: 'lote', campo: 'Proyecto' });
    if (!this.lote.projectCroquisLoteId) errors.push({ tab: 'lote', campo: 'Lote en el croquis' });
    if (!this.lote.direccion?.trim()) errors.push({ tab: 'lote', campo: 'Dirección del lote' });

    if (this.vecinos.length === 0) errors.push({ tab: 'vecinos', campo: 'Al menos un vecino' });

    this.vecinos.forEach((v, vi) => {
      const n = vi + 1;
      if (!v.vecinoUsoId) errors.push({ tab: 'vecinos', campo: `Vecino ${n}: Uso` });
      if (!v.vecinoColindanciaId) errors.push({ tab: 'vecinos', campo: `Vecino ${n}: Colindante / No colindante` });
      if (!v.vecinoTipoConstruccionId) errors.push({ tab: 'vecinos', campo: `Vecino ${n}: Tipo de construcción` });
      if (v.personas.length === 0) errors.push({ tab: 'vecinos', campo: `Vecino ${n}: al menos una persona` });
      v.personas.forEach((p, pi) => {
        const pn = pi + 1;
        if (!p.nombre?.trim()) errors.push({ tab: 'vecinos', campo: `Vecino ${n} · Persona ${pn}: nombre` });
        if (!p.celular?.trim()) errors.push({ tab: 'vecinos', campo: `Vecino ${n} · Persona ${pn}: celular` });
        if (!p.vecinoRelacionTipoId) errors.push({ tab: 'vecinos', campo: `Vecino ${n} · Persona ${pn}: relación` });
        if (p.dni?.trim() && !/^\d{8}$/.test(p.dni.trim()))
          errors.push({ tab: 'vecinos', campo: `Vecino ${n} · Persona ${pn}: DNI (8 dígitos)` });
      });
    });

    return errors;
  }

  submit(): void {
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      this.activeTab = errors[0].tab;
      const listHtml = errors.map((e) => `<li>${e.campo}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        html: `<p style="font-size:0.85rem;color:#666;margin-bottom:8px">Completa los siguientes campos:</p>
               <ul style="text-align:left;font-size:0.85rem;padding-left:1.4rem;line-height:2">${listHtml}</ul>`,
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    const dto: VecinoLoteRegisterDTO = {
      projectCroquisLoteId: this.lote.projectCroquisLoteId!,
      direccion: this.lote.direccion.trim(),
      observaciones: this.lote.observaciones?.trim() ?? '',
      vecinos: this.vecinos.map((v) => ({
        vecinoUsoId: v.vecinoUsoId,
        interiorDepartamento: v.interiorDepartamento?.trim() ?? '',
        vecinoColindanciaId: v.vecinoColindanciaId,
        vecinoTipoConstruccionId: v.vecinoTipoConstruccionId,
        personas: v.personas,
      })),
    };

    this.loaderService.show();
    this.service.registerVecinos(dto).subscribe({
      next: (res) => {
        const vecinoIds = res.vecinoIds ?? [];

        // Subir las imágenes de cada vecino a su id recién creado (en orden).
        const tasks: Observable<unknown>[] = [];
        this.vecinos.forEach((v, i) => {
          const vid = vecinoIds[i];
          if (vid && v.imagenes.length > 0)
            tasks.push(this.service.uploadImagenes(vid, v.imagenes.map((im) => im.file)));
        });

        if (tasks.length === 0) {
          this.loaderService.hide();
          this.successAndClose();
          return;
        }

        forkJoin(tasks).subscribe({
          next: () => {
            this.loaderService.hide();
            this.successAndClose();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            // Los vecinos sí se crearon; avisamos que la subida de imágenes falló.
            this.errorService.handleError(err);
            this.created.emit();
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private successAndClose(): void {
    Swal.fire({
      icon: 'success',
      title: '¡Vecinos registrados!',
      text: 'Los vecinos se registraron correctamente en el lote.',
      confirmButtonColor: 'var(--color-abril-primary)',
    });
    this.created.emit();
  }
}
