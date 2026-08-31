import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AprobacionesService } from '../../services/aprobaciones.service';
import { estadoAprobacionColors } from '../../estado-aprobacion-colors';
import {
  AprobacionDetalle,
  AprobacionNivelResumen,
  AprobacionVacante,
} from '../../dtos/aprobaciones.dto';
import { DestinatarioSolicitud } from '../../../shared/dtos/destinatarios.dto';

/**
 * Modal de decisión sobre una solicitud de personal: sus vacantes de la ruta del usuario y, en cada
 * una, Aprobar o Rechazar. Las de la otra ruta no llegan del backend — el Gerente General decide
 * las nuevas, el gerente del área y GTH los reemplazos —, así que acá nunca aparecen.
 *
 * El usuario marca su casilla (`data.nivel`, que el backend resuelve desde la categoría de su
 * ficha) y ve como información la del otro firmante de su MISMA ruta.
 *
 * Un reemplazo necesita las dos firmas de su ruta y van en ORDEN: primero el gerente del área y,
 * con su visto bueno, GTH — que por eso ve siempre la casilla del área ya aprobada. Una vacante
 * nueva se mueve con la de Gerencia General sola. Si el nivel del usuario ya decidió, el modal abre
 * en lectura — es también la ficha del historial.
 */
@Component({
  standalone: true,
  selector: 'app-gth-aprobacion-decision',
  imports: [CommonModule, FormsModule, AbrilModalPanel, TitleCasePipe],
  templateUrl: './decision.html',
  styleUrl: './decision.css',
})
export class GthAprobacionDecision implements OnInit {
  /** Aprobación a decidir (o a consultar, si el nivel del usuario ya decidió). */
  @Input({ required: true }) aprobacionId!: number;

  @Output() closeModal = new EventEmitter<void>();
  /** Se emite tras registrar la decisión, para que la lista se recargue. */
  @Output() decided = new EventEmitter<void>();

  data: AprobacionDetalle | null = null;
  cargando = true;
  enviando = false;

  /** Decisión en curso por requerimiento: true = aprobar, false = rechazar, undefined = sin elegir. */
  decisiones = new Map<number, boolean>();

  comentario = '';

  readonly estadoColors = estadoAprobacionColors;

  constructor(
    private service: AprobacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    // App zoneless: hay que forzar el refresco tras el subscribe o la vista no se actualiza.
    this.service.getDetalle(this.aprobacionId).subscribe({
      next: (data) => {
        this.data = data;
        // En lectura se muestra lo que quedó registrado en MI casilla, no lo que dijo el otro nivel.
        if (!data.puedeDecidir) {
          this.comentario = this.miCasilla?.comentario ?? '';
          for (const v of data.vacantes) {
            const mia = this.decisionRegistrada(v);
            if (mia !== null) this.decisiones.set(v.requerimientoId, mia);
          }
        }
        this.cargando = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
        this.closeModal.emit();
      },
    });
  }

  // ── Nivel del usuario y las casillas ────────────────────────────────────
  get esGerenteGeneral(): boolean {
    return this.data?.nivel === 'GERENTE_GENERAL';
  }

  get esGth(): boolean {
    return this.data?.nivel === 'GTH';
  }

  /** Casilla que el usuario puede marcar. */
  get miCasilla(): AprobacionNivelResumen | null {
    if (!this.data) return null;
    if (this.esGerenteGeneral) return this.data.gerenteGeneral;
    if (this.esGth) return this.data.gth;
    return this.data.gerenteArea;
  }

  /** Nombre de la firma del usuario, para rotular su casilla. */
  get miNivelLabel(): string {
    if (this.esGerenteGeneral) return 'Gerencia General';
    if (this.esGth) return 'GTH';
    return 'Gerente del área';
  }

  /**
   * Las OTRAS firmas que esta solicitud necesita: solo se muestran, nunca se editan. Son las que
   * la solicitud requiere menos la propia — en un reemplazo, GTH ve el visto bueno del área (el
   * que le abrió el turno) y el gerente del área ve que GTH todavía no firmó.
   */
  get otrasCasillas(): { etiqueta: string; resumen: AprobacionNivelResumen }[] {
    const d = this.data;
    if (!d) return [];
    const out: { etiqueta: string; resumen: AprobacionNivelResumen }[] = [];
    if (d.requiereGerenteGeneral && !this.esGerenteGeneral)
      out.push({ etiqueta: 'Gerencia General', resumen: d.gerenteGeneral });
    if (d.requiereGerenteArea && d.nivel !== 'GERENTE_AREA')
      out.push({ etiqueta: 'Gerente del área', resumen: d.gerenteArea });
    if (d.requiereGth && !this.esGth)
      out.push({ etiqueta: 'GTH', resumen: d.gth });
    return out;
  }

  get titulo(): string {
    if (this.soloLectura) return 'Decisión registrada';
    return 'Aprobación de solicitud de personal';
  }

  // ── Decisión por vacante ────────────────────────────────────────────────
  /**
   * Las vacantes del modal. Ya vienen recortadas a la ruta del usuario desde el backend —el Gerente
   * General recibe las nuevas, el gerente del área y GTH los reemplazos—, así que acá no
   * se vuelve a filtrar: las de la otra ruta no llegan.
   */
  get vacantes(): AprobacionVacante[] {
    return this.data?.vacantes ?? [];
  }

  get soloLectura(): boolean {
    return !this.data?.puedeDecidir;
  }

  /** Lo que MI nivel dejó registrado en esta vacante (null si aún no decidió). */
  decisionRegistrada(v: AprobacionVacante): boolean | null {
    if (this.esGerenteGeneral) return v.aprobadoGerenteGeneral;
    if (this.esGth) return v.aprobadoGth;
    return v.aprobadoGerenteArea;
  }

  /**
   * Lo que la OTRA firma dejó registrado en esta vacante (null si no aplica o no opinó). Solo los
   * reemplazos tienen dos firmas; en la ruta de Gerencia General no hay «otra».
   */
  decisionOtroNivel(v: AprobacionVacante): boolean | null {
    if (v.ruta !== 'AREA_GTH') return null;
    return this.data?.nivel === 'GERENTE_AREA' ? v.aprobadoGth : v.aprobadoGerenteArea;
  }

  /**
   * La postura de la OTRA firma de la vacante, cuando la hay. Solo tiene sentido en los reemplazos
   * (los únicos con dos firmas). Con las firmas en orden, en la práctica es lo que ve GTH: el
   * visto bueno del área que le abrió el turno. Cadena vacía cuando la otra parte todavía no opinó
   * —el caso del gerente del área, que firma primero—: repetir «sin decidir» en cada fila no
   * aporta nada, la casilla de arriba ya lo dice una vez.
   */
  textoOtroNivel(v: AprobacionVacante): string {
    const otro = this.decisionOtroNivel(v);
    if (otro === null) return '';
    const quien = this.data?.nivel === 'GERENTE_AREA' ? 'GTH' : 'Gerente del área';
    return `${quien}: ${otro ? 'aprobada' : 'rechazada'}`;
  }

  decision(v: AprobacionVacante): boolean | undefined {
    return this.decisiones.get(v.requerimientoId);
  }

  marcar(v: AprobacionVacante, aprobado: boolean): void {
    if (this.soloLectura) return;
    this.decisiones.set(v.requerimientoId, aprobado);
  }

  marcarTodas(aprobado: boolean): void {
    if (this.soloLectura) return;
    for (const v of this.vacantes) this.decisiones.set(v.requerimientoId, aprobado);
  }

  get aprobadas(): number {
    return this.vacantes.filter((v) => this.decisiones.get(v.requerimientoId) === true).length;
  }

  get rechazadas(): number {
    return this.vacantes.filter((v) => this.decisiones.get(v.requerimientoId) === false).length;
  }

  /** Faltan vacantes por decidir: no se puede confirmar una decisión a medias. */
  get pendientes(): number {
    return this.vacantes.length - this.aprobadas - this.rechazadas;
  }

  get puedeConfirmar(): boolean {
    return !this.soloLectura && !this.enviando && this.vacantes.length > 0 && this.pendientes === 0;
  }

  /** Resumen que se muestra junto al botón de confirmar. */
  get resumenDecision(): string {
    if (this.pendientes > 0) {
      return this.pendientes === 1
        ? 'Falta decidir 1 vacante.'
        : `Faltan decidir ${this.pendientes} vacantes.`;
    }
    if (this.rechazadas === 0) return `Aprobarás las ${this.aprobadas} vacantes solicitadas.`;
    if (this.aprobadas === 0) return `Rechazarás las ${this.rechazadas} vacantes solicitadas.`;
    return `Aprobarás ${this.aprobadas} y rechazarás ${this.rechazadas}.`;
  }

  // ── Aviso "a quién le llega esta decisión" ──────────────────────────────
  // Toda decisión aprobatoria dispara correos: la de Gerencia General manda el aviso a GTH y el de
  // vacantes aprobadas a TI; la del gerente del área le pide a GTH la segunda firma del reemplazo;
  // la de GTH, que es esa segunda firma, manda el de reemplazos aprobados y el de TI. Los
  // destinatarios llegan del backend ya fusionados en una sola lista y resueltos con la misma
  // lógica del envío real, así que el aviso no puede prometer algo distinto de lo que sale.

  /** true cuando ya se sabe a quién le llegarían los correos (null = no aplica o no se pudo resolver). */
  get destinatariosCargados(): boolean {
    return !this.soloLectura && !!this.data?.destinatarios;
  }

  get destinatariosPara(): DestinatarioSolicitud[] {
    return this.data?.destinatarios?.para ?? [];
  }

  get destinatariosCopias(): DestinatarioSolicitud[] {
    return this.data?.destinatarios?.copias ?? [];
  }

  /**
   * La decisión en curso no dispara ningún correo. Con las firmas en secuencia eso pasa en un solo
   * caso: rechazar todo. Cualquier aprobación manda algo — la de Gerencia General y la de GTH
   * pasan sus vacantes a reclutamiento, y la del gerente del área le pide a GTH la segunda firma.
   */
  get sinEnvio(): boolean {
    return this.vacantes.length > 0 && this.pendientes === 0 && this.aprobadas === 0;
  }

  /** Por qué no sale correo. */
  get motivoSinEnvio(): string {
    return 'Rechazas todas las vacantes: no se enviará ningún correo.';
  }

  /** Tooltip del correo: el nombre de la persona cuando se conoce, más por qué lo recibe. */
  etiquetaDestinatario(d: DestinatarioSolicitud): string {
    return d.nombre ? `${d.nombre} — ${d.origen}` : d.origen;
  }

  /**
   * Lo que va después de cada correo de la lista: ", " entre los primeros, " y " antes del último
   * y el punto final al cerrar. Va acá y no en la plantilla porque los separadores escritos entre
   * etiquetas se pierden al compilar (el template quita los nodos de solo espacios).
   */
  separadorCorreo(i: number, total: number): string {
    if (i === total - 1) return '.';
    return i === total - 2 ? ' y ' : ', ';
  }

  // ── Confirmación ────────────────────────────────────────────────────────
  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar) return;

    // El detalle cambia según quién firma: la del Gerente General y la de GTH mandan sus vacantes
    // a reclutamiento; la del gerente del área, que es la PRIMERA de las dos de un reemplazo, se
    // las pasa a GTH para que ponga la segunda.
    const aReclutamiento =
      this.aprobadas === 0
        ? 'Ninguna vacante continuará y Gestión de Talento Humano no recibirá la solicitud.'
        : this.rechazadas === 0
          ? `Las ${this.aprobadas} vacantes pasarán a Gestión de Talento Humano para iniciar el reclutamiento.`
          : `${this.aprobadas} vacante(s) pasarán a Gestión de Talento Humano y ${this.rechazadas} no continuarán.`;

    const detalle =
      this.esGerenteGeneral || this.esGth
        ? aReclutamiento
        : this.aprobadas === 0
          ? 'Ninguna vacante continuará: tu rechazo la cierra y no pasa a Gestión de Talento Humano.'
          : `${this.aprobadas} vacante(s) pasarán a Gestión de Talento Humano para su aprobación` +
            (this.rechazadas > 0 ? ` y ${this.rechazadas} no continuarán.` : '.');

    const confirm = await Swal.fire({
      title: '¿Confirmas tu decisión?',
      html: `${detalle}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-logo-blue)',
    });
    if (!confirm.isConfirmed) return;

    this.enviando = true;
    this.loaderService.show();
    this.service
      .decidir(this.aprobacionId, {
        decisiones: this.vacantes.map((v) => ({
          requerimientoId: v.requerimientoId,
          aprobado: this.decisiones.get(v.requerimientoId) === true,
        })),
        comentario: this.comentario.trim() ? this.comentario.trim() : null,
      })
      .subscribe({
        next: (res) => {
          this.enviando = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          Swal.fire({
            title: 'Decisión registrada',
            text: res.message,
            icon: 'success',
            confirmButtonColor: 'var(--color-abril-logo-blue)',
          });
          this.decided.emit();
          this.closeModal.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.enviando = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          this.errorService.handleError(err);
        },
      });
  }
}
