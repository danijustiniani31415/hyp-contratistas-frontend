import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { DraggableImage } from '../../../../../shared/components/draggable-image/draggable-image';
import { StatusPills } from '../status-pills/status-pills';
import { GestionVecinosCompromisos } from '../compromisos/gestion-vecinos-compromisos';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { GestionVecinosService } from '../../services/gestion-vecinos.service';
import { environment } from '../../../../../../environments/environment';
import {
  VecinoListItemDTO,
  VecinoSolicitudItemDTO,
  CatalogOptionDTO,
  VecinoRequisitoItemDTO,
  VecinoUpdateDTO,
  VecinoLoteUpdateDTO,
} from '../../dtos/gestion-vecinos.dto';

@Component({
  selector: 'app-gestion-vecinos-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SectionTabs, StatusPills, GestionVecinosCompromisos, SearchSelect, FileSelector, DraggableImage],
  templateUrl: './gestion-vecinos-detail.html',
})
export class GestionVecinosDetail implements OnInit {
  @Input() item!: VecinoListItemDTO;
  /** Catálogos para el modo edición. */
  @Input() colindancias: CatalogOptionDTO[] = [];
  @Input() tiposConstruccion: CatalogOptionDTO[] = [];
  @Input() usos: CatalogOptionDTO[] = [];
  @Input() relacionTipos: CatalogOptionDTO[] = [];
  @Output() closeModal = new EventEmitter<void>();
  /** Avisa al padre que la propiedad cambió (para refrescar listados/croquis en segundo plano). */
  @Output() updated = new EventEmitter<void>();

  // ── Edición de la sección Detalle ───────────────────────────────────────
  editing = false;
  editForm: VecinoUpdateDTO = {
    vecinoUsoId: null,
    interiorDepartamento: '',
    vecinoColindanciaId: null,
    vecinoTipoConstruccionId: null,
    personas: [],
  };
  /** Datos a nivel de lote (dirección + observaciones). */
  loteForm: VecinoLoteUpdateDTO = { direccion: '', observaciones: '' };
  /** Imágenes nuevas a subir al guardar. */
  newImages: SelectedFile[] = [];

  /** Base del backend (sin slash final) para componer URLs de imágenes. */
  get apiBase(): string {
    return environment.apiUrl.replace(/\/$/, '');
  }

  trackByIndex(index: number): number {
    return index;
  }

  private _activeTab = 'detalle';
  get activeTab(): string {
    return this._activeTab;
  }
  set activeTab(value: string) {
    this._activeTab = value;
    if (value === 'requisitos' && !this.requisitosLoaded) this.loadRequisitos();
  }

  solicitudes: VecinoSolicitudItemDTO[] = [];
  estados: CatalogOptionDTO[] = [];
  compromisoEstados: CatalogOptionDTO[] = [];
  entregableEstados: CatalogOptionDTO[] = [];
  solicitudesLoaded = false;

  expandedSolicitudId: number | null = null;

  // Formulario de nueva solicitud
  nuevaDescripcion = '';
  nuevaCritica = false;

  // Requisitos (Gestión de requisitos)
  requisitos: VecinoRequisitoItemDTO[] = [];
  requisitosLoaded = false;

  constructor(
    private service: GestionVecinosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  get tabs(): SectionTab[] {
    return [
      { id: 'detalle', label: 'Detalle' },
      {
        id: 'requerimientos',
        label: 'Gestión de requerimientos',
        badge: this.solicitudesLoaded ? this.solicitudes.length : null,
      },
      { id: 'requisitos', label: 'Gestión de requisitos' },
    ];
  }

  ngOnInit(): void {
    this.loadSolicitudes();
  }

  /** Ordena un catálogo según un orden explícito de descripciones; los no listados van al final. */
  private sortByDescripcion(options: CatalogOptionDTO[], order: string[]): CatalogOptionDTO[] {
    const rank = (d: string) => {
      const i = order.indexOf(d);
      return i === -1 ? order.length : i;
    };
    return [...options].sort((a, b) => rank(a.descripcion) - rank(b.descripcion));
  }

  private loadSolicitudes(): void {
    this.loaderService.show();
    this.service.getSolicitudes(this.item.vecinoId).subscribe({
      next: (res) => {
        this.solicitudes = res.solicitudes;
        this.estados = this.sortByDescripcion(res.estados, ['Por responder', 'Denegada', 'Aceptada']);
        this.compromisoEstados = this.sortByDescripcion(res.compromisoEstados, [
          'Pendiente',
          'En proceso',
          'Culminado',
        ]);
        this.entregableEstados = this.sortByDescripcion(res.entregableEstados, [
          'Falta',
          'No aplica',
          'Enviado',
          'Aprobado',
        ]);
        this.solicitudesLoaded = true;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  addSolicitud(): void {
    if (!this.nuevaDescripcion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Descripción requerida',
        text: 'Ingresa la descripción de la solicitud.',
        confirmButtonColor: '#4CAF50',
      });
      return;
    }

    this.loaderService.show();
    this.service
      .createSolicitud(this.item.vecinoId, {
        descripcion: this.nuevaDescripcion.trim(),
        esCritica: this.nuevaCritica,
      })
      .subscribe({
        next: () => {
          this.nuevaDescripcion = '';
          this.nuevaCritica = false;
          this.loadSolicitudes();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  toggleCompromisos(solicitud: VecinoSolicitudItemDTO): void {
    this.expandedSolicitudId =
      this.expandedSolicitudId === solicitud.vecinoSolicitudId ? null : solicitud.vecinoSolicitudId;
  }

  onEstadoChange(solicitud: VecinoSolicitudItemDTO, estadoId: number): void {
    const previo = solicitud.vecinoSolicitudEstadoId;
    if (estadoId === previo) return;

    this.loaderService.show();
    this.service.updateSolicitudEstado(solicitud.vecinoSolicitudId, estadoId).subscribe({
      next: () => {
        const estado = this.estados.find((e) => e.id === estadoId);
        solicitud.vecinoSolicitudEstadoId = estadoId;
        if (estado) solicitud.estadoDescripcion = estado.descripcion;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        solicitud.vecinoSolicitudEstadoId = previo; // revertir
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Edición inline del texto de una solicitud ──────────────────────────
  editDescripcionId: number | null = null;
  descripcionDraft = '';

  startEditDescripcion(s: VecinoSolicitudItemDTO): void {
    this.editDescripcionId = s.vecinoSolicitudId;
    this.descripcionDraft = s.descripcion;
  }

  cancelEditDescripcion(): void {
    this.editDescripcionId = null;
    this.descripcionDraft = '';
  }

  saveDescripcion(s: VecinoSolicitudItemDTO): void {
    const valor = this.descripcionDraft.trim();
    if (!valor) {
      Swal.fire({
        icon: 'warning',
        title: 'Descripción requerida',
        text: 'La solicitud no puede quedarse sin descripción.',
        confirmButtonColor: '#4CAF50',
      });
      return;
    }
    if (valor === s.descripcion) {
      this.cancelEditDescripcion();
      return;
    }

    this.loaderService.show();
    this.service.updateSolicitudDescripcion(s.vecinoSolicitudId, valor).subscribe({
      next: () => {
        s.descripcion = valor;
        this.editDescripcionId = null;
        this.descripcionDraft = '';
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Requisitos ─────────────────────────────────────────────────────────
  private loadRequisitos(): void {
    this.loaderService.show();
    this.service.getRequisitos(this.item.vecinoId).subscribe({
      next: (res) => {
        this.requisitos = res.requisitos;
        this.requisitosLoaded = true;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** URL absoluta del archivo del requisito. */
  requisitoFileUrl(url?: string | null): string {
    if (!url) return '';
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  esNoAplica(r: VecinoRequisitoItemDTO): boolean {
    return r.estadoDescripcion === 'No aplica';
  }

  onRequisitoFileSelected(r: VecinoRequisitoItemDTO, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.loaderService.show();
    this.service.uploadRequisito(this.item.vecinoId, r.vecinoRequisitoTipoId, file).subscribe({
      next: () => {
        input.value = '';
        this.loadRequisitos();
      },
      error: (err: HttpErrorResponse) => {
        input.value = '';
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggleNoAplica(r: VecinoRequisitoItemDTO): void {
    const noAplica = !this.esNoAplica(r);
    this.loaderService.show();
    this.service.setRequisitoNoAplica(this.item.vecinoId, r.vecinoRequisitoTipoId, noAplica).subscribe({
      next: () => this.loadRequisitos(),
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Edición de la sección Detalle ───────────────────────────────────────
  startEdit(): void {
    this.editForm = {
      vecinoUsoId: this.item.vecinoUsoId ?? null,
      interiorDepartamento: this.item.interiorDepartamento ?? '',
      vecinoColindanciaId: this.item.vecinoColindanciaId ?? null,
      vecinoTipoConstruccionId: this.item.vecinoTipoConstruccionId ?? null,
      personas: this.item.personas.map((p) => ({
        vecinoPersonaId: p.vecinoPersonaId,
        nombre: p.nombre,
        dni: p.dni ?? '',
        celular: p.celular ?? '',
        vecinoRelacionTipoId: p.vecinoRelacionTipoId,
      })),
    };
    this.loteForm = {
      direccion: this.item.direccion ?? '',
      observaciones: this.item.observaciones ?? '',
    };
    this.newImages = [];
    this.editing = true;
  }

  cancelEdit(): void {
    this.editing = false;
    this.newImages = [];
  }

  addPersonaEdit(): void {
    this.editForm.personas.push({ vecinoPersonaId: null, nombre: '', dni: '', celular: '', vecinoRelacionTipoId: null });
  }

  removePersonaEdit(index: number): void {
    if (this.editForm.personas.length <= 1) return;
    this.editForm.personas.splice(index, 1);
  }

  onNumericKeydown(event: KeyboardEvent): void {
    const isControl = event.ctrlKey || event.metaKey || event.altKey;
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (isControl || allowed.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  onImageSelected(file: SelectedFile): void {
    if (!file.file.type.startsWith('image/')) return;
    this.newImages.push(file);
  }

  removeNewImage(index: number): void {
    this.newImages.splice(index, 1);
  }

  removeExistingImage(imagenId: number): void {
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar imagen?',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#D30000',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.service.deleteImagen(imagenId).subscribe({
        next: () => {
          this.item.imagenes = this.item.imagenes.filter((i) => i.vecinoImagenId !== imagenId);
          this.loaderService.hide();
          this.updated.emit();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  private editErrors(): string[] {
    const e: string[] = [];
    if (!this.loteForm.direccion?.trim()) e.push('Dirección');
    if (!this.editForm.vecinoUsoId) e.push('Uso');
    if (!this.editForm.vecinoColindanciaId) e.push('Colindancia');
    if (!this.editForm.vecinoTipoConstruccionId) e.push('Tipo de construcción');
    this.editForm.personas.forEach((p, i) => {
      const n = i + 1;
      if (!p.nombre?.trim()) e.push(`Persona ${n}: nombre`);
      if (!p.celular?.trim()) e.push(`Persona ${n}: celular`);
      if (!p.vecinoRelacionTipoId) e.push(`Persona ${n}: relación`);
      if (p.dni?.trim() && !/^\d{8}$/.test(p.dni.trim())) e.push(`Persona ${n}: DNI (8 dígitos)`);
    });
    return e;
  }

  saveEdit(): void {
    const errors = this.editErrors();
    if (errors.length > 0) {
      const listHtml = errors.map((c) => `<li>${c}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        html: `<ul style="text-align:left;font-size:0.85rem;padding-left:1.4rem;line-height:2">${listHtml}</ul>`,
        confirmButtonColor: '#4CAF50',
      });
      return;
    }

    this.loaderService.show();
    // Guardar en paralelo los datos del vecino/departamento y los del lote.
    forkJoin([
      this.service.update(this.item.vecinoId, this.editForm),
      this.service.updateLote(this.item.vecinoLoteId, this.loteForm),
    ]).subscribe({
      next: () => {
        const tasks: Observable<unknown>[] = [];
        if (this.newImages.length > 0)
          tasks.push(this.service.uploadImagenes(this.item.vecinoId, this.newImages.map((i) => i.file)));

        const finalize = () => {
          // Refrescar el item con datos frescos (ids de personas/imágenes incluidos).
          this.service.getById(this.item.vecinoId).subscribe({
            next: (fresh) => {
              Object.assign(this.item, fresh);
              this.editing = false;
              this.newImages = [];
              this.loaderService.hide();
              this.updated.emit();
              this.cdr.detectChanges();
              Swal.fire({ icon: 'success', title: 'Vecino actualizado', confirmButtonColor: '#4CAF50' });
            },
            error: (err: HttpErrorResponse) => {
              this.loaderService.hide();
              this.errorService.handleError(err);
            },
          });
        };

        if (tasks.length === 0) {
          finalize();
          return;
        }
        forkJoin(tasks).subscribe({
          next: () => finalize(),
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
