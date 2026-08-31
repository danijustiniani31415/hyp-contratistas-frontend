import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';
import {
  CatalogoDTO,
  ProyectoFiltroDTO,
  ReunionParticipanteInput,
  ReunionTemaOpcionDTO,
  TemaConvocatoriaSaveRequest,
  TrabajadorAbrilDTO,
} from '../../dtos/actas-reunion.dto';
import { ParticipanteAdd, ParticipanteSeleccionado } from '../participante-add/participante-add';
import { ConvocatoriaMasiva } from '../convocatoria-masiva/convocatoria-masiva';
import { ConvocatoriaTema, ConvocatoriaTemaResultado } from '../convocatoria-tema/convocatoria-tema';
import { AreaScopeService } from '../../../../configuracion/shared/services/area-scope.service';
import { AreaScopeTreeDto } from '../../../../configuracion/shared/dtos/areaScope.model';

interface ParticipanteRow {
  workerId: number | null;
  nombre: string;
  cargo: string;
  iniciales: string;
  inicialesEditadas: boolean;
}

@Component({
  selector: 'app-reunion-add',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, DatePicker, SearchSelect, ParticipanteAdd, ConvocatoriaMasiva, ConvocatoriaTema],
  templateUrl: './reunion-add.html',
})
export class ReunionAdd implements OnInit {
  @Input() proyectos: ProyectoFiltroDTO[] = [];
  /** Trabajadores de Abril para los desplegables de "Convocado por" y participantes. */
  @Input() trabajadores: TrabajadorAbrilDTO[] = [];
  /** Temas predefinidos (catálogo reunion_tema) para el desplegable de "Tema de la reunión". */
  @Input() temas: ReunionTemaOpcionDTO[] = [];
  /** Preselecciona el proyecto (al agendar desde el detalle de otra reunión). */
  @Input() projectIdFijo: number | null = null;
  /** Reunión desde la que se promueve el tema de esta nueva reunión. */
  @Input() reunionAnteriorId: number | null = null;
  @Input() reunionAnteriorLabel = '';
  /** Participantes sugeridos (se copian de la reunión anterior). */
  @Input() set participantesSugeridos(value: ReunionParticipanteInput[] | null) {
    if (value?.length) {
      this.participantes = value.map((p) => ({
        workerId: p.workerId ?? null,
        nombre: p.nombre,
        cargo: p.cargo ?? '',
        iniciales: p.iniciales ?? '',
        inicialesEditadas: !!p.iniciales,
      }));
    }
  }

  @Output() closeModal = new EventEmitter<void>();
  @Output() created = new EventEmitter<number>();

  /** Alcance de la reunión: un proyecto puntual, un nodo del árbol de áreas/gerencias, o toda la organización. */
  tipoAmbito: 'PROYECTO' | 'AREA' | 'ORGANIZACION' = 'PROYECTO';

  projectId: number | null = null;

  /** Árbol completo (gerencias en la raíz, cada una con sus áreas/subáreas anidadas). */
  arbolAreaScope: AreaScopeTreeDto[] = [];
  /** Nodo elegido en cada nivel de la cascada (gerencia, luego área, luego subárea si existe). */
  areaScopePath: AreaScopeTreeDto[] = [];

  tema = '';
  /**
   * Con el checkbox activo el desplegable de temas se convierte en un campo de texto libre.
   * El tema escrito a mano solo se guarda en la reunión, no en el catálogo de temas.
   */
  temaPersonalizado = false;
  /** Id del tema del catálogo elegido en el desplegable (null si es personalizado o aún no elige). */
  reunionTemaIdSeleccionado: number | null = null;
  /** Si está activo, al agendar se agrega el tema personalizado al catálogo como tema recurrente. */
  guardarTemaComoRecurrente = false;
  /** Agenda ad-hoc obligatoria cuando la reunión es puntual (temaPersonalizado && !guardarTemaComoRecurrente). */
  agendaTexto = '';
  /** Convocatoria recurrente configurada en el modal (área/puestos/agenda) para el tema nuevo. */
  convocatoriaTemaConfig: TemaConvocatoriaSaveRequest | null = null;
  showConvocatoriaTemaModal = false;
  convocadoPor = '';
  lugar = '';
  /** Con el checkbox activo, "Lugar" se convierte en texto libre en vez de elegir un proyecto. */
  lugarPersonalizado = false;
  fecha: string | null = null;
  horaInicio = '';
  horaFin = '';

  participantes: ParticipanteRow[] = [];
  showParticipanteModal = false;
  showConvocatoriaMasivaModal = false;

  constructor(
    private service: ActasReunionService,
    private areaScopeService: AreaScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    if (this.projectIdFijo != null) this.projectId = this.projectIdFijo;
    this.areaScopeService.getTree().subscribe({
      next: (data) => (this.arbolAreaScope = data),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
    if (this.tipoAmbito === 'PROYECTO') this.lugar = this.projectDescriptionOf(this.projectId);
  }

  /** Cambiar el ámbito resetea el lugar a su valor por defecto (misma idea que resetear proyecto/área). */
  onTipoAmbitoChange(): void {
    this.projectId = null;
    this.areaScopePath = [];
    this.lugarPersonalizado = this.tipoAmbito !== 'PROYECTO';
    this.lugar = this.lugarPersonalizado ? 'Oficina Central' : '';

    // El tema elegido puede dejar de ser válido para el nuevo ámbito (ej. un tema de área al
    // pasar a "Un proyecto"): si ya no está en la lista filtrada, se limpia.
    if (!this.temaPersonalizado && this.tema && !this.temasFiltrados.some((t) => t.descripcion === this.tema)) {
      this.tema = '';
      this.reunionTemaIdSeleccionado = null;
    }
  }

  /** El proyecto elegido en "Proyecto *" prellena "Lugar" — salvo que ya esté en modo personalizado. */
  onProjectIdChange(projectId: number | null): void {
    this.projectId = projectId;
    if (this.lugarPersonalizado) return;
    this.lugar = this.projectDescriptionOf(projectId);
  }

  onLugarPersonalizadoChange(): void {
    if (this.lugarPersonalizado) {
      this.lugar = '';
      return;
    }
    this.lugar = this.tipoAmbito === 'PROYECTO' ? this.projectDescriptionOf(this.projectId) : 'Oficina Central';
  }

  private projectDescriptionOf(projectId: number | null): string {
    return this.proyectos.find((p) => p.projectId === projectId)?.projectDescription ?? '';
  }

  /** Un select por nivel: raíz (gerencias) y luego los hijos del nodo elegido en el nivel anterior. */
  get nivelesAreaScope(): AreaScopeTreeDto[][] {
    const niveles: AreaScopeTreeDto[][] = [this.arbolAreaScope];
    let actual = this.areaScopePath[0];
    let i = 0;
    while (actual && actual.children.length > 0) {
      niveles.push(actual.children);
      i++;
      actual = this.areaScopePath[i];
    }
    return niveles;
  }

  onNivelAreaScopeChange(nivel: number, areaScopeId: number | null): void {
    const opciones = this.nivelesAreaScope[nivel] ?? [];
    const nodo = opciones.find((n) => n.areaScopeId === areaScopeId) ?? null;
    this.areaScopePath = this.areaScopePath.slice(0, nivel);
    if (nodo) this.areaScopePath.push(nodo);
  }

  /** Placeholder del select de un nivel de la cascada, con el nombre real del tipo de nodo (Gerencia, Área, Subárea...). */
  placeholderNivel(opciones: AreaScopeTreeDto[], nivel: number, opcional = false): string {
    const tipo = opciones[0]?.areaTypeName?.toLowerCase();
    if (!tipo) return nivel === 0 && !opcional ? 'Selecciona una gerencia' : 'Selecciona (opcional)';
    return nivel === 0 && !opcional ? `Selecciona ${tipo}` : `Selecciona ${tipo} (opcional)`;
  }

  get areaScopeIdSeleccionado(): number | null {
    return this.areaScopePath.length > 0
      ? this.areaScopePath[this.areaScopePath.length - 1].areaScopeId
      : null;
  }

  /** Proyecto para el atajo "Todo el staff de este proyecto": el fijo, o el elegido en el ámbito. */
  get projectIdParaStaff(): number | null {
    return this.projectIdFijo ?? (this.tipoAmbito === 'PROYECTO' ? this.projectId : null);
  }

  agregarStaffDelProyecto(): void {
    const projectId = this.projectIdParaStaff;
    if (projectId == null) return;
    this.loaderService.show();
    this.service.buscarTrabajadoresPorFiltro(null, null, projectId).subscribe({
      next: (trabajadores) => {
        this.loaderService.hide();
        if (trabajadores.length === 0) {
          Swal.fire({
            icon: 'info',
            title: 'Sin resultados',
            text: 'No se encontró staff asignado a este proyecto.',
            confirmButtonColor: 'var(--color-abril-primary)',
          });
          return;
        }
        this.onTrabajadoresAgregadosMasivamente(trabajadores);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Opciones del desplegable "Convocado por": los trabajadores de Abril más, si hace
   * falta, el valor actual (por si viene precargado y no está en la lista).
   */
  get opcionesConvocadoPor(): TrabajadorAbrilDTO[] {
    const actual = this.convocadoPor.trim();
    if (!actual || this.trabajadores.some((t) => t.fullName === actual)) return this.trabajadores;
    return [{ workerId: 0, fullName: actual, cargo: null }, ...this.trabajadores];
  }

  get inicialesActuales(): string[] {
    return this.participantes.map((p) => p.iniciales).filter(Boolean);
  }

  /**
   * Temas visibles en el desplegable según el ámbito elegido: un tema con convocatoria recurrente
   * atada a un área/gerencia (ej. "Reunión de Jefaturas de Proyectos") no tiene sentido al agendar
   * una reunión de un proyecto puntual, así que se oculta en ese caso. Para ámbito Área/Organización
   * se muestran todos (no hay, hoy, un tema exclusivo de un proyecto para filtrar al revés).
   */
  get temasFiltrados(): ReunionTemaOpcionDTO[] {
    if (this.tipoAmbito !== 'PROYECTO') return this.temas;
    return this.temas.filter((t) => t.areaScopeId == null);
  }

  /** Al alternar entre desplegable y texto libre se limpia el tema para no mezclar valores. */
  onTemaPersonalizadoChange(): void {
    this.tema = '';
    this.reunionTemaIdSeleccionado = null;
    this.guardarTemaComoRecurrente = false;
    this.convocatoriaTemaConfig = null;
  }

  /** Al marcar el checkbox se abre el modal de configuración; si se desmarca, se olvida lo configurado. */
  onGuardarTemaComoRecurrenteChange(): void {
    if (this.guardarTemaComoRecurrente) {
      this.showConvocatoriaTemaModal = true;
    } else {
      this.convocatoriaTemaConfig = null;
    }
  }

  onConvocatoriaTemaGuardada(resultado: ConvocatoriaTemaResultado): void {
    this.convocatoriaTemaConfig = resultado.config;
    this.onTrabajadoresAgregadosMasivamente(resultado.trabajadores);
    this.showConvocatoriaTemaModal = false;
  }

  onConvocatoriaTemaCancelada(): void {
    this.showConvocatoriaTemaModal = false;
    // Si nunca se llegó a guardar una configuración, cancelar destilda el checkbox.
    if (!this.convocatoriaTemaConfig) this.guardarTemaComoRecurrente = false;
  }

  /**
   * Al elegir un tema del catálogo, si tiene una convocatoria recurrente configurada
   * (área/puestos habituales), se agregan automáticamente esos trabajadores como
   * participantes sugeridos — sin pisar a los que ya se hayan agregado a mano.
   */
  onTemaSeleccionado(valor: string | null): void {
    this.tema = valor ?? '';
    const temaElegido = this.temas.find((t) => t.descripcion === this.tema);
    this.reunionTemaIdSeleccionado = temaElegido?.id ?? null;
    if (!temaElegido) return;

    this.service.getConvocatoriaTema(temaElegido.id).subscribe({
      next: (convocatoria) => {
        // El tema recurrente ya trae su propio ámbito (a quién convoca): pedirle al usuario que
        // además elija Proyecto/Área/Organización a mano es redundante, así que se autocompleta
        // (queda editable, no se fuerza si el proyecto ya viene fijo desde afuera). Solo tiene
        // sentido cuando hay UNA sola regla — con varias (áreas/proyectos distintos combinados)
        // ningún ámbito único las representaría bien, así que se deja en Organización por defecto.
        if (this.projectIdFijo == null) {
          const unicaRegla = convocatoria.reglas.length === 1 ? convocatoria.reglas[0] : null;
          if (unicaRegla?.areaScopeId != null) {
            this.tipoAmbito = 'AREA';
            this.areaScopePath = this.buscarRuta(this.arbolAreaScope, unicaRegla.areaScopeId) ?? [];
            this.projectId = null;
          } else if (unicaRegla?.projectId != null) {
            this.tipoAmbito = 'PROYECTO';
            this.projectId = unicaRegla.projectId;
            this.areaScopePath = [];
          } else {
            this.tipoAmbito = 'ORGANIZACION';
            this.areaScopePath = [];
            this.projectId = null;
          }
        }

        const reglasValidas = convocatoria.reglas.filter(
          (r) => r.areaScopeId != null || r.projectId != null || r.puestoIds.length > 0,
        );
        if (reglasValidas.length === 0) return;
        forkJoin(
          reglasValidas.map((r) => this.service.buscarTrabajadoresPorFiltro(r.areaScopeId, r.puestoIds, r.projectId)),
        ).subscribe({
          next: (resultados) => {
            // Los excluidos a mano de una regla "Staff de un proyecto" no deben volver a colarse aquí.
            const trabajadores = resultados.flatMap((lista, i) => {
              const excluidos = new Set(reglasValidas[i].workerIdsExcluidos);
              return lista.filter((t) => !excluidos.has(t.workerId));
            });
            this.onTrabajadoresAgregadosMasivamente(trabajadores);
          },
          error: () => {},
        });
      },
      error: () => {},
    });
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

  addParticipante(): void {
    this.showParticipanteModal = true;
  }

  onParticipanteAgregado(p: ParticipanteSeleccionado): void {
    this.participantes.push({
      workerId: p.workerId,
      nombre: p.nombre,
      cargo: p.cargo,
      iniciales: p.iniciales,
      inicialesEditadas: !!p.iniciales,
    });
    this.showParticipanteModal = false;
  }

  removeParticipante(index: number): void {
    this.participantes.splice(index, 1);
  }

  abrirConvocatoriaMasiva(): void {
    this.showConvocatoriaMasivaModal = true;
  }

  onTrabajadoresAgregadosMasivamente(trabajadores: TrabajadorAbrilDTO[]): void {
    const yaAgregados = new Set(
      this.participantes.filter((p) => p.workerId != null).map((p) => p.workerId),
    );
    for (const t of trabajadores) {
      if (yaAgregados.has(t.workerId)) continue;
      this.participantes.push({
        workerId: t.workerId,
        nombre: t.fullName,
        cargo: t.cargo ?? '',
        iniciales: this.generarIniciales(t.fullName),
        inicialesEditadas: false,
      });
      yaAgregados.add(t.workerId);
    }
    this.showConvocatoriaMasivaModal = false;
  }

  /** Autogenera iniciales a partir del nombre mientras el usuario no las haya editado. */
  onNombreChange(row: ParticipanteRow): void {
    if (row.inicialesEditadas) return;
    row.iniciales = this.generarIniciales(row.nombre);
  }

  onInicialesChange(row: ParticipanteRow): void {
    row.inicialesEditadas = true;
  }

  private generarIniciales(nombre: string): string {
    const base = nombre
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
    if (!base) return '';
    // Evita iniciales duplicadas dentro de la misma reunión (ej. "MC", "MC 2")
    const repetidas = this.participantes.filter(
      (p) => p.iniciales === base || p.iniciales.startsWith(base + ' '),
    ).length;
    return repetidas > 0 ? `${base} ${repetidas + 1}` : base;
  }

  private getValidationErrors(): string[] {
    const errors: string[] = [];
    if (this.tipoAmbito === 'PROYECTO' && this.projectId == null) errors.push('Proyecto');
    if (this.tipoAmbito === 'AREA' && this.areaScopeIdSeleccionado == null) errors.push('Área/gerencia');
    if (!this.tema.trim()) errors.push('Tema de la reunión');
    if (!this.fecha) errors.push('Fecha de la reunión');
    if (this.horaInicio && this.horaFin && this.horaFin <= this.horaInicio)
      errors.push('La hora de término debe ser mayor a la hora de inicio');
    if (this.temaPersonalizado && !this.guardarTemaComoRecurrente && !this.agendaTexto.trim())
      errors.push('Agenda de la reunión (mínimo 1 punto)');
    return errors;
  }

  submit(): void {
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

    const participantes: ReunionParticipanteInput[] = this.participantes
      .filter((p) => p.nombre.trim())
      .map((p) => ({
        reunionParticipanteId: null,
        workerId: p.workerId,
        nombre: p.nombre.trim(),
        cargo: p.cargo.trim() || null,
        iniciales: p.iniciales.trim() || null,
        asistio: false,
      }));

    this.loaderService.show();

    // Si se guarda como tema recurrente, el tema del catálogo (y su agenda fija/dinámica) debe
    // quedar creado ANTES de agendar la reunión, para que esta se vincule con su reunionTemaId
    // real en vez de quedar con tema personalizado suelto (sin agenda garantizada).
    if (this.temaPersonalizado && this.guardarTemaComoRecurrente && this.convocatoriaTemaConfig) {
      const config = this.convocatoriaTemaConfig;
      this.service.agregarTema(this.tema.trim()).subscribe({
        next: (nuevoTema) => {
          this.service.guardarConvocatoriaTema(nuevoTema.id, config).subscribe({
            next: () => this.crearReunion(nuevoTema.id, participantes),
            error: (err: HttpErrorResponse) => {
              // La convocatoria no se pudo guardar, pero el tema sí existe: se sigue agendando
              // con ese tema para no perder el trabajo del usuario, solo se avisa del detalle.
              this.errorService.handleError(err);
              this.crearReunion(nuevoTema.id, participantes);
            },
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
      return;
    }

    this.crearReunion(this.temaPersonalizado ? null : this.reunionTemaIdSeleccionado, participantes);
  }

  private crearReunion(reunionTemaId: number | null, participantes: ReunionParticipanteInput[]): void {
    this.service
      .create({
        projectId: this.tipoAmbito === 'PROYECTO' ? this.projectId! : null,
        areaScopeId: this.tipoAmbito === 'AREA' ? this.areaScopeIdSeleccionado : null,
        tema: this.tema.trim(),
        reunionTemaId,
        convocadoPor: this.convocadoPor.trim() || null,
        lugar: this.lugar.trim() || null,
        fecha: this.fecha!,
        horaInicio: this.horaInicio ? `${this.horaInicio}:00` : null,
        horaFin: this.horaFin ? `${this.horaFin}:00` : null,
        reunionAnteriorId: this.reunionAnteriorId,
        agendaTexto: reunionTemaId == null ? this.agendaTexto.trim() || null : null,
        participantes,
      })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: '¡Reunión agendada!',
            text: 'La reunión fue agendada correctamente.',
            confirmButtonColor: 'var(--color-abril-primary)',
          });
          this.created.emit(res.reunionId);
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
