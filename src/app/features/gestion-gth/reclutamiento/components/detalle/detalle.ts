import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Seleccionado } from '../../../shared/dtos/seleccionado.dto';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { TimePicker } from '../../../../../shared/components/time-picker/time-picker';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { ClientPager } from '../../../../../shared/utils/client-pager';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  FormularioEnvioMasivoItem,
  LongListCandidatoEnvio,
  ReclutamientoService,
} from '../../services/reclutamiento.service';
import {
  CoincidenciaAviso,
  DecisionFormularioAplicada,
  FormularioDecisionService,
} from '../../services/formulario-decision.service';
import {
  AsignacionGth,
  CandidatoAprobado,
  DetalleRequerimientoGth,
  EVALUACION_ARCHIVO,
  EvaluacionArchivo,
  Opcion,
} from '../../dtos/reclutamiento.dto';
import { CandidatoFormularioResumen } from '../../dtos/formulario-postulante.dto';
import { GthFormularioPostulanteModal } from '../formulario-postulante/formulario-postulante-modal';
import { estadoColors, faseAlcanzada } from '../../../shared/estado-colors';
import { CandidatoRechazado, etapaRechazoColors } from '../../../shared/dtos/candidato-rechazado.dto';

/**
 * Candidato cargado para la long list (estado local del modal). El guardado (SharePoint +
 * persistencia en BD) aún no está implementado: al cerrar el modal la carga se pierde.
 */
interface CandidatoLongList {
  /** Archivo del CV subido. */
  cv: File;
  /** Nombre y apellido (prellenado desde el nombre del archivo; el usuario lo corrige). */
  nombre: string;
  /** Observaciones internas de GTH sobre el candidato. */
  comentario: string;
  /** Portafolio/anexos del candidato: 0..n archivos además del CV. */
  anexos: File[];
}

/** Formatos que acepta el "Portafolio/Anexos" (los mismos que valida el backend). */
const ANEXOS_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp';

/**
 * Tope de lo que puede pesar el conjunto de archivos del envío (CVs + anexos). No es una regla
 * nuestra: es lo que acepta el proveedor de correo con los adjuntos adentro, y el backend lo
 * valida igual (`MaxLongListCorreoBytes`). Se comprueba también acá para avisar antes de subir
 * decenas de MB que el servidor va a rechazar.
 */
const MAX_LONG_LIST_CORREO_BYTES = 2_800_000;

/**
 * Correo válido para enviarle el formulario al postulante. Misma expresión que valida el backend
 * (`PostulanteFormularioService.EmailRegex`): la usan tanto el envío individual como el masivo.
 */
const CORREO_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Datos editables de la cita de un candidato en la sección de programación de entrevistas. */
interface EntrevistaFormState {
  /** Fecha en formato `YYYY-MM-DD` (el que maneja `app-date-picker`). */
  fecha: string | null;
  /** Hora en formato `HH:mm` 24h (el que maneja `app-time-picker`). */
  hora: string | null;
  /** Id del lugar elegido del catálogo `lugaresEntrevista`. */
  lugarId: number | null;
}

/**
 * Datos editables de la evaluación de la entrevista de un candidato: los tres comentarios que
 * arman el informe de finalista que ve el área solicitante, más sus dos archivos opcionales.
 */
interface EvaluacionFormState {
  comentarioEntrevista: string;
  comentarioPsicotecnico: string;
  comentarioRecomendacion: string;
  /** Archivo recién elegido por tipo (clave = código del catálogo). Aún no está subido. */
  archivosNuevos: Record<string, File | null>;
  /** Códigos de los archivos ya subidos que se quitaron: viajan en el guardado para darlos de baja. */
  quitados: string[];
}

/** Los dos documentos del informe, en el orden en que se muestran. Los dos son opcionales. */
const SLOTS_ARCHIVO_EVALUACION: { codigo: string; label: string }[] = [
  { codigo: EVALUACION_ARCHIVO.informeFinal, label: 'Informe final' },
  { codigo: EVALUACION_ARCHIVO.conocimientos, label: 'Resultados de evaluación de conocimientos' },
];

/** Formatos que aceptan los archivos del informe (los mismos que valida el backend). */
const EVALUACION_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp';

/**
 * Modal de detalle del requerimiento (vista de GTH, se abre con el ojo de la bandeja):
 * cabecera con código/estado/puesto + sección "Asignación interna de GTH" (responsable,
 * tipo de proceso y SLA, prioridad interna y razón social activa con sus cupos) + secciones
 * según la fase del pipeline: canales de publicación (antes de publicar) → "Revisión de CV"
 * (publicado) → "Long list: CVs seleccionados" (carga de candidatos). Los desplegables de la
 * asignación guardan al cambiar (optimista); publicar e iniciar la revisión avanzan la fase.
 */
@Component({
  standalone: true,
  selector: 'app-gth-detalle-requerimiento',
  imports: [
    CommonModule,
    FormsModule,
    AbrilModalPanel,
    StatusBadge,
    SearchSelect,
    SearchInput,
    Paginator,
    DatePicker,
    TimePicker,
    TitleCasePipe,
    GthFormularioPostulanteModal,
  ],
  templateUrl: './detalle.html',
})
export class GthDetalleRequerimiento implements OnInit {
  /** Id del requerimiento a mostrar. */
  @Input({ required: true }) requerimientoId!: number;
  /**
   * Candidato cuyo modal «Ver formulario» se abre solo al terminar de cargar el detalle. Lo usa el
   * enlace del correo de «formulario completado» para dejar a GTH directamente en la pantalla donde
   * aprueba o rechaza. null (lo normal) = el detalle abre sin nada encima.
   */
  @Input() abrirFormularioCandidatoId: number | null = null;
  /** Emite al cerrar; true si hubo cambios guardados (para refrescar la bandeja). */
  @Output() closeModal = new EventEmitter<boolean>();

  detalle: DetalleRequerimientoGth | null = null;

  /** Opciones del combo de tipo de proceso con el display "Junior · 20 días". */
  tiposProcesoOpts: Opcion[] = [];

  /** Selección actual de canales (ids marcados en los checkboxes). */
  canalesSeleccionados = new Set<number>();

  /**
   * Candidatos cargados para la long list (solo estado local por ahora: el guardado en
   * SharePoint/BD y el envío al solicitante se implementarán después).
   */
  candidatos: CandidatoLongList[] = [];

  // Secciones colapsables. Todas se abren y cierran igual, así GTH puede dejar a la vista solo lo
  // que está trabajando. El estado inicial no es fijo: al cargar el detalle, las de los pasos que
  // el proceso ya dejó atrás arrancan cerradas (ver colapsarSeccionesCompletadas). Van en el orden
  // en que aparecen en el modal.
  seccionPuestoCubierto = true;
  seccionAsignacion = true;
  seccionPublicacion = true;
  seccionRevisionCv = true;
  seccionLongList = true;
  seccionLongListAprobada = true;
  seccionFormularioPostulante = true;
  seccionMultitest = true;
  seccionEntrevistas = true;
  /**
   * "Historial de candidatos rechazados": arranca colapsada, al revés que el resto. Es una
   * consulta de respaldo (a quién ya se descartó), no un paso del proceso: abierta empujaría
   * hacia abajo la sección de la fase actual, que es lo que GTH viene a hacer.
   */
  seccionRechazados = false;

  /** Contenedor del historial de rechazados, para poder llevar la vista hasta él. */
  @ViewChild('historialRechazados') private historialRechazadosRef?: ElementRef<HTMLElement>;

  // La sección "Plantilla de comunicación" está comentada en el HTML: era una maqueta y su
  // envío es el mismo correo que ya manda "Enviar formulario". Su estado local
  // (`mostrarPlantilla`) se retira junto con ella para no dejar código muerto.

  /** true mientras se envía la long list (deshabilita el botón para evitar doble envío). */
  enviando = false;

  // ── Formulario de información del postulante (fase "Long list aprobada") ──
  /** Correo escrito por candidato para enviar el formulario (key = candidatoId). */
  correoFormulario: Record<number, string> = {};
  /** true mientras se envía el formulario de un candidato (key = candidatoId). */
  enviandoFormulario: Record<number, boolean> = {};
  /** true mientras se aprueba/rechaza el formulario de un candidato (key = candidatoId). */
  decidiendoFormulario: Record<number, boolean> = {};
  /** Candidatos marcados para el envío masivo del formulario (ids). */
  seleccionFormulario = new Set<number>();
  /** true mientras corre el envío masivo (deshabilita el botón para evitar doble envío). */
  enviandoMasivo = false;
  /** true mientras se saca del proceso a un postulante rechazado (key = candidatoId). */
  rechazandoPostulante: Record<number, boolean> = {};
  /** Candidato cuyo modal "Ver formulario" está abierto (null = cerrado). */
  formularioCandidatoId: number | null = null;

  /** true mientras se avanza a la fase de entrevistas (evita doble clic). */
  continuando = false;

  // ── Reapertura tras un EMO de ingreso No Apto ────────────────────────────
  /** true mientras se retoma a un rechazado (key = candidatoId): evita el doble clic. */
  retomando: Record<number, boolean> = {};
  /** true mientras se devuelve el proceso a Long list. */
  volviendoALongList = false;

  // ── Programación de entrevistas (fase "Entrevistas") ─────────────────────
  /** Datos editables de la cita por candidato (key = candidatoId). */
  entrevistaForm: Record<number, EntrevistaFormState> = {};
  /** Hora con la que arranca una cita sin programar: el inicio de la jornada. */
  private readonly horaEntrevistaPorDefecto = '08:00';
  /** true mientras se envía/reenvía la invitación de un candidato (key = candidatoId). */
  enviandoEntrevista: Record<number, boolean> = {};
  /** Evaluación editable de la entrevista por candidato (key = candidatoId). */
  evaluacionForm: Record<number, EvaluacionFormState> = {};
  /** true mientras se guarda la evaluación de un candidato (key = candidatoId). */
  guardandoEvaluacion: Record<number, boolean> = {};
  /** true mientras se envía el correo de fin de proceso de un candidato (key = candidatoId). */
  enviandoAgradecimiento: Record<number, boolean> = {};

  private huboCambios = false;

  constructor(
    private service: ReclutamientoService,
    private decisiones: FormularioDecisionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  /**
   * Salta a SSOMA · Salud Ocupacional · EMOs con la ficha del seleccionado enfocada y el modal
   * de programación abierto. No se programa desde acá a propósito: la funcionalidad de EMOs ya
   * existe (con sus clínicas, sus correos a la clínica y su control de duplicados) y duplicarla
   * en Reclutamiento sería tener dos formas de crear la misma cita.
   */
  programarEmoIngreso(sel: Seleccionado): void {
    if (!sel.workerId) return;
    this.closeModal.emit();
    this.router.navigate(['/ssoma/salud-ocupacional/emos'], {
      queryParams: { workerId: sel.workerId, programar: 1 },
    });
  }

  ngOnInit(): void {
    this.cargarDetalle();
  }

  /**
   * Trae (o vuelve a traer) el detalle completo del requerimiento. Se recarga cuando una acción
   * cambia la fase del proceso por detrás y no solo el trozo que se tocó: hoy pasa al aprobar el
   * formulario de un ingreso directo FFT, que además cierra la selección y salta al EMO.
   */
  private cargarDetalle(): void {
    this.loaderService.show();
    this.service.getDetalle(this.requerimientoId).subscribe({
      next: (data) => {
        this.detalle = data;
        this.tiposProcesoOpts = data.tiposProceso.map((t) => ({
          id: t.id,
          nombre: `${t.nombre} · ${t.slaDias} días`,
        }));
        this.canalesSeleccionados = new Set(
          data.canales.filter((c) => c.publicado).map((c) => c.id),
        );
        this.colapsarSeccionesCompletadas();
        if (this.longListAprobada) {
          // Prellena el correo de cada candidato con el último usado (si ya se envió) y, si no, con
          // su correo de contacto: en un FFT ese correo lo declaró el solicitante, así que el envío
          // del formulario —el único paso del flujo— sale sin tener que tipear nada.
          for (const c of data.candidatosAprobados) {
            const correo = c.formulario?.correoEnvio ?? c.correoContacto;
            if (correo) this.correoFormulario[c.candidatoId] = correo;
          }
        }
        this.prepararFormulariosEntrevista();
        this.abrirFormularioSolicitado();
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cerrar();
      },
    });
  }

  /**
   * Deja abiertas solo las secciones que todavía dan trabajo y cierra las de los pasos que el
   * proceso ya dejó atrás. El modal arrastra todas las fases recorridas y, desplegadas, empujan
   * hacia abajo la única que importa —la de la fase actual— y se leen como si fueran pasos
   * pendientes.
   *
   * Cerrada no es escondida: el encabezado sigue ahí y se abre con un clic, que es justo lo que se
   * quiere para consultar lo ya hecho.
   *
   * Se recalcula en cada carga del detalle (no solo en la primera) porque varias acciones avanzan
   * la fase y recargan: la sección que acaba de completarse tiene que cerrarse sola. Las que solo
   * existen mientras son el paso actual (publicación, revisión de CV, carga de la long list) no
   * aparecen acá: su `@if` ya las saca del modal cuando dejan de aplicar.
   */
  private colapsarSeccionesCompletadas(): void {
    // La asignación interna se completa al publicar la vacante.
    this.seccionAsignacion = !this.vacantePublicada;

    // Long list aprobada, formulario del postulante y Multitest son el trabajo de la fase
    // "Long list aprobada": quedan atrás al pasar a entrevistas (o, en un ingreso directo FFT, al
    // aprobarse el formulario, que lo manda derecho al EMO).
    const antesDeEntrevistas = !this.enEntrevistas;
    this.seccionLongListAprobada = antesDeEntrevistas;
    this.seccionFormularioPostulante = antesDeEntrevistas;
    this.seccionMultitest = antesDeEntrevistas;

    // La programación de entrevistas se completa cuando el finalista pasa a decisión del área.
    this.seccionEntrevistas =
      !this.detalle || !faseAlcanzada(this.detalle.estadoCodigo, 'SELECCION_JEFATURA');
  }

  /**
   * Abre el modal «Ver formulario» del candidato que pidió el enlace del correo. Se hace recién con
   * el detalle cargado y solo si ese candidato es de este requerimiento: un id de otro proceso (o
   * de un candidato que ya no está) deja el detalle abierto sin nada encima, en vez de un modal que
   * cargaría el formulario de alguien que no corresponde.
   */
  private abrirFormularioSolicitado(): void {
    const candidatoId = this.abrirFormularioCandidatoId;
    if (!candidatoId) return;
    // Se consume una sola vez: si el detalle se recarga (p. ej. tras aprobar un formulario FFT), el
    // enlace del correo no puede volver a abrir el modal que el usuario ya cerró.
    this.abrirFormularioCandidatoId = null;

    const esDelRequerimiento = (this.detalle?.candidatosAprobados ?? []).some(
      (c) => c.candidatoId === candidatoId,
    );
    if (esDelRequerimiento) this.formularioCandidatoId = candidatoId;
  }

  cerrar(): void {
    this.closeModal.emit(this.huboCambios);
  }

  estadoColors = estadoColors;

  // ── Historial de candidatos rechazados ──────────────────────────────────
  /** Colores del badge de la etapa en la que se rechazó a un candidato del historial. */
  etapaColors = etapaRechazoColors;

  /** Búsqueda del historial de rechazados (nombre del candidato o etapa del rechazo). */
  busquedaRechazados = '';

  private readonly pagerRechazados = new ClientPager<CandidatoRechazado>();

  /** Volver a la primera página al cambiar la búsqueda (si no, se quedaría en una vacía). */
  onBuscarRechazados(): void {
    this.pagerRechazados.reset();
  }

  get rechazadosFiltrados(): CandidatoRechazado[] {
    const rechazados = this.detalle?.candidatosRechazados ?? [];
    if (!this.busquedaRechazados.trim()) return rechazados;
    return rechazados.filter(
      (c) =>
        SearchInput.matches(c.nombre, this.busquedaRechazados) ||
        SearchInput.matches(c.etapaNombre, this.busquedaRechazados),
    );
  }

  get rechazadosPagina(): CandidatoRechazado[] {
    return this.pagerRechazados.page(this.rechazadosFiltrados);
  }

  get rechazadosPaginaActual(): number {
    return this.pagerRechazados.currentPage;
  }

  get rechazadosTotalPaginas(): number {
    return this.pagerRechazados.totalPages(this.rechazadosFiltrados);
  }

  cambiarPaginaRechazados(page: number): void {
    this.pagerRechazados.goTo(page);
  }

  // ── Fases del pipeline (controlan qué secciones se muestran) ────────────
  /** true si la vacante ya fue publicada (fase PUBLICACION o posterior). */
  get vacantePublicada(): boolean {
    return !!this.detalle && faseAlcanzada(this.detalle.estadoCodigo, 'PUBLICACION');
  }

  /** true si ya se inició la revisión de CV (fase LONG_LIST o posterior). */
  get enLongList(): boolean {
    return !!this.detalle && faseAlcanzada(this.detalle.estadoCodigo, 'LONG_LIST');
  }

  /** true si la long list ya fue enviada al solicitante (fase LONG_LIST_ENVIADA o posterior). */
  get longListEnviada(): boolean {
    return !!this.detalle && faseAlcanzada(this.detalle.estadoCodigo, 'LONG_LIST_ENVIADA');
  }

  /** true si el solicitante ya aprobó la long list (fase LONG_LIST_APROBADA o posterior). */
  get longListAprobada(): boolean {
    return !!this.detalle && faseAlcanzada(this.detalle.estadoCodigo, 'LONG_LIST_APROBADA');
  }

  /** true si el requerimiento ya pasó a la programación de entrevistas (fase ENTREVISTAS o posterior). */
  get enEntrevistas(): boolean {
    return !!this.detalle && faseAlcanzada(this.detalle.estadoCodigo, 'ENTREVISTAS');
  }

  // ── Resultado del EMO de ingreso ─────────────────────────────────────────
  // El examen ya no cierra el proceso: lo deja en la fase que dice cómo salió, y de ahí sale un
  // camino distinto por resultado. Apto (con o sin restricciones) lo cierra GTH; No Apto abre la
  // decisión de con quién sigue; Observado no habilita nada — solo espera la interconsulta.

  /** true si el EMO de ingreso salió Apto o Apto con Restricciones: falta cerrar el proceso. */
  get emoApto(): boolean {
    const codigo = this.detalle?.estadoCodigo;
    return codigo === 'EMO_APTO' || codigo === 'EMO_APTO_RESTRICCIONES';
  }

  /**
   * true si el EMO de ingreso quedó Observado. El proceso no avanza ni retrocede: hay que esperar
   * el resultado de la interconsulta, que al cargarse como EMO vuelve a mover el requerimiento.
   */
  get emoObservado(): boolean {
    return this.detalle?.estadoCodigo === 'EMO_OBSERVADO';
  }

  /**
   * true si el EMO de ingreso del seleccionado salió No Apto y el proceso volvió a manos de GTH.
   * Es la fase en la que hay que elegir con quién sigue: retomar a alguien del historial de
   * rechazados o preparar una long list nueva.
   */
  get emoNoApto(): boolean {
    return this.detalle?.estadoCodigo === 'EMO_NO_APTO';
  }

  /**
   * true si el proceso terminó sin cubrir la vacante: el ingreso directo (FFT) salió No Apto en el
   * EMO y no había otros candidatos ni long list a la que volver. No hay nada que hacer acá — para
   * volver a pedir la vacante hay que registrar una solicitud nueva.
   */
  get cerradoSinCubrir(): boolean {
    return this.detalle?.estadoCodigo === 'CERRADO_SIN_CUBRIR';
  }

  /**
   * Aptitud que registró la clínica, para nombrarla en la tarjeta del resultado. Sale del propio
   * examen del seleccionado; si por lo que sea no viniera, se cae al nombre de la fase, que dice
   * lo mismo.
   */
  get emoAptitudNombre(): string {
    return this.detalle?.seleccionado?.emoAptitud || this.detalle?.estadoNombre || '';
  }

  /** true mientras se cierra el proceso (evita el doble clic). */
  cerrandoProceso = false;

  /**
   * Cierra el proceso y habilita el paso a onboarding. Es lo que antes hacía solo el EMO: ahora lo
   * confirma GTH con el resultado del examen a la vista, porque cerrar es exactamente lo que pone
   * al seleccionado en la bandeja de Onboarding.
   */
  async cerrarProceso(): Promise<void> {
    if (this.cerrandoProceso || !this.detalle) return;

    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Cerrar el proceso?',
      html:
        'El examen médico de ingreso salió <b>' +
        this.emoAptitudNombre +
        '</b>. Al cerrar, el proceso de reclutamiento termina y el seleccionado pasa a ' +
        '<b>Onboarding</b> como candidato por ingresar.',
      showCancelButton: true,
      confirmButtonText: 'Cerrar proceso y continuar a Onboarding',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#15803D',
    });
    if (!confirm.isConfirmed) return;

    this.cerrandoProceso = true;
    this.loaderService.show();
    this.service.cerrarProceso(this.requerimientoId).subscribe({
      next: (res) => {
        this.cerrandoProceso = false;
        this.huboCambios = true;
        // Cerrar cambia las secciones del modal (desaparece la tarjeta del resultado del EMO), así
        // que se recarga el detalle entero. El loader lo apaga esa recarga.
        this.cargarDetalle();
        Swal.fire({
          icon: 'success',
          title: 'Proceso cerrado',
          text: res.message,
          confirmButtonColor: '#15803D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.cerrandoProceso = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * El candidato que salió No Apto en el EMO. Sale del historial (es el único con etapa 'EMO'), que
   * es donde queda registrado: al perder el resultado SELECCIONADO deja de haber «Puesto cubierto»
   * de dónde leer su nombre.
   */
  get candidatoNoApto(): CandidatoRechazado | null {
    return (this.detalle?.candidatosRechazados ?? []).find((c) => c.etapaCodigo === 'EMO') ?? null;
  }

  /**
   * Rechazados con los que se puede continuar el proceso. Deja fuera al que acaba de salir No Apto
   * (su etapa es 'EMO'), que es justamente el motivo por el que estamos en esta fase.
   */
  get rechazadosRetomables(): CandidatoRechazado[] {
    return (this.detalle?.candidatosRechazados ?? []).filter((c) => c.puedeRetomar);
  }

  /**
   * «Continuar con un rechazado»: despliega el historial y baja la vista hasta él. El historial
   * está al final del modal, así que abrirlo sin más no se ve — el botón parecía no hacer nada.
   */
  verHistorialRechazados(): void {
    this.seccionRechazados = true;
    // App zoneless: sin esto la sección no llega a existir en el DOM antes del scroll.
    this.cdr.detectChanges();
    // Y un frame más para que el navegador tenga el layout ya recalculado: la sección acaba de
    // crecer al desplegarse y su posición final es la de después de ese reflow.
    requestAnimationFrame(() => {
      this.historialRechazadosRef?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  /**
   * Retoma el proceso con un candidato del historial. La fase de destino la decide el backend por
   * la etapa en la que se lo rechazó, así que acá no se elige nada: se confirma y se recarga el
   * detalle entero, porque el modal cambia de secciones al cambiar de fase.
   */
  async retomarCandidato(c: CandidatoRechazado): Promise<void> {
    if (this.retomando[c.candidatoId] || !this.detalle) return;

    const confirm = await Swal.fire({
      icon: 'question',
      title: `¿Continuar con ${c.nombre}?`,
      html:
        'El proceso vuelve a la etapa <b>' +
        c.etapaNombre +
        '</b>, que es donde se lo había descartado, y este candidato sale del historial de ' +
        'rechazados. Lo que ya se hizo con él (su formulario, su entrevista, su informe) se conserva.',
      showCancelButton: true,
      confirmButtonText: 'Continuar con este candidato',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#005D9D',
    });
    if (!confirm.isConfirmed) return;

    this.retomando[c.candidatoId] = true;
    this.loaderService.show();
    this.service.retomarCandidato(this.requerimientoId, c.candidatoId).subscribe({
      next: (res) => {
        this.retomando[c.candidatoId] = false;
        this.huboCambios = true;
        // El cambio de fase reordena todo el modal (vuelven las secciones de formulario, entrevistas
        // o finalistas según a dónde haya ido): se recarga en vez de parchear el estado a mano. El
        // loader lo apaga la recarga, para no parpadear entre las dos peticiones.
        this.cargarDetalle();
        Swal.fire({
          icon: 'success',
          title: 'Proceso retomado',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.retomando[c.candidatoId] = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * La otra salida: descartar a todos los rechazados y volver a Long list para armar una nueva.
   * Los rechazados no se borran —siguen siendo el historial para no repetir candidatos—, solo
   * dejan de ser una opción de este proceso.
   */
  async volverALongList(): Promise<void> {
    if (this.volviendoALongList || !this.detalle) return;

    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Preparar una nueva long list?',
      html:
        'El proceso vuelve a <b>Long list</b> para que cargues CVs nuevos y se los envíes al área ' +
        'solicitante. Los candidatos ya rechazados se quedan en el historial (para no volver a ' +
        'presentarlos) y no continúan en el proceso.',
      showCancelButton: true,
      confirmButtonText: 'Volver a Long list',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#005D9D',
    });
    if (!confirm.isConfirmed) return;

    this.volviendoALongList = true;
    this.loaderService.show();
    this.service.volverALongList(this.requerimientoId).subscribe({
      next: (res) => {
        this.volviendoALongList = false;
        this.huboCambios = true;
        // El loader lo apaga la recarga (ver retomarCandidato).
        this.cargarDetalle();
        Swal.fire({
          icon: 'success',
          title: 'Listo',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.volviendoALongList = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * true si el requerimiento es un ingreso directo **FFT**. En este flujo no hay publicación, ni
   * long list, ni formulario del postulante, ni multitest, ni entrevistas, ni finalistas, ni
   * decisión del solicitante: al aprobarse la vacante el candidato queda seleccionado y el proceso
   * pasa directo al EMO de ingreso. El modal esconde esos pasos en vez de ofrecer botones que
   * llevarían el proceso a una fase que no le corresponde.
   */
  get esFft(): boolean {
    return !!this.detalle?.esFft;
  }

  /**
   * true si a un FFT le falta la razón social. En el flujo normal la exige el botón de publicar,
   * pero el ingreso directo no publica nada: su ficha de pre-ingreso se abre al aprobarse la
   * vacante, así que sin este aviso quedaría sin razón social y nadie se enteraría hasta el
   * onboarding. Al asignarla, el backend se la baja a la ficha. Es un aviso, no un bloqueo — la
   * decisión de asignarla antes o después es de GTH.
   */
  get faltaRazonSocialFft(): boolean {
    return this.esFft && !this.detalle?.asignacion.contributorId;
  }

  // ── Asignación interna (autosave optimista por cambio) ──────────────────
  onAsignacionChange(campo: keyof AsignacionGth, valor: number | null): void {
    if (!this.detalle) return;
    const asignacion = this.detalle.asignacion;
    if (asignacion[campo] === valor) return;

    const prev = asignacion[campo];
    asignacion[campo] = valor;

    this.service.updateAsignacion(this.requerimientoId, asignacion).subscribe({
      next: () => (this.huboCambios = true),
      error: (err: HttpErrorResponse) => {
        asignacion[campo] = prev;
        this.errorService.handleError(err);
      },
    });
  }

  /** Tipo de proceso seleccionado (para el hint con su descripción, SLA y plazo estimado). */
  get tipoProcesoSeleccionado() {
    return this.detalle?.tiposProceso.find((t) => t.id === this.detalle?.asignacion.tipoProcesoId) ?? null;
  }

  /** Razón social seleccionada (para el hint de cupos y la advertencia). */
  get razonSocialSeleccionada() {
    return this.detalle?.razonesSociales.find((r) => r.id === this.detalle?.asignacion.contributorId) ?? null;
  }

  /** true si la razón social elegida no alcanza a cubrir las vacantes del requerimiento. */
  get sinCupos(): boolean {
    const razon = this.razonSocialSeleccionada;
    return !!this.detalle && !!razon && razon.cuposDisponibles < this.detalle.vacantes;
  }

  // ── Publicación en canales ──────────────────────────────────────────────
  toggleCanal(canalId: number): void {
    if (this.canalesSeleccionados.has(canalId)) this.canalesSeleccionados.delete(canalId);
    else this.canalesSeleccionados.add(canalId);
  }

  /**
   * true si se puede publicar: al menos un canal marcado y la asignación interna completa.
   * Publicar avanza la fase, y a partir de ahí el requerimiento ya se trabaja con responsable,
   * SLA, prioridad y razón social definidos, así que los cuatro se exigen antes de continuar.
   */
  get puedePublicar(): boolean {
    const a = this.detalle?.asignacion;
    return (
      this.canalesSeleccionados.size > 0 &&
      !!a?.responsableId &&
      !!a.tipoProcesoId &&
      !!a.prioridadId &&
      !!a.contributorId
    );
  }

  /** true si todos los canales disponibles están marcados. */
  get todosLosCanalesSeleccionados(): boolean {
    const canales = this.detalle?.canales ?? [];
    return canales.length > 0 && canales.every((c) => this.canalesSeleccionados.has(c.id));
  }

  /** Marca todos los canales de una vez, o los desmarca si ya estaban todos marcados. */
  toggleTodosLosCanales(): void {
    if (this.todosLosCanalesSeleccionados) this.canalesSeleccionados.clear();
    else this.canalesSeleccionados = new Set((this.detalle?.canales ?? []).map((c) => c.id));
  }

  /**
   * Registra los canales seleccionados y avanza el requerimiento a la fase PUBLICACION.
   * No publica en los portales (sin APIs integradas): solo registra y continúa el flujo,
   * mostrando la sección "Revisión de CV".
   */
  publicar(): void {
    if (!this.detalle || !this.puedePublicar) return;

    this.loaderService.show();
    this.service.publicar(this.requerimientoId, [...this.canalesSeleccionados]).subscribe({
      next: (res) => {
        this.huboCambios = true;
        for (const c of this.detalle!.canales) c.publicado = this.canalesSeleccionados.has(c.id);
        this.detalle!.estadoCodigo = res.estadoCodigo;
        this.detalle!.estadoNombre = res.estadoNombre;
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Listo', text: res.message, confirmButtonColor: '#005D9D' });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Revisión de CV / Long list ──────────────────────────────────────────
  /** Avanza el requerimiento a la fase LONG_LIST y muestra la sección de carga de candidatos. */
  iniciarRevisionCv(): void {
    if (!this.detalle) return;

    this.loaderService.show();
    this.service.iniciarRevisionCv(this.requerimientoId).subscribe({
      next: (res) => {
        this.huboCambios = true;
        this.detalle!.estadoCodigo = res.estadoCodigo;
        this.detalle!.estadoNombre = res.estadoNombre;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Agrega un candidato por cada CV elegido, con el nombre prellenado desde el archivo. */
  onCvsSeleccionados(event: Event): void {
    const input = event.target as HTMLInputElement;
    for (const file of Array.from(input.files ?? [])) {
      this.candidatos.push({
        cv: file,
        nombre: this.derivarNombre(file.name),
        comentario: '',
        anexos: [],
      });
    }
    input.value = ''; // permite volver a elegir el mismo archivo
  }

  quitarCandidato(index: number): void {
    this.candidatos.splice(index, 1);
  }

  // ── Portafolio/Anexos del candidato ─────────────────────────────────────
  /** Formatos aceptados por el input de anexos (atributo `accept`). */
  readonly anexosAccept = ANEXOS_ACCEPT;

  /** Agrega al candidato los archivos elegidos, sin repetir los que ya estaban cargados. */
  onAnexosSeleccionados(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const candidato = this.candidatos[index];
    if (!candidato) return;

    for (const file of Array.from(input.files ?? [])) {
      const repetido = candidato.anexos.some((a) => a.name === file.name && a.size === file.size);
      if (!repetido) candidato.anexos.push(file);
    }
    input.value = ''; // permite volver a elegir el mismo archivo
  }

  quitarAnexo(index: number, anexoIndex: number): void {
    this.candidatos[index]?.anexos.splice(anexoIndex, 1);
  }

  /** Tamaño de un archivo en KB/MB, para la lista de anexos. */
  pesoArchivo(file: File): string {
    return file.size < 1024 * 1024
      ? `${Math.max(1, Math.round(file.size / 1024))} KB`
      : `${(file.size / 1024 / 1024).toFixed(1)} MB`;
  }

  /** true si se puede enviar la long list (hay al menos un candidato y no se está enviando). */
  get puedeEnviarLongList(): boolean {
    return this.candidatos.length > 0 && !this.enviando;
  }

  /**
   * Envía la long list al solicitante: sube los CVs, dispara el correo configurado
   * y avanza el requerimiento a LONG_LIST_ENVIADA. Al terminar, el modal pasa al estado
   * "Long list enviada" (se oculta la carga de candidatos y cambia el "Siguiente paso").
   */
  enviarLongList(): void {
    if (!this.detalle || !this.puedeEnviarLongList) return;

    // Cada candidato debe tener nombre; el CV ya es obligatorio por construcción.
    const sinNombre = this.candidatos.some((c) => !c.nombre.trim());
    if (sinNombre) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta el nombre de un candidato',
        text: 'Registra el nombre y apellido de cada candidato antes de enviar la long list.',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    // Los CVs y los anexos viajan adjuntos en el correo al solicitante, que tiene un tope de
    // tamaño (ver MAX_LONG_LIST_CORREO_BYTES): se avisa acá para no subirlo y que lo rechace.
    const pesoTotal = this.candidatos.reduce(
      (total, c) => total + c.cv.size + c.anexos.reduce((suma, a) => suma + a.size, 0),
      0,
    );
    if (pesoTotal > MAX_LONG_LIST_CORREO_BYTES) {
      const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
      Swal.fire({
        icon: 'warning',
        title: 'Los archivos pesan demasiado',
        text:
          `Los CVs y anexos suman ${mb(pesoTotal)} y el correo al solicitante admite hasta ` +
          `${mb(MAX_LONG_LIST_CORREO_BYTES)}. Reduce o quita algún anexo del portafolio.`,
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    // El puesto no viaja: el backend lo toma del requerimiento (es el que pidió el solicitante).
    const candidatos: LongListCandidatoEnvio[] = this.candidatos.map((c) => ({
      nombre: c.nombre.trim(),
      comentario: c.comentario.trim(),
      cv: c.cv,
      anexos: c.anexos,
    }));

    this.enviando = true;
    this.loaderService.show();
    this.service.enviarLongList(this.requerimientoId, candidatos).subscribe({
      next: (res) => {
        this.huboCambios = true;
        this.detalle!.estadoCodigo = res.estadoCodigo;
        this.detalle!.estadoNombre = res.estadoNombre;
        this.candidatos = [];
        this.enviando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Long list enviada',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Formulario de información del postulante ────────────────────────────
  /** Etiqueta del botón "Ver formulario" según el estado del formulario del candidato. */
  botonFormularioLabel(c: CandidatoAprobado): string {
    switch (c.formulario?.estadoCodigo) {
      case 'APROBADO':  return 'Ver formulario aprobado';
      case 'RECHAZADO': return 'Ver formulario rechazado';
      default:          return 'Ver formulario';
    }
  }

  /** Badge de estado del formulario del candidato (texto + colores). */
  estadoFormularioBadge(c: CandidatoAprobado): { text: string; bg: string; color: string } {
    switch (c.formulario?.estadoCodigo) {
      case 'ENVIADO':    return { text: 'Enviado',            bg: '#E0F2FE', color: '#0284C7' };
      case 'COMPLETADO': return { text: 'Por revisar',        bg: '#FEF3C7', color: '#B45309' };
      case 'APROBADO':   return { text: 'Aprobado',           bg: '#DCFCE7', color: '#15803D' };
      case 'RECHAZADO':  return { text: 'Rechazado',          bg: '#FEE2E2', color: '#B91C1C' };
      default:           return { text: 'Pendiente de envío', bg: '#F3F4F6', color: '#6B7280' };
    }
  }

  /** Envía (o reenvía) el formulario al correo escrito para el candidato. */
  async enviarFormulario(c: CandidatoAprobado): Promise<void> {
    const correo = (this.correoFormulario[c.candidatoId] ?? '').trim();
    if (!CORREO_VALIDO.test(correo)) {
      Swal.fire({
        icon: 'warning',
        title: 'Correo no válido',
        text: 'Ingresa un correo electrónico válido para enviar el formulario al postulante.',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    // Reenviar uno ya aprobado lo reabre: es útil si el postulante se equivocó en un dato, pero
    // deshace la aprobación, así que se confirma antes.
    if (c.formulario?.estadoCodigo === 'APROBADO') {
      const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Este formulario ya fue aprobado',
        html:
          '¿Seguro que quieres volver a enviárselo? Se le reabre con la información que ya declaró ' +
          'para que la corrija, y su formulario vuelve a quedar <b>Enviado</b> —deja de contar como ' +
          'aprobado— hasta que lo complete y lo apruebes de nuevo.',
        showCancelButton: true,
        confirmButtonText: 'Reenviar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#B91C1C',
      });
      if (!confirm.isConfirmed) return;
    }

    this.enviandoFormulario[c.candidatoId] = true;
    this.service.enviarFormulario(c.candidatoId, correo).subscribe({
      next: (res) => {
        c.formulario = res.formulario;
        this.enviandoFormulario[c.candidatoId] = false;
        this.huboCambios = true;
        // App zoneless: sin esto el badge del candidato se queda con el estado anterior.
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          // Reenviar un formulario rechazado repite el correo de observaciones, no la invitación.
          title: res.formulario.estadoCodigo === 'RECHAZADO' ? 'Observaciones reenviadas' : 'Formulario enviado',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoFormulario[c.candidatoId] = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Envío masivo del formulario (selección de candidatos) ────────────────
  /** Marca/desmarca un candidato para el envío masivo. */
  toggleSeleccionFormulario(candidatoId: number): void {
    if (this.seleccionFormulario.has(candidatoId)) this.seleccionFormulario.delete(candidatoId);
    else this.seleccionFormulario.add(candidatoId);
  }

  /** Candidatos marcados, en el mismo orden en que se listan en la pantalla. */
  get candidatosSeleccionados(): CandidatoAprobado[] {
    return (this.detalle?.candidatosAprobados ?? []).filter((c) =>
      this.seleccionFormulario.has(c.candidatoId),
    );
  }

  get seleccionadosCount(): number {
    return this.candidatosSeleccionados.length;
  }

  /** true si están marcados todos los candidatos (estado del check maestro). */
  get todosSeleccionados(): boolean {
    const candidatos = this.detalle?.candidatosAprobados ?? [];
    return candidatos.length > 0 && this.seleccionadosCount === candidatos.length;
  }

  /** true si hay algunos marcados pero no todos (estado indeterminado del check maestro). */
  get seleccionParcial(): boolean {
    const marcados = this.seleccionadosCount;
    return marcados > 0 && marcados < (this.detalle?.candidatosAprobados ?? []).length;
  }

  /** Marca o desmarca a todos los candidatos de una vez. */
  toggleSeleccionTodos(marcar: boolean): void {
    if (!marcar) {
      this.seleccionFormulario.clear();
      return;
    }
    this.seleccionFormulario = new Set(
      (this.detalle?.candidatosAprobados ?? []).map((c) => c.candidatoId),
    );
  }

  get puedeEnviarSeleccionados(): boolean {
    return this.seleccionadosCount > 0 && !this.enviandoMasivo;
  }

  /**
   * Envía el formulario a todos los candidatos marcados en una sola petición, con las mismas reglas
   * del envío individual (correo válido y confirmación si alguno ya estaba aprobado). El backend
   * responde el detalle por candidato: los que salieron se desmarcan y los que fallaron quedan
   * marcados para reintentarlos sin volver a seleccionarlos.
   */
  async enviarFormulariosSeleccionados(): Promise<void> {
    const seleccionados = this.candidatosSeleccionados;
    if (seleccionados.length === 0 || this.enviandoMasivo) return;

    const nombre = (c: CandidatoAprobado) => new TitleCasePipe().transform(c.nombre);

    // Se exige el correo de todos antes de mandar el lote: es preferible que GTH corrija en la misma
    // pantalla a que el envío salga a medias y haya que rastrear a quién le llegó.
    const sinCorreo = seleccionados.filter(
      (c) => !CORREO_VALIDO.test((this.correoFormulario[c.candidatoId] ?? '').trim()),
    );
    if (sinCorreo.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Faltan correos válidos',
        html:
          'Registra un correo electrónico válido para continuar:<br><b>' +
          sinCorreo.map(nombre).join('</b><br><b>') +
          '</b>',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    // Reenviar un formulario ya aprobado lo reabre y deshace su aprobación: misma advertencia que en
    // el envío individual, acá con la lista de a quiénes les pasaría.
    const yaAprobados = seleccionados.filter((c) => c.formulario?.estadoCodigo === 'APROBADO');
    const confirm = await Swal.fire({
      icon: yaAprobados.length > 0 ? 'warning' : 'question',
      title: `¿Enviar el formulario a ${seleccionados.length} postulante(s)?`,
      html:
        `Se le enviará el enlace del formulario a los ${seleccionados.length} candidato(s) ` +
        'seleccionado(s), cada uno al correo registrado en su ficha.' +
        (yaAprobados.length > 0
          ? '<br><br>Ojo: <b>' +
            yaAprobados.map(nombre).join('</b>, <b>') +
            '</b> ya tenía(n) el formulario <b>aprobado</b>. Se le(s) reabre con la información que ' +
            'ya declaró y vuelve a quedar <b>Enviado</b> —deja de contar como aprobado— hasta que lo ' +
            'complete y lo apruebes de nuevo.'
          : ''),
      showCancelButton: true,
      confirmButtonText: 'Enviar a todos',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: yaAprobados.length > 0 ? '#B91C1C' : '#005D9D',
    });
    if (!confirm.isConfirmed) return;

    const candidatos: FormularioEnvioMasivoItem[] = seleccionados.map((c) => ({
      candidatoId: c.candidatoId,
      correo: (this.correoFormulario[c.candidatoId] ?? '').trim(),
    }));

    this.enviandoMasivo = true;
    this.loaderService.show();
    this.service.enviarFormularioMasivo(candidatos).subscribe({
      next: (res) => {
        const porCandidato = new Map(seleccionados.map((c) => [c.candidatoId, c]));
        const fallidos: string[] = [];

        for (const r of res.resultados) {
          const c = porCandidato.get(r.candidatoId);
          // El resumen llega incluso cuando el correo falló (el formulario ya quedó registrado):
          // la ficha tiene que reflejar el estado real de la base de datos.
          if (c && r.formulario) c.formulario = r.formulario;
          if (r.enviado) this.seleccionFormulario.delete(r.candidatoId);
          else if (c) fallidos.push(`${nombre(c)}: ${r.error ?? 'No se pudo enviar.'}`);
        }

        this.huboCambios = true;
        this.enviandoMasivo = false;
        this.loaderService.hide();
        // App zoneless: sin esto los badges de los candidatos se quedan con el estado anterior.
        this.cdr.detectChanges();

        Swal.fire({
          icon: res.fallidos === 0 ? 'success' : res.enviados === 0 ? 'error' : 'warning',
          title: res.fallidos === 0 ? 'Formularios enviados' : 'Envío incompleto',
          html:
            res.message +
            (fallidos.length > 0
              ? '<br><br>No se pudo enviar a:<br>' + fallidos.join('<br>')
              : ''),
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoMasivo = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  /** true si el postulante ya completó el formulario y falta que GTH lo apruebe o rechace. */
  formularioPorRevisar(c: CandidatoAprobado): boolean {
    return c.formulario?.estadoCodigo === 'COMPLETADO';
  }

  /**
   * true si el formulario se puede rechazar. Además del completado entra el que se envió y el
   * postulante nunca llenó: rechazarlo es lo que destraba el paso a la programación de entrevistas
   * cuando alguien no responde. El enlace no se toca — si lo completa después vuelve a aparecer
   * como «Por revisar».
   */
  formularioRechazable(c: CandidatoAprobado): boolean {
    const estado = c.formulario?.estadoCodigo;
    return estado === 'COMPLETADO' || estado === 'ENVIADO';
  }

  /**
   * Aviso de que el documento que declaró el postulante ya existe en la base. null cuando no
   * coincide con nada. El mismo aviso que pinta el modal «Ver formulario»: la copia y la severidad
   * salen del servicio compartido para que los dos digan exactamente lo mismo.
   */
  avisoCoincidencia(c: CandidatoAprobado): CoincidenciaAviso | null {
    return this.decisiones.avisoCoincidencia(c.coincidencia);
  }

  /**
   * true si se puede aprobar: además de estar completado, el documento declarado no puede ser de
   * un trabajador que está adentro de la empresa. Aprobarlo actualizaría la ficha de `person` de
   * ese trabajador con lo que tecleó alguien en un formulario público.
   */
  formularioAprobable(c: CandidatoAprobado): boolean {
    return this.formularioPorRevisar(c) && !c.coincidencia?.bloqueaAprobacion;
  }

  /**
   * Aprueba/rechaza el formulario desde la ficha del candidato, sin abrir el modal de revisión.
   * Son los mismos botones del modal (mismo flujo y mismas observaciones): acá están a la mano
   * para el caso en que GTH ya revisó los datos y solo quiere decidir.
   */
  aprobarFormulario(c: CandidatoAprobado): Promise<void> {
    return this.decidirFormulario(c, () => this.decisiones.aprobar(c.candidatoId, c.coincidencia));
  }

  rechazarFormulario(c: CandidatoAprobado): Promise<void> {
    return this.decidirFormulario(c, () =>
      this.decisiones.rechazar(c.candidatoId, this.formularioPorRevisar(c)),
    );
  }

  private async decidirFormulario(
    c: CandidatoAprobado,
    accion: () => Promise<DecisionFormularioAplicada | null>,
  ): Promise<void> {
    if (this.decidiendoFormulario[c.candidatoId]) return;
    this.decidiendoFormulario[c.candidatoId] = true;
    const res = await accion();
    this.decidiendoFormulario[c.candidatoId] = false;
    if (res) {
      c.formulario = res.resumen;
      this.huboCambios = true;

      // En un ingreso directo FFT, aprobar el formulario NO solo cambia el estado del formulario:
      // el backend cierra la selección y mueve el requerimiento al EMO de ingreso. Sin recargar, el
      // modal seguiría mostrando la fase anterior y el bloque de «Puesto cubierto» no aparecería
      // hasta cerrar y volver a abrir.
      if (this.esFft && res.resumen.estadoCodigo === 'APROBADO') {
        this.cargarDetalle();
        return;
      }
    }
    // App zoneless: el cambio ocurre después de un await, así que hay que pintar a mano.
    this.cdr.detectChanges();
  }

  /** true si a este candidato ya se le rechazó el formulario del postulante. */
  formularioRechazado(c: CandidatoAprobado): boolean {
    return c.formulario?.estadoCodigo === 'RECHAZADO';
  }

  /**
   * true si se le puede cerrar el proceso al postulante: su formulario quedó rechazado y todavía
   * no se le avisó. Rechazar el formulario solo le pide que corrija; esto es lo que lo saca del
   * proceso y le manda el correo de fin de proceso.
   */
  puedeRechazarPostulante(c: CandidatoAprobado): boolean {
    return this.formularioRechazado(c) && !this.noContinua(c);
  }

  /**
   * Saca del proceso al postulante cuyo formulario quedó rechazado y le envía el correo de fin de
   * proceso. Lo deja en "No continúa", igual que el descarte tras la entrevista.
   */
  async rechazarPostulante(c: CandidatoAprobado): Promise<void> {
    if (this.rechazandoPostulante[c.candidatoId]) return;

    const correo = c.formulario?.correoEnvio ?? c.correoContacto;
    const confirm = await Swal.fire({
      icon: 'warning',
      title: '¿Rechazar al postulante?',
      html:
        `Se le enviará a <b>${correo ?? 'su correo registrado'}</b> el correo de fin de proceso. ` +
        'El postulante quedará como <b>No continúa</b> y no se le podrá programar entrevista.',
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B91C1C',
    });
    if (!confirm.isConfirmed) return;

    this.rechazandoPostulante[c.candidatoId] = true;
    this.service.rechazarPostulante(c.candidatoId).subscribe({
      next: (res) => {
        c.evaluacion = res.evaluacion;
        this.rechazandoPostulante[c.candidatoId] = false;
        this.huboCambios = true;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Postulante rechazado',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.rechazandoPostulante[c.candidatoId] = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  /** Abre el modal "Ver formulario" del candidato. */
  abrirFormulario(c: CandidatoAprobado): void {
    this.formularioCandidatoId = c.candidatoId;
  }

  cerrarFormulario(): void {
    this.formularioCandidatoId = null;
  }

  /** Al aprobar/rechazar desde el modal, refresca el estado del formulario del candidato. */
  onFormularioCambios(resumen: CandidatoFormularioResumen): void {
    const c = this.detalle?.candidatosAprobados.find((x) => x.candidatoId === this.formularioCandidatoId);
    if (c) c.formulario = resumen;
    this.huboCambios = true;
  }

  // ── Control informativo del Multitest ───────────────────────────────────
  /**
   * Marca/desmarca el Multitest de un candidato (optimista: pinta el check al instante y lo
   * revierte si el guardado falla). El check es informativo —la prueba se rinde fuera de la
   * plataforma— pero sí es requisito para habilitar el paso a entrevistas.
   */
  toggleMultitest(c: CandidatoAprobado, realizado: boolean): void {
    const previo = c.multitestRealizado;
    c.multitestRealizado = realizado;

    this.service.setMultitest(c.candidatoId, realizado).subscribe({
      next: () => {
        this.huboCambios = true;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        c.multitestRealizado = previo;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * true si tienen el Multitest marcado todos los candidatos a los que se les exige. Al que se le
   * rechazó el formulario ya no se le va a entrevistar, así que pedirle el check dejaba trabado el
   * paso a entrevistas por una prueba que ese postulante nunca va a rendir. El backend revalida
   * lo mismo.
   */
  get multitestCompleto(): boolean {
    const candidatos = this.candidatosConMultitest;
    return candidatos.length > 0 && candidatos.every((c) => c.multitestRealizado);
  }

  /** Candidatos a los que sí se les pide el Multitest (los que siguen en carrera). */
  get candidatosConMultitest(): CandidatoAprobado[] {
    return (this.detalle?.candidatosAprobados ?? []).filter((c) => !this.formularioRechazado(c));
  }

  /** true si ningún candidato quedó con el formulario pendiente (todos aprobados o rechazados). */
  get formulariosDecididos(): boolean {
    const candidatos = this.detalle?.candidatosAprobados ?? [];
    return (
      candidatos.length > 0 &&
      candidatos.every(
        (c) => c.formulario?.estadoCodigo === 'APROBADO' || c.formulario?.estadoCodigo === 'RECHAZADO',
      )
    );
  }

  /** true si al menos un formulario del postulante quedó aprobado (habría a quién entrevistar). */
  get hayFormularioAprobado(): boolean {
    return (this.detalle?.candidatosAprobados ?? []).some(
      (c) => c.formulario?.estadoCodigo === 'APROBADO',
    );
  }

  /**
   * Requisitos para pasar a entrevistas: Multitest marcado en todos los candidatos, todos los
   * formularios ya revisados (aprobados o rechazados, ninguno pendiente de completar) y al menos
   * uno aprobado. El backend revalida lo mismo.
   */
  get puedeContinuarAEntrevistas(): boolean {
    return (
      this.multitestCompleto && this.formulariosDecididos && this.hayFormularioAprobado && !this.continuando
    );
  }

  /** Qué falta para habilitar el paso a entrevistas (hint bajo el botón). Vacío si ya se puede. */
  get requisitosContinuarTexto(): string {
    if (this.puedeContinuarAEntrevistas) return '';
    // El "ninguno quedó aprobado" espera a que todos los formularios estén decididos: con alguno
    // aún pendiente de revisar no hay nada que avisar, y decirlo antes acusaría en falso.
    if (this.formulariosDecididos && !this.hayFormularioAprobado)
      return 'Ningún formulario quedó aprobado: no hay candidatos a quienes entrevistar.';
    if (!this.multitestCompleto)
      return 'Marca el Multitest de los candidatos que siguen en el proceso para continuar.';
    return '';
  }

  /** Avanza el requerimiento a la fase ENTREVISTAS y muestra la sección de programación. */
  continuarAEntrevistas(): void {
    if (!this.detalle || !this.puedeContinuarAEntrevistas) return;

    this.continuando = true;
    this.loaderService.show();
    this.service.continuarAEntrevistas(this.requerimientoId).subscribe({
      next: (res) => {
        this.huboCambios = true;
        this.detalle!.estadoCodigo = res.estadoCodigo;
        this.detalle!.estadoNombre = res.estadoNombre;
        this.prepararFormulariosEntrevista();
        this.continuando = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Listo',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.continuando = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Programación de entrevistas ─────────────────────────────────────────
  /** Candidatos a entrevistar: los que tienen el formulario del postulante aprobado. */
  get candidatosParaEntrevista(): CandidatoAprobado[] {
    return (this.detalle?.candidatosAprobados ?? []).filter(
      (c) => c.formulario?.estadoCodigo === 'APROBADO',
    );
  }

  /** Fecha de hoy en `YYYY-MM-DD`: no se cita a un candidato en una fecha pasada. */
  get hoyIso(): string {
    const hoy = new Date();
    const mes = `${hoy.getMonth() + 1}`.padStart(2, '0');
    const dia = `${hoy.getDate()}`.padStart(2, '0');
    return `${hoy.getFullYear()}-${mes}-${dia}`;
  }

  /** true si la cita del candidato está completa y no se está enviando ya. */
  puedeEnviarEntrevista(c: CandidatoAprobado): boolean {
    const form = this.entrevistaForm[c.candidatoId];
    return !!form?.fecha && !!form?.hora && !!form?.lugarId && !this.enviandoEntrevista[c.candidatoId];
  }

  /**
   * Chip de la respuesta del candidato a su citación, o null si todavía no hay entrevista
   * programada (en ese caso no hay nada que responder y el chip solo sería ruido).
   *
   * Sin responder no es lo mismo que rechazar, por eso son tres estados y no dos: mientras el
   * candidato no toque ninguno de los dos botones del correo, GTH ve que sigue esperando.
   */
  respuestaEntrevista(
    c: CandidatoAprobado,
  ): { texto: string; icono: string; fondo: string; color: string; detalle: string } | null {
    const entrevista = c.entrevista;
    if (!entrevista?.enviadoEn) return null;

    if (entrevista.respuestaCodigo === 'CONFIRMADA') {
      return {
        texto: 'Confirmada',
        icono: 'ti-circle-check',
        fondo: '#DCFCE7',
        color: '#15803D',
        detalle: 'El candidato confirmó que asistirá a la entrevista.',
      };
    }

    if (entrevista.respuestaCodigo === 'RECHAZADA') {
      return {
        texto: 'Rechazada',
        icono: 'ti-circle-x',
        fondo: '#FEE2E2',
        color: '#B91C1C',
        detalle: 'El candidato avisó que no podrá asistir a la entrevista.',
      };
    }

    return {
      texto: 'Sin responder',
      icono: 'ti-clock',
      fondo: '#FEF3C7',
      color: '#92600A',
      detalle: 'El candidato todavía no confirma ni rechaza la entrevista desde el correo.',
    };
  }

  /** Etiqueta del botón según si la entrevista ya se había programado (reprogramación). */
  botonEntrevistaLabel(c: CandidatoAprobado): string {
    if (this.enviandoEntrevista[c.candidatoId]) return 'Enviando…';
    return c.entrevista ? 'Reprogramar y reenviar' : 'Enviar invitación';
  }

  /** Programa (o reprograma) la entrevista del candidato y le envía la invitación por correo. */
  guardarEntrevista(c: CandidatoAprobado): void {
    const form = this.entrevistaForm[c.candidatoId];
    if (!form?.fecha || !form?.hora || !form?.lugarId) {
      Swal.fire({
        icon: 'warning',
        title: 'Faltan datos de la entrevista',
        text: 'Registra la fecha, la hora y el lugar antes de enviar la invitación.',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    this.enviandoEntrevista[c.candidatoId] = true;
    this.service.guardarEntrevista(c.candidatoId, form.fecha, form.hora, form.lugarId).subscribe({
      next: (res) => {
        c.entrevista = res.entrevista;
        this.enviandoEntrevista[c.candidatoId] = false;
        this.huboCambios = true;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Entrevista programada',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoEntrevista[c.candidatoId] = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Evaluación de la entrevista (informe de finalista) ───────────────────
  /** true si el candidato ya no continúa: se le envió el correo de fin de proceso. */
  noContinua(c: CandidatoAprobado): boolean {
    return c.evaluacion?.resultadoCodigo === 'NO_PASO';
  }

  /**
   * true si se puede registrar la evaluación del candidato: ya se le envió la invitación a la
   * entrevista y sigue en carrera (al enviar el fin de proceso su informe queda cerrado).
   */
  puedeEvaluar(c: CandidatoAprobado): boolean {
    return !!c.entrevista?.enviadoEn && !this.noContinua(c);
  }

  /**
   * true si los tres comentarios del informe están registrados: los tres son obligatorios
   * porque el informe completo es lo que el área solicitante usa para decidir al finalista.
   */
  evaluacionCompleta(c: CandidatoAprobado): boolean {
    const form = this.evaluacionForm[c.candidatoId];
    return (
      !!form?.comentarioEntrevista.trim() &&
      !!form?.comentarioPsicotecnico.trim() &&
      !!form?.comentarioRecomendacion.trim()
    );
  }

  /** true si se puede enviar al candidato como finalista y no se está enviando ya. */
  puedeGuardarEvaluacion(c: CandidatoAprobado): boolean {
    return (
      this.puedeEvaluar(c) && this.evaluacionCompleta(c) && !this.guardandoEvaluacion[c.candidatoId]
    );
  }

  // ── Archivos del informe (informe final y evaluación de conocimientos) ───
  /** Los dos documentos que se pueden adjuntar al informe, en orden. Los dos son opcionales. */
  readonly slotsArchivoEvaluacion = SLOTS_ARCHIVO_EVALUACION;
  readonly evaluacionAccept = EVALUACION_ACCEPT;

  /** Archivo recién elegido para ese documento (todavía sin subir). */
  archivoNuevo(c: CandidatoAprobado, codigo: string): File | null {
    return this.evaluacionForm[c.candidatoId]?.archivosNuevos[codigo] ?? null;
  }

  /** Archivo ya subido de ese documento, salvo que se haya quitado en esta edición. */
  archivoGuardado(c: CandidatoAprobado, codigo: string): EvaluacionArchivo | null {
    if (this.evaluacionForm[c.candidatoId]?.quitados.includes(codigo)) return null;
    return c.evaluacion?.archivos?.find((a) => a.tipoCodigo === codigo) ?? null;
  }

  /**
   * Toma el archivo elegido para ese documento. Se valida el peso acá además del backend: los dos
   * viajan adjuntos en el correo al solicitante y el proveedor rechaza el mensaje completo si se
   * pasa, así que conviene avisarlo antes de subir nada.
   */
  onArchivoEvaluacion(event: Event, c: CandidatoAprobado, codigo: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const form = this.evaluacionForm[c.candidatoId];
    if (!form) return;

    const otros = Object.entries(form.archivosNuevos)
      .filter(([k, f]) => k !== codigo && !!f)
      .reduce((total, [, f]) => total + (f as File).size, 0);

    if (otros + file.size > MAX_LONG_LIST_CORREO_BYTES) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivos demasiado pesados',
        text: `Los archivos del informe no pueden superar los ${(MAX_LONG_LIST_CORREO_BYTES / 1024 / 1024).toFixed(1)} MB en total.`,
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    form.archivosNuevos[codigo] = file;
    // Cargar uno nuevo reemplaza al que estuviera guardado: deja de contar como quitado.
    form.quitados = form.quitados.filter((x) => x !== codigo);
    this.cdr.detectChanges();
  }

  /**
   * Quita el documento: si es uno recién elegido solo se descarta, y si ya estaba subido se marca
   * para darlo de baja al guardar (mientras tanto la pantalla lo muestra como vacío).
   */
  quitarArchivoEvaluacion(c: CandidatoAprobado, codigo: string): void {
    const form = this.evaluacionForm[c.candidatoId];
    if (!form) return;

    if (form.archivosNuevos[codigo]) {
      form.archivosNuevos[codigo] = null;
    } else if (!form.quitados.includes(codigo)) {
      form.quitados = [...form.quitados, codigo];
    }
    this.cdr.detectChanges();
  }

  /**
   * Guarda los tres comentarios del candidato y sus archivos y, con eso, lo envía como finalista:
   * el informe queda disponible en la vista del área solicitante.
   */
  guardarEvaluacion(c: CandidatoAprobado): void {
    const form = this.evaluacionForm[c.candidatoId];
    if (!form || this.guardandoEvaluacion[c.candidatoId]) return;

    if (!this.evaluacionCompleta(c)) {
      Swal.fire({
        icon: 'warning',
        title: 'Faltan datos del informe',
        text: 'Registra el resultado de entrevista, el informe psicotécnico y la recomendación GTH antes de enviarlo como finalista.',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    this.guardandoEvaluacion[c.candidatoId] = true;
    this.service
      .guardarEvaluacion(
        c.candidatoId,
        {
          comentarioEntrevista: form.comentarioEntrevista.trim(),
          comentarioPsicotecnico: form.comentarioPsicotecnico.trim(),
          comentarioRecomendacion: form.comentarioRecomendacion.trim(),
          archivosQuitados: form.quitados,
        },
        {
          informeFinal: form.archivosNuevos[EVALUACION_ARCHIVO.informeFinal],
          conocimientos: form.archivosNuevos[EVALUACION_ARCHIVO.conocimientos],
        },
      )
      .subscribe({
        next: (res) => {
          c.evaluacion = res.evaluacion;
          // Lo que estaba pendiente ya quedó subido o dado de baja: la fila vuelve a partir de lo
          // que devolvió el backend y no de lo que el usuario tenía a medio cargar.
          form.archivosNuevos = {};
          form.quitados = [];
          // Enviar al primer finalista mueve el requerimiento a "Selección jefatura": el badge de
          // la cabecera se refresca con la fase que devuelve el backend (viene solo si cambió).
          if (res.estadoCodigo && this.detalle) {
            this.detalle.estadoCodigo = res.estadoCodigo;
            this.detalle.estadoNombre = res.estadoNombre ?? this.detalle.estadoNombre;
          }
          this.guardandoEvaluacion[c.candidatoId] = false;
          this.huboCambios = true;
          this.cdr.detectChanges();
          Swal.fire({
            icon: 'success',
            title: 'Finalista enviado',
            // El mensaje viene del backend: además de confirmar el guardado dice si el aviso al
            // solicitante salió y a qué correo, que es lo único que GTH no puede ver en pantalla.
            text: res.message,
            confirmButtonColor: '#005D9D',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoEvaluacion[c.candidatoId] = false;
          this.cdr.detectChanges();
          this.errorService.handleError(err);
        },
      });
  }

  /**
   * Envía al candidato el correo de fin de proceso por no continuar: deja su resultado en
   * "No pasó" y lo saca del informe de finalistas del solicitante.
   */
  async enviarAgradecimiento(c: CandidatoAprobado): Promise<void> {
    if (this.enviandoAgradecimiento[c.candidatoId]) return;

    const yaEnviado = !!c.evaluacion?.agradecimientoEnviadoEn;
    const confirm = await Swal.fire({
      icon: 'question',
      title: yaEnviado ? '¿Reenviar el correo de fin de proceso?' : '¿Enviar el correo de fin de proceso?',
      html:
        `Se le enviará a <b>${c.correoContacto ?? 'su correo registrado'}</b> el correo de ` +
        'fin de proceso. El candidato quedará registrado como <b>No continúa</b> ' +
        'y dejará de aparecer entre los finalistas del área solicitante.',
      showCancelButton: true,
      confirmButtonText: yaEnviado ? 'Sí, reenviar' : 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#DC2626',
    });
    if (!confirm.isConfirmed) return;

    this.enviandoAgradecimiento[c.candidatoId] = true;
    this.service.enviarAgradecimiento(c.candidatoId).subscribe({
      next: (res) => {
        c.evaluacion = res.evaluacion;
        this.enviandoAgradecimiento[c.candidatoId] = false;
        this.huboCambios = true;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Correo enviado',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoAgradecimiento[c.candidatoId] = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Prellena, por candidato, la cita (con lo ya programado o, por defecto, el primer lugar del
   * catálogo —la oficina principal— y el inicio de la jornada) y la evaluación de su entrevista.
   */
  private prepararFormulariosEntrevista(): void {
    if (!this.detalle) return;
    const lugarPorDefecto = this.detalle.lugaresEntrevista[0]?.id ?? null;

    for (const c of this.detalle.candidatosAprobados) {
      this.entrevistaForm[c.candidatoId] = {
        fecha: c.entrevista?.fecha ?? null,
        hora: c.entrevista?.hora ?? this.horaEntrevistaPorDefecto,
        lugarId: c.entrevista?.lugarId ?? lugarPorDefecto,
      };
      this.evaluacionForm[c.candidatoId] = {
        comentarioEntrevista: c.evaluacion?.comentarioEntrevista ?? '',
        comentarioPsicotecnico: c.evaluacion?.comentarioPsicotecnico ?? '',
        comentarioRecomendacion: c.evaluacion?.comentarioRecomendacion ?? '',
        archivosNuevos: {},
        quitados: [],
      };
    }
  }

  /**
   * Nombre tentativo del candidato a partir del nombre del archivo del CV (quita extensión,
   * separadores y palabras típicas como "CV"). Es solo un prellenado: el usuario lo corrige.
   */
  private derivarNombre(fileName: string): string {
    return fileName
      .replace(/\.[^.]+$/, '')
      .replace(/[_\-.]+/g, ' ')
      .replace(/\b(cv|curriculum|curr[ií]culum|vitae)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
