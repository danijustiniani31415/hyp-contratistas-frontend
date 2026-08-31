import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';
import { AreaScopeTreeDto } from '../../../../configuracion/shared/dtos/areaScope.model';
import {
  ProyectoFiltroDTO,
  TemaConvocatoriaReglaInput,
  TemaConvocatoriaSaveRequest,
  TrabajadorAbrilDTO,
} from '../../dtos/actas-reunion.dto';

interface PuestoRow {
  id: number;
  descripcion: string;
  marcado: boolean;
}

interface StaffRow {
  workerId: number;
  nombre: string;
  cargo: string;
  marcado: boolean;
}

/** Una regla de convocatoria en edición: a quién convoca (área/gerencia y/o proyecto + puestos). */
interface ReglaConvocatoria {
  /** Cada regla convoca a UN grupo: por área/puesto, o por el staff completo de un proyecto — nunca ambos a la vez (ver onModoReglaChange). */
  modo: 'AREA_PUESTO' | 'PROYECTO';
  areaScopePath: AreaScopeTreeDto[];
  puestos: PuestoRow[];
  filtroPuesto: string;
  projectId: number | null;
  /** Staff vigente del proyecto elegido, para poder destildar individuos (ver cargarStaff). */
  staff: StaffRow[];
  filtroStaff: string;
}

export interface ConvocatoriaTemaResultado {
  config: TemaConvocatoriaSaveRequest;
  trabajadores: TrabajadorAbrilDTO[];
}

/**
 * Modal para configurar la convocatoria recurrente de un tema (varias reglas independientes de
 * área/proyecto + puestos que se convocan siempre, y si requiere agenda fija o dinámica), en vez
 * de amontonar todos estos campos dentro del formulario de "Agendar reunión". Se abre al marcar
 * "Guardar como tema recurrente". Ej.: "Reunión de Jefaturas de Proyectos" puede convocar a la vez
 * a los Jefes de Proyectos de su gerencia Y al Gerente Inmobiliario de otra — dos reglas, no una.
 */
@Component({
  selector: 'app-convocatoria-tema',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './convocatoria-tema.html',
})
export class ConvocatoriaTema {
  /** Árbol completo de áreas/gerencias, ya cargado por el padre. */
  @Input() arbol: AreaScopeTreeDto[] = [];
  /** Proyectos disponibles para el filtro "Staff de un proyecto" de cada regla. */
  @Input() proyectos: ProyectoFiltroDTO[] = [];

  /** Configuración previa, al reabrir el modal para editar (null = arranca en blanco). */
  @Input() set inicial(value: TemaConvocatoriaSaveRequest | null) {
    if (!value) return;
    this.agendaFija = value.agendaFija;
    this.agendaTexto = value.agendaTexto ?? '';
    this.recordatorioHorasAntes = value.recordatorioHorasAntes;
    this.reglas =
      value.reglas.length > 0
        ? value.reglas.map((r) => this.reglaDesde(r.areaScopeId, r.projectId, r.puestoIds))
        : [this.reglaVacia()];
    this.reglas.forEach((r, i) => {
      this.cargarPuestos(r);
      if (r.projectId != null) this.cargarStaff(r, value.reglas[i]?.workerIdsExcluidos ?? []);
    });
    this.previsualizar();
  }

  @Output() closeModal = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<ConvocatoriaTemaResultado>();

  reglas: ReglaConvocatoria[] = [this.reglaVacia()];

  agendaFija = false;
  agendaTexto = '';
  recordatorioHorasAntes: number | null = null;

  /** Previsualización en vivo de a quién se agregaría como participante con las reglas elegidas. */
  trabajadoresPreview: TrabajadorAbrilDTO[] = [];
  buscando = false;
  private previewTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private service: ActasReunionService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  private reglaVacia(): ReglaConvocatoria {
    return { modo: 'AREA_PUESTO', areaScopePath: [], puestos: [], filtroPuesto: '', projectId: null, staff: [], filtroStaff: '' };
  }

  private reglaDesde(areaScopeId: number | null, projectId: number | null, puestoIds: number[]): ReglaConvocatoria {
    return {
      modo: projectId != null ? 'PROYECTO' : 'AREA_PUESTO',
      areaScopePath: areaScopeId != null ? this.buscarRuta(this.arbol, areaScopeId) ?? [] : [],
      puestos: puestoIds.map((id) => ({ id, descripcion: '', marcado: true })), // se completa en cargarPuestos
      filtroPuesto: '',
      projectId,
      staff: [], // se completa en cargarStaff
      filtroStaff: '',
    };
  }

  /**
   * Cada regla convoca por área/puesto O por staff de un proyecto, nunca ambos: combinarlos filtraba
   * con AND (intersección) y solía dar cero resultados — ej. "jefes de Gerencia de Proyectos" AND
   * "staff de Bugambilias" no calza con nadie. Al cambiar de modo se limpia el otro lado para que la
   * regla quede siempre en un estado válido; para convocar a varios grupos se usa otra regla.
   */
  onModoReglaChange(regla: ReglaConvocatoria, modo: 'AREA_PUESTO' | 'PROYECTO'): void {
    if (regla.modo === modo) return;
    regla.modo = modo;
    if (modo === 'PROYECTO') {
      regla.areaScopePath = [];
      regla.puestos.forEach((p) => (p.marcado = false));
      regla.filtroPuesto = '';
    } else {
      regla.projectId = null;
      regla.staff = [];
      regla.filtroStaff = '';
    }
    this.previsualizar();
  }

  /** Busca la cadena de nodos (raíz → hoja) que llega al area_scope_id dado, para preseleccionar la cascada al editar. */
  private buscarRuta(nodos: AreaScopeTreeDto[], areaScopeId: number): AreaScopeTreeDto[] | null {
    for (const nodo of nodos) {
      if (nodo.areaScopeId === areaScopeId) return [nodo];
      const ruta = this.buscarRuta(nodo.children, areaScopeId);
      if (ruta) return [nodo, ...ruta];
    }
    return null;
  }

  agregarRegla(): void {
    const regla = this.reglaVacia();
    this.reglas.push(regla);
    this.cargarPuestos(regla);
  }

  removerRegla(index: number): void {
    this.reglas.splice(index, 1);
    this.previsualizar();
  }

  private areaScopeIdDeRegla(regla: ReglaConvocatoria): number | null {
    return regla.areaScopePath.length > 0
      ? regla.areaScopePath[regla.areaScopePath.length - 1].areaScopeId
      : null;
  }

  /** Un select por nivel para esta regla: raíz (gerencias) y luego los hijos elegidos en cascada. */
  nivelesRegla(regla: ReglaConvocatoria): AreaScopeTreeDto[][] {
    const niveles: AreaScopeTreeDto[][] = [this.arbol];
    let actual = regla.areaScopePath[0];
    let i = 0;
    while (actual && actual.children.length > 0) {
      niveles.push(actual.children);
      i++;
      actual = regla.areaScopePath[i];
    }
    return niveles;
  }

  /** Placeholder del select de un nivel, con el nombre real del tipo de nodo (Gerencia, Área, Subárea...). */
  placeholderNivel(opciones: AreaScopeTreeDto[], nivel: number): string {
    const tipo = opciones[0]?.areaTypeName?.toLowerCase();
    if (!tipo) return nivel === 0 ? 'Todas las gerencias' : 'Todas (opcional)';
    return nivel === 0 ? `Todas las ${tipo}` : `Todas (opcional)`;
  }

  onNivelReglaChange(regla: ReglaConvocatoria, nivel: number, areaScopeId: number | null): void {
    const opciones = this.nivelesRegla(regla)[nivel] ?? [];
    const nodo = opciones.find((n) => n.areaScopeId === areaScopeId) ?? null;
    regla.areaScopePath = regla.areaScopePath.slice(0, nivel);
    if (nodo) regla.areaScopePath.push(nodo);
    this.cargarPuestos(regla);
    this.previsualizar();
  }

  onProjectIdReglaChange(regla: ReglaConvocatoria, projectId: number | null): void {
    regla.projectId = projectId;
    if (projectId == null) {
      regla.staff = [];
      this.previsualizar();
      return;
    }
    this.cargarStaff(regla);
  }

  private cargarPuestos(regla: ReglaConvocatoria): void {
    const marcadosPrevios = new Set(regla.puestos.filter((p) => p.marcado).map((p) => p.id));
    this.service.getPuestosPorArea(this.areaScopeIdDeRegla(regla)).subscribe({
      next: (data) => {
        regla.puestos = data.map((p) => ({
          id: p.id,
          descripcion: p.descripcion,
          marcado: marcadosPrevios.has(p.id),
        }));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  /**
   * Trae el staff vigente del proyecto elegido y lo deja como checklist editable (todos marcados
   * por defecto). `workerIdsExcluidos` solo se usa al reabrir el modal para editar una regla ya
   * guardada — es la lista que vino del backend, no algo que el usuario elija en el momento.
   */
  private cargarStaff(regla: ReglaConvocatoria, workerIdsExcluidos: number[] = []): void {
    if (regla.projectId == null) {
      regla.staff = [];
      return;
    }
    const excluidos = new Set(workerIdsExcluidos);
    this.service.buscarTrabajadoresPorFiltro(null, null, regla.projectId).subscribe({
      next: (data) => {
        regla.staff = data.map((t) => ({
          workerId: t.workerId,
          nombre: t.fullName,
          cargo: t.cargo ?? '',
          marcado: !excluidos.has(t.workerId),
        }));
        this.previsualizar();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  staffFiltrado(regla: ReglaConvocatoria): StaffRow[] {
    const texto = regla.filtroStaff.trim().toLowerCase();
    if (!texto) return regla.staff;
    return regla.staff.filter((s) => s.nombre.toLowerCase().includes(texto));
  }

  todosStaffMarcados(regla: ReglaConvocatoria): boolean {
    const visibles = this.staffFiltrado(regla);
    return visibles.length > 0 && visibles.every((s) => s.marcado);
  }

  toggleTodosStaff(regla: ReglaConvocatoria, valor: boolean): void {
    this.staffFiltrado(regla).forEach((s) => (s.marcado = valor));
    this.previsualizar();
  }

  onStaffToggle(): void {
    this.previsualizar();
  }

  puestosFiltrados(regla: ReglaConvocatoria): PuestoRow[] {
    const texto = regla.filtroPuesto.trim().toLowerCase();
    if (!texto) return regla.puestos;
    return regla.puestos.filter((p) => p.descripcion.toLowerCase().includes(texto));
  }

  todosPuestosMarcados(regla: ReglaConvocatoria): boolean {
    const visibles = this.puestosFiltrados(regla);
    return visibles.length > 0 && visibles.every((p) => p.marcado);
  }

  toggleTodosPuestos(regla: ReglaConvocatoria, valor: boolean): void {
    this.puestosFiltrados(regla).forEach((p) => (p.marcado = valor));
    this.previsualizar();
  }

  onPuestoToggle(): void {
    this.previsualizar();
  }

  onAgendaFijaChange(): void {
    if (this.agendaFija) {
      this.recordatorioHorasAntes = null;
    } else {
      this.agendaTexto = '';
    }
  }

  private puestoIdsDeRegla(regla: ReglaConvocatoria): number[] {
    return regla.puestos.filter((p) => p.marcado).map((p) => p.id);
  }

  /** Una regla vacía (sin área, puestos ni proyecto) no aportaría a nadie: se ignora al guardar/previsualizar. */
  private reglaValida(regla: ReglaConvocatoria): boolean {
    return (
      this.areaScopeIdDeRegla(regla) != null ||
      this.puestoIdsDeRegla(regla).length > 0 ||
      regla.projectId != null
    );
  }

  /** Debounced: recalcula quién calzaría como participante con las reglas elegidas (unión, sin duplicar). */
  private previsualizar(): void {
    clearTimeout(this.previewTimer);
    const reglasValidas = this.reglas.filter((r) => this.reglaValida(r));
    if (reglasValidas.length === 0) {
      this.trabajadoresPreview = [];
      this.cdr.detectChanges();
      return;
    }
    this.previewTimer = setTimeout(() => {
      this.buscando = true;
      this.cdr.detectChanges();
      forkJoin(
        reglasValidas.map((r) =>
          r.modo === 'PROYECTO'
            ? of(
                r.staff
                  .filter((s) => s.marcado)
                  .map((s): TrabajadorAbrilDTO => ({ workerId: s.workerId, fullName: s.nombre, cargo: s.cargo })),
              )
            : this.service.buscarTrabajadoresPorFiltro(this.areaScopeIdDeRegla(r), this.puestoIdsDeRegla(r), null),
        ),
      ).subscribe({
        next: (resultados) => {
          this.buscando = false;
          const vistos = new Set<number>();
          const trabajadores: TrabajadorAbrilDTO[] = [];
          for (const lista of resultados) {
            for (const t of lista) {
              if (vistos.has(t.workerId)) continue;
              vistos.add(t.workerId);
              trabajadores.push(t);
            }
          }
          this.trabajadoresPreview = trabajadores;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.buscando = false;
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    }, 300);
  }

  private getValidationErrors(): string[] {
    const errors: string[] = [];
    if (this.agendaFija && !this.agendaTexto.trim()) {
      errors.push('El texto de la agenda fija');
    }
    return errors;
  }

  guardarConfiguracion(): void {
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      const listHtml = errors.map((e) => `<li>${e}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        html: `<ul style="text-align:left;font-size:0.85rem;padding-left:1.4rem;line-height:2">${listHtml}</ul>`,
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    const reglas: TemaConvocatoriaReglaInput[] = this.reglas
      .filter((r) => this.reglaValida(r))
      .map((r) => ({
        areaScopeId: this.areaScopeIdDeRegla(r),
        projectId: r.projectId,
        puestoIds: this.puestoIdsDeRegla(r),
        workerIdsExcluidos: r.projectId != null ? r.staff.filter((s) => !s.marcado).map((s) => s.workerId) : [],
      }));

    this.guardar.emit({
      config: {
        reglas,
        agendaFija: this.agendaFija,
        agendaTexto: this.agendaFija ? this.agendaTexto.trim() || null : null,
        recordatorioHorasAntes: !this.agendaFija ? this.recordatorioHorasAntes : null,
      },
      trabajadores: this.trabajadoresPreview,
    });
  }
}
