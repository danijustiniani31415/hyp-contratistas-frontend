import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ActasReunionService } from '../services/actas-reunion.service';
import { AreaScopeService } from '../../../configuracion/shared/services/area-scope.service';
import { AreaScopeTreeDto } from '../../../configuracion/shared/dtos/areaScope.model';
import {
  ProyectoFiltroDTO,
  ReunionFolderDTO,
  ReunionTemaOpcionDTO,
  TemaConvocatoriaReglaInput,
  TemaRecurrenciaDTO,
} from '../dtos/actas-reunion.dto';

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

/**
 * Configuración de la carpeta de SharePoint/OneDrive donde se guardan los archivos
 * adjuntos de las actas de reunión. Existe un único registro: el usuario pega un link,
 * el sistema lo detecta (resuelve la carpeta vía Graph) y a partir de ahí todos los
 * adjuntos se suben ahí (en una subcarpeta por reunión).
 */
@Component({
  selector: 'app-actas-reunion-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './actas-reunion-configuracion.html',
})
export class ActasReunionConfiguracion implements OnInit {
  folder: ReunionFolderDTO | null = null;
  linkUrl = '';

  // ── Convocatoria recurrente por tema ──────────────────────────────────────
  temas: ReunionTemaOpcionDTO[] = [];
  proyectos: ProyectoFiltroDTO[] = [];
  temaSeleccionadoId: number | null = null;
  arbol: AreaScopeTreeDto[] = [];
  /** Varias reglas independientes (ej. jefaturas de una gerencia + un gerente de otra). */
  reglas: ReglaConvocatoria[] = [this.reglaVacia()];

  // ── Agenda + recordatorio (toda reunión requiere agenda: fija o dinámica) ──
  agendaFija = false;
  agendaTexto = '';
  recordatorioHorasAntes: number | null = null;

  // ── Recurrencia (generación automática de la siguiente reunión) ───────────
  esRecurrente = false;
  recurrenciaActiva = true;
  recurrenciaAreaScopePath: AreaScopeTreeDto[] = [];
  intervaloDias: number | null = 14;
  fechaAncla: string | null = null;
  horaInicioRecurrencia: string | null = null;
  horaFinRecurrencia: string | null = null;
  lugarRecurrencia = '';
  diasAnticipacion = 5;
  ultimaFechaGenerada: string | null = null;
  proximaFechaEstimada: string | null = null;

  constructor(
    private service: ActasReunionService,
    private areaScopeService: AreaScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
    this.service.getTemasCatalogo().subscribe({
      next: (data) => {
        this.temas = data;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
    this.areaScopeService.getTree().subscribe({
      next: (data) => {
        this.arbol = data;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
    this.service
      .getPaginaInicial({ projectId: null, areaScopeId: null, reunionEstadoId: null, desde: null, hasta: null, page: 1, pageSize: 1 })
      .subscribe({
        next: (data) => {
          this.proyectos = data.proyectos;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
  }

  private reglaVacia(): ReglaConvocatoria {
    return { modo: 'AREA_PUESTO', areaScopePath: [], puestos: [], filtroPuesto: '', projectId: null, staff: [], filtroStaff: '' };
  }

  /**
   * Cada regla convoca por área/puesto O por staff de un proyecto, nunca ambos: combinarlos filtraba
   * con AND (intersección) y solía dar cero resultados. Al cambiar de modo se limpia el otro lado
   * para que la regla quede siempre en un estado válido; para convocar a varios grupos se usa otra regla.
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
  }

  /** Busca la cadena de nodos (raíz → hoja) que llega al area_scope_id dado, para preseleccionar la cascada. */
  private buscarRuta(nodos: AreaScopeTreeDto[], areaScopeId: number): AreaScopeTreeDto[] | null {
    for (const nodo of nodos) {
      if (nodo.areaScopeId === areaScopeId) return [nodo];
      const ruta = this.buscarRuta(nodo.children, areaScopeId);
      if (ruta) return [nodo, ...ruta];
    }
    return null;
  }

  private areaScopeIdDeRegla(regla: ReglaConvocatoria): number | null {
    return regla.areaScopePath.length > 0
      ? regla.areaScopePath[regla.areaScopePath.length - 1].areaScopeId
      : null;
  }

  private cargarPuestos(regla: ReglaConvocatoria, puestoIdsMarcados?: number[]): void {
    const marcadosPrevios = puestoIdsMarcados
      ? new Set(puestoIdsMarcados)
      : new Set(regla.puestos.filter((p) => p.marcado).map((p) => p.id));
    this.service.getPuestosPorArea(this.areaScopeIdDeRegla(regla)).subscribe({
      next: (data) => {
        regla.puestos = data.map((p) => ({
          id: p.id,
          descripcion: p.descripcion,
          marcado: marcadosPrevios.has(p.id),
        }));
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  /**
   * Trae el staff vigente del proyecto elegido y lo deja como checklist editable (todos marcados
   * por defecto). `workerIdsExcluidos` solo se usa al reabrir un tema ya configurado — es la lista
   * que vino del backend, no algo que el usuario elija en el momento.
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
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
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
  }

  nuevoTema(): void {
    Swal.fire({
      title: 'Nuevo tema',
      input: 'text',
      inputPlaceholder: 'Ej. Reunión de Comité de Obra',
      inputAttributes: { maxlength: '300' },
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-primary)',
      inputValidator: (value) => (!value?.trim() ? 'Escribe un nombre para el tema' : undefined),
    }).then((result) => {
      if (!result.isConfirmed || !result.value?.trim()) return;
      this.loaderService.show();
      this.service.agregarTema(result.value.trim()).subscribe({
        next: (nuevoTema) => {
          this.loaderService.hide();
          if (!this.temas.some((t) => t.id === nuevoTema.id)) {
            this.temas = [...this.temas, { ...nuevoTema, areaScopeId: null }].sort((a, b) =>
              a.descripcion.localeCompare(b.descripcion),
            );
          }
          this.temaSeleccionadoId = nuevoTema.id;
          this.onTemaSeleccionadoChange();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  onTemaSeleccionadoChange(): void {
    this.reglas = [this.reglaVacia()];
    this.agendaFija = false;
    this.agendaTexto = '';
    this.recordatorioHorasAntes = null;
    this.esRecurrente = false;
    this.recurrenciaActiva = true;
    this.recurrenciaAreaScopePath = [];
    this.intervaloDias = 14;
    this.fechaAncla = null;
    this.horaInicioRecurrencia = null;
    this.horaFinRecurrencia = null;
    this.lugarRecurrencia = '';
    this.diasAnticipacion = 5;
    this.ultimaFechaGenerada = null;
    this.proximaFechaEstimada = null;
    if (this.temaSeleccionadoId == null) return;

    this.service.getRecurrenciaTema(this.temaSeleccionadoId).subscribe({
      next: (data) => {
        this.esRecurrente = data.esRecurrente;
        this.recurrenciaActiva = data.recurrenciaActiva;
        this.recurrenciaAreaScopePath = data.areaScopeId != null ? this.buscarRuta(this.arbol, data.areaScopeId) ?? [] : [];
        this.intervaloDias = data.intervaloDias ?? 14;
        this.fechaAncla = data.fechaAncla;
        this.horaInicioRecurrencia = data.horaInicio;
        this.horaFinRecurrencia = data.horaFin;
        this.lugarRecurrencia = data.lugar ?? '';
        this.diasAnticipacion = data.diasAnticipacion || 5;
        this.ultimaFechaGenerada = data.ultimaFechaGenerada;
        this.proximaFechaEstimada = data.proximaFechaEstimada;
        this.cdr.detectChanges();
      },
      error: () => {},
    });

    this.loaderService.show();
    this.service.getConvocatoriaTema(this.temaSeleccionadoId).subscribe({
      next: (data) => {
        this.loaderService.hide();
        this.reglas =
          data.reglas.length > 0
            ? data.reglas.map((r) => ({
                modo: r.projectId != null ? ('PROYECTO' as const) : ('AREA_PUESTO' as const),
                areaScopePath: r.areaScopeId != null ? this.buscarRuta(this.arbol, r.areaScopeId) ?? [] : [],
                puestos: [] as PuestoRow[],
                filtroPuesto: '',
                projectId: r.projectId,
                staff: [] as StaffRow[],
                filtroStaff: '',
              }))
            : [this.reglaVacia()];
        this.reglas.forEach((regla, i) => {
          this.cargarPuestos(regla, data.reglas[i]?.puestoIds ?? []);
          if (regla.projectId != null) this.cargarStaff(regla, data.reglas[i]?.workerIdsExcluidos ?? []);
        });
        this.agendaFija = data.agendaFija;
        this.agendaTexto = data.agendaTexto ?? '';
        this.recordatorioHorasAntes = data.recordatorioHorasAntes;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onAgendaFijaChange(): void {
    if (this.agendaFija) {
      this.recordatorioHorasAntes = null;
    } else {
      this.agendaTexto = '';
    }
  }

  agregarRegla(): void {
    const regla = this.reglaVacia();
    this.reglas.push(regla);
    this.cargarPuestos(regla);
  }

  removerRegla(index: number): void {
    this.reglas.splice(index, 1);
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
  }

  onProjectIdReglaChange(regla: ReglaConvocatoria, projectId: number | null): void {
    regla.projectId = projectId;
    if (projectId == null) {
      regla.staff = [];
      return;
    }
    this.cargarStaff(regla);
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
  }

  private reglaValida(regla: ReglaConvocatoria): boolean {
    return (
      this.areaScopeIdDeRegla(regla) != null ||
      regla.puestos.some((p) => p.marcado) ||
      regla.projectId != null
    );
  }

  guardarConvocatoriaTema(): void {
    if (this.temaSeleccionadoId == null) return;

    const reglas: TemaConvocatoriaReglaInput[] = this.reglas
      .filter((r) => this.reglaValida(r))
      .map((r) => ({
        areaScopeId: this.areaScopeIdDeRegla(r),
        projectId: r.projectId,
        puestoIds: r.puestos.filter((p) => p.marcado).map((p) => p.id),
        workerIdsExcluidos: r.projectId != null ? r.staff.filter((s) => !s.marcado).map((s) => s.workerId) : [],
      }));

    this.loaderService.show();
    this.service
      .guardarConvocatoriaTema(this.temaSeleccionadoId, {
        reglas,
        agendaFija: this.agendaFija,
        agendaTexto: this.agendaFija ? this.agendaTexto.trim() || null : null,
        recordatorioHorasAntes: !this.agendaFija ? this.recordatorioHorasAntes : null,
      })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Convocatoria guardada',
            text: 'La próxima vez que se elija este tema, se sugerirán estos participantes automáticamente.',
            confirmButtonColor: 'var(--color-abril-primary)',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  // ── Recurrencia ────────────────────────────────────────────────────────────

  /** Un select por nivel para el área/gerencia de la serie (misma cascada que las reglas de convocatoria). */
  nivelesRecurrencia(): AreaScopeTreeDto[][] {
    const niveles: AreaScopeTreeDto[][] = [this.arbol];
    let actual = this.recurrenciaAreaScopePath[0];
    let i = 0;
    while (actual && actual.children.length > 0) {
      niveles.push(actual.children);
      i++;
      actual = this.recurrenciaAreaScopePath[i];
    }
    return niveles;
  }

  onNivelRecurrenciaChange(nivel: number, areaScopeId: number | null): void {
    const opciones = this.nivelesRecurrencia()[nivel] ?? [];
    const nodo = opciones.find((n) => n.areaScopeId === areaScopeId) ?? null;
    this.recurrenciaAreaScopePath = this.recurrenciaAreaScopePath.slice(0, nivel);
    if (nodo) this.recurrenciaAreaScopePath.push(nodo);
  }

  private get recurrenciaAreaScopeId(): number | null {
    return this.recurrenciaAreaScopePath.length > 0
      ? this.recurrenciaAreaScopePath[this.recurrenciaAreaScopePath.length - 1].areaScopeId
      : null;
  }

  guardarRecurrencia(): void {
    if (this.temaSeleccionadoId == null) return;

    if (this.esRecurrente) {
      if (this.recurrenciaAreaScopeId == null) {
        Swal.fire({
          icon: 'warning',
          title: 'Falta el área/gerencia',
          text: 'Indica a qué área/gerencia pertenecerán las reuniones generadas.',
          confirmButtonColor: 'var(--color-abril-primary)',
        });
        return;
      }
      if (!this.intervaloDias || this.intervaloDias <= 0 || !this.fechaAncla) {
        Swal.fire({
          icon: 'warning',
          title: 'Datos incompletos',
          text: 'Indica el intervalo en días y la fecha de la primera ocurrencia de la serie.',
          confirmButtonColor: 'var(--color-abril-primary)',
        });
        return;
      }
    }

    this.loaderService.show();
    this.service
      .guardarRecurrenciaTema(this.temaSeleccionadoId, {
        esRecurrente: this.esRecurrente,
        recurrenciaActiva: this.recurrenciaActiva,
        areaScopeId: this.recurrenciaAreaScopeId,
        intervaloDias: this.intervaloDias,
        fechaAncla: this.fechaAncla,
        horaInicio: this.horaInicioRecurrencia,
        horaFin: this.horaFinRecurrencia,
        lugar: this.lugarRecurrencia.trim() || null,
        diasAnticipacion: this.diasAnticipacion || 5,
      })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Recurrencia guardada',
            confirmButtonColor: 'var(--color-abril-primary)',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  /** Borrado real del catálogo (no soft-delete): falla si ya hay reuniones agendadas con este tema. */
  eliminarTema(): void {
    if (this.temaSeleccionadoId == null) return;
    const temaId = this.temaSeleccionadoId;
    const nombre = this.temas.find((t) => t.id === temaId)?.descripcion ?? 'este tema';

    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar tema?',
      html: `<b>${nombre}</b> se eliminará por completo del catálogo y ya no se podrá elegir en reuniones nuevas.
        Las reuniones que ya lo usan conservan su tema tal cual (solo se quitó el vínculo al catálogo); si alguna
        estaba programada con agenda dinámica pendiente, dejará de recibir el recordatorio automático.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.eliminarTema(temaId).subscribe({
        next: (res) => {
          this.loaderService.hide();
          this.temas = this.temas.filter((t) => t.id !== temaId);
          this.temaSeleccionadoId = null;
          this.onTemaSeleccionadoChange();
          Swal.fire({
            icon: 'success',
            title: 'Tema eliminado',
            text: res.reunionesDesvinculadas > 0
              ? `${res.reunionesDesvinculadas} reunión(es) que lo usaban conservan su tema tal cual.`
              : undefined,
            confirmButtonColor: 'var(--color-abril-primary)',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  volver(): void {
    this.router.navigate(['/projects/actas-reunion/lista']);
  }

  load(): void {
    this.loaderService.show();
    this.service.getCarpeta().subscribe({
      next: (res) => {
        this.folder = res;
        this.linkUrl = res?.linkUrl ?? '';
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  save(): void {
    if (!this.linkUrl.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Ingresa el link de la carpeta (SharePoint u OneDrive).',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    this.loaderService.show();
    this.service.saveCarpeta(this.linkUrl.trim()).subscribe({
      next: (res) => {
        this.folder = res;
        this.linkUrl = res.linkUrl;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Carpeta configurada',
          text: res.folderName
            ? `Los adjuntos de las actas se guardarán en: ${res.folderName}`
            : 'Carpeta detectada y guardada exitosamente.',
          confirmButtonColor: 'var(--color-abril-primary)',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
