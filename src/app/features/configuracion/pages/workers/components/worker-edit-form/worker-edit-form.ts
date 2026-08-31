import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../../../../shared/components/date-picker/date-picker';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { Roles } from '../../../../../../core/constants/roles';
import { WorkerService } from '../../../../../ssoma/salud-ocupacional/services/worker.service';
import { CatalogosHabService } from '../../../../../habilitacion/services/catalogos-hab.service';
import { AreaScopeService } from '../../../../shared/services/area-scope.service';
import { AreaScopeTreeDto } from '../../../../shared/dtos/areaScope.model';
import {
  DocumentTypeDto,
  EmoPorTrabajadorDto,
  WorkerDatosBasicosDto,
} from '../../../../../ssoma/salud-ocupacional/dtos/emo.model';

interface EditModel {
  nombreCompleto: string;
  documentIdentityTypeId: number | null;
  numeroDocumento: string;
  cumpleanos: string; // 'YYYY-MM-DD'
  emailCorporativo: string;
  emailPersonal: string;
  /** FK a `categoria`. NO se guarda: es solo el filtro que acota el desplegable de puestos
   * y muestra a qué categoría pertenece el que se eligió. */
  categoriaId: number | null;
  /** FK a `puesto`: el campo de presentación. */
  puestoId: number | null;
}

/** Un nivel del árbol de áreas: opciones (hermanos) y el nodo elegido en ese nivel. */
interface AreaLevel {
  options: AreaScopeTreeDto[];
  selected: number | null; // areaScopeId
}

/**
 * Edición mínima de un trabajador (Configuración → Trabajadores). Por ahora solo
 * permite cambiar nombre completo, tipo y número de documento y cumpleaños; todos
 * viven en la tabla `person`, por eso se usa el endpoint dedicado `datos-basicos`
 * que no toca el resto de campos del worker. También asigna el área del trabajador
 * (workers.area_scope_id) mediante desplegables en cascada sobre la Jerarquía de
 * áreas: se guarda el último nodo seleccionado, sin obligar a llegar a una hoja.
 */
@Component({
  selector: 'app-worker-edit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, DatePicker],
  templateUrl: './worker-edit-form.html',
  styleUrl: './worker-edit-form.css',
})
export class WorkerEditForm implements OnChanges {
  @Input() open = false;
  @Input() worker: EmoPorTrabajadorDto | null = null;
  @Input() documentTypes: DocumentTypeDto[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  model: EditModel = this.empty();
  saving = false;

  /** Verificación del correo corporativo contra el directorio de Abril (ver onEmailCorporativoBlur). */
  verificandoEmail = false;
  emailError = '';
  emailVerificadoNombre = '';
  /** Correo ya aceptado (el guardado al abrir, o el último verificado): no se vuelve a consultar. */
  private emailVerificado = '';
  /** Si la ficha ya traía algún correo al abrirla (ver reset). */
  private teniaAlgunCorreo = false;

  categorias: { id: number; nombre: string }[] = [];
  puestos: { id: number; nombre: string; categoriaId: number | null }[] = [];

  /** Desplegables en cascada del árbol de áreas (uno por nivel de la Jerarquía). */
  areaLevels: AreaLevel[] = [];
  private areaTree: AreaScopeTreeDto[] = [];
  private areaTreeLoaded = false;

  constructor(
    private workerService: WorkerService,
    private catalogosHabService: CatalogosHabService,
    private areaScopeService: AreaScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Solo Administrador de Obra puede corregir el DNI (rol 60) — restricción reflejada también en el backend. */
  get puedeEditarDni(): boolean {
    return this.authService.hasRole(Roles.ADMINISTRADOR_DE_OBRA);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
      this.loadCatalogos();
      this.loadAreaTree();
    }
  }

  private empty(): EditModel {
    return {
      nombreCompleto: '',
      documentIdentityTypeId: null,
      numeroDocumento: '',
      cumpleanos: '',
      emailCorporativo: '',
      emailPersonal: '',
      categoriaId: null,
      puestoId: null,
    };
  }

  private reset(): void {
    this.verificandoEmail = false;
    this.emailError = '';
    this.emailVerificadoNombre = '';
    // El correo ya guardado se da por bueno (igual que el backend, que no revalida si no cambió):
    // hay fichas antiguas con correos que hoy no pasarían la validación y no deben bloquear la
    // edición de otros campos.
    this.emailVerificado = (this.worker?.emailCorporativo ?? '').trim().toLowerCase();
    // Solo se exige "al menos un correo" si la ficha ya tenía alguno: hay miles de fichas legadas
    // sin ninguno y no deben quedar imposibles de editar, pero tampoco se puede borrar el último
    // correo de las que sí lo tienen (misma regla que el backend).
    this.teniaAlgunCorreo =
      !!(this.worker?.emailCorporativo ?? '').trim() || !!(this.worker?.emailPersonal ?? '').trim();

    if (!this.worker) {
      this.model = this.empty();
      return;
    }
    this.model = {
      nombreCompleto: this.worker.nombreCompleto ?? '',
      documentIdentityTypeId: this.worker.documentIdentityTypeId ?? null,
      numeroDocumento: this.worker.dni ?? '',
      cumpleanos: (this.worker.cumpleanos ?? '').slice(0, 10),
      emailCorporativo: this.worker.emailCorporativo ?? '',
      emailPersonal: this.worker.emailPersonal ?? '',
      categoriaId: this.worker.categoriaId ?? null,
      puestoId: this.worker.puestoId ?? null,
    };
  }

  private loadCatalogos(): void {
    this.catalogosHabService.getCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
    this.catalogosHabService.getPuestos().subscribe({
      next: (data) => {
        this.puestos = data;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  /** Carga la Jerarquía de áreas una sola vez; luego solo re-inicializa los niveles. */
  private loadAreaTree(): void {
    if (this.areaTreeLoaded) {
      this.initAreaLevels();
      return;
    }
    this.areaScopeService.getTree().subscribe({
      next: (tree) => {
        this.areaTree = tree ?? [];
        this.areaTreeLoaded = true;
        this.initAreaLevels();
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  /**
   * Arma los niveles a partir del area_scope_id actual del trabajador: un desplegable
   * por cada nivel del camino raíz → nodo asignado, más uno vacío con los hijos del
   * último nodo (si tiene) para poder profundizar.
   */
  private initAreaLevels(): void {
    const path = this.worker?.areaScopeId
      ? this.findPath(this.areaTree, this.worker.areaScopeId)
      : null;
    this.areaLevels = [
      {
        options: this.visibleOptions(this.areaTree, path?.[0]?.areaScopeId ?? null),
        selected: path?.[0]?.areaScopeId ?? null,
      },
    ];
    if (!path) return;
    for (let i = 0; i < path.length; i++) {
      const children = path[i].children ?? [];
      if (!children.length) continue;
      const next = path[i + 1] ?? null;
      this.areaLevels.push({
        options: this.visibleOptions(children, next?.areaScopeId ?? null),
        selected: next?.areaScopeId ?? null,
      });
    }
  }

  /** Camino raíz → nodo con el areaScopeId buscado, o null si no existe en el árbol. */
  private findPath(nodes: AreaScopeTreeDto[], targetId: number): AreaScopeTreeDto[] | null {
    for (const node of nodes) {
      if (node.areaScopeId === targetId) return [node];
      const sub = this.findPath(node.children ?? [], targetId);
      if (sub) return [node, ...sub];
    }
    return null;
  }

  /** Oculta nodos inactivos, salvo que sean el valor ya asignado (para no romper el prellenado). */
  private visibleOptions(nodes: AreaScopeTreeDto[], selectedId: number | null): AreaScopeTreeDto[] {
    return (nodes ?? []).filter((n) => n.active || n.areaScopeId === selectedId);
  }

  /**
   * Al elegir un nodo se descartan los niveles más profundos y, si el nodo tiene hijos,
   * se agrega un desplegable vacío para el siguiente nivel (opcional: si no se llena,
   * se guarda el último nodo seleccionado).
   */
  onAreaLevelChange(index: number, value: number | null): void {
    const level = this.areaLevels[index];
    level.selected = value ?? null;
    this.areaLevels = this.areaLevels.slice(0, index + 1);
    if (value == null) return;
    const node = level.options.find((o) => o.areaScopeId === value);
    if (node?.children?.length) {
      this.areaLevels.push({ options: this.visibleOptions(node.children, null), selected: null });
    }
  }

  /** Último nodo seleccionado en la cascada (el que se guarda en workers.area_scope_id). */
  get selectedAreaScopeId(): number | null {
    for (let i = this.areaLevels.length - 1; i >= 0; i--) {
      if (this.areaLevels[i].selected != null) return this.areaLevels[i].selected;
    }
    return null;
  }

  /** Ruta legible de la selección actual (ej. "Gerencia de Proyectos › Unidad de Proyectos"). */
  get areaPathLabel(): string {
    const names: string[] = [];
    for (const level of this.areaLevels) {
      if (level.selected == null) break;
      const node = level.options.find((o) => o.areaScopeId === level.selected);
      if (!node) break;
      names.push(node.areaItemName);
    }
    return names.join(' › ');
  }

  /** La categoría no se guarda en el trabajador: filtra el desplegable de puestos, que es lo
   * que sí se guarda (y de donde el sistema lee la categoría). Al cambiarla se descarta el
   * puesto si ya no pertenece a ella. */
  onCategoriaChange(categoriaId: number | null): void {
    this.model.categoriaId = categoriaId;
    const puesto = this.puestos.find((p) => p.id === this.model.puestoId);
    if (puesto && puesto.categoriaId !== categoriaId) this.model.puestoId = null;
  }

  /** Elegir un puesto fija la categoría, siempre: la del trabajador es la de su puesto. */
  onPuestoChange(puestoId: number | null): void {
    this.model.puestoId = puestoId;
    const puesto = this.puestos.find((p) => p.id === puestoId);
    if (puesto) this.model.categoriaId = puesto.categoriaId;
  }

  /**
   * Puestos ofrecidos: solo los de la categoría elegida como filtro. Sin filtro se muestran
   * todos. Todo puesto pertenece a exactamente una categoría (la columna es NOT NULL).
   */
  get puestosFiltrados(): { id: number; nombre: string; categoriaId: number | null }[] {
    if (this.model.categoriaId == null) return this.puestos;
    return this.puestos.filter(
      (p) =>
        p.categoriaId === this.model.categoriaId ||
        // El puesto ya guardado siempre se ofrece, aunque pertenezca a otra categoría o a
        // ninguna: si no, el desplegable mostraría el placeholder en vez del puesto real.
        p.id === this.model.puestoId,
    );
  }


  /** Al reescribir el correo se limpia el resultado de la verificación anterior. */
  onEmailCorporativoInput(): void {
    this.emailError = '';
    this.emailVerificadoNombre = '';
  }

  /**
   * Verifica el correo contra el directorio de Abril (tenant de Microsoft) y contra los correos
   * ya asignados a otros trabajadores. El backend decide si aplica según la clasificación
   * guardada del trabajador: en Obra y en contratistas este campo es el correo personal, que no
   * vive en el tenant y sí puede repetirse, así que ahí solo se valida el formato.
   */
  onEmailCorporativoBlur(): void {
    const email = (this.model.emailCorporativo ?? '').trim().toLowerCase();
    if (!email || email === this.emailVerificado || !this.worker) return;

    this.emailError = '';
    this.emailVerificadoNombre = '';
    this.verificandoEmail = true;

    this.workerService.validarEmailCorporativo(email, this.worker.workerId).subscribe({
      next: (res) => {
        this.verificandoEmail = false;
        if (res.valido) {
          // Se guarda el correo canónico del directorio (así coincide con el del login SSO).
          if (res.email) this.model.emailCorporativo = res.email;
          this.emailVerificado = (this.model.emailCorporativo ?? '').trim().toLowerCase();
          this.emailVerificadoNombre = res.nombreEnTenant ?? '';
        } else {
          this.emailError = res.mensaje ?? 'El correo corporativo no es válido.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        // Sin verificación no se bloquea el formulario: el backend vuelve a validar al guardar.
        this.verificandoEmail = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Todo trabajador debe quedar con al menos un correo: el corporativo o el personal. */
  get tieneAlgunCorreo(): boolean {
    return !!this.model.emailCorporativo?.trim() || !!this.model.emailPersonal?.trim();
  }

  /** True cuando falta el correo y en este contexto sí es exigible (ver teniaAlgunCorreo). */
  get faltaCorreo(): boolean {
    return !this.tieneAlgunCorreo && this.teniaAlgunCorreo;
  }

  get canSubmit(): boolean {
    return (
      !this.saving &&
      !this.verificandoEmail &&
      !this.emailError &&
      !this.faltaCorreo &&
      !!this.model.nombreCompleto?.trim()
    );
  }

  submit(): void {
    if (this.emailError) {
      Swal.fire({ icon: 'error', title: 'Correo corporativo no válido', text: this.emailError });
      return;
    }

    if (this.faltaCorreo) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta el correo',
        text: 'El trabajador debe conservar al menos un correo: el corporativo o el personal.',
      });
      return;
    }

    if (!this.canSubmit || !this.worker) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'El nombre completo es obligatorio.' });
      return;
    }

    const payload: WorkerDatosBasicosDto = {
      nombreCompleto: this.model.nombreCompleto.trim(),
      documentIdentityTypeId: this.model.documentIdentityTypeId || null,
      numeroDocumento: this.model.numeroDocumento?.trim() || null,
      cumpleanos: this.model.cumpleanos || null,
      emailCorporativo: this.model.emailCorporativo?.trim() || null,
      emailPersonal: this.model.emailPersonal?.trim() || null,
      // La categoría no se manda: el backend la lee del puesto.
      puestoId: this.model.puestoId ?? null,
      areaScopeId: this.selectedAreaScopeId,
    };

    this.saving = true;
    this.loaderService.show();

    this.workerService.updateDatosBasicos(this.worker.workerId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Trabajador actualizado',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
