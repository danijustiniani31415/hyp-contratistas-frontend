import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { ClientPager } from '../../../../../shared/utils/client-pager';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudPersonalService } from '../../services/solicitud-personal.service';
import { Seguimiento } from '../../dtos/solicitud-personal.dto';
import { CandidatoRechazado, etapaRechazoColors } from '../../../shared/dtos/candidato-rechazado.dto';

/**
 * Modal "Estado del reclutamiento" (solo lectura): cabecera con datos clave del
 * requerimiento + línea de tiempo vertical de las fases del pipeline. Se abre desde
 * el botón "Hacer seguimiento" de la tabla "Mis solicitudes de vacante".
 */
@Component({
  standalone: true,
  selector: 'app-gth-seguimiento',
  imports: [CommonModule, AbrilModalPanel, StatusBadge, SearchInput, Paginator, TitleCasePipe],
  templateUrl: './seguimiento.html',
})
export class GthSeguimiento implements OnInit {
  /** Id del requerimiento a mostrar. */
  @Input({ required: true }) requerimientoId!: number;
  @Output() closeModal = new EventEmitter<void>();

  seguimiento: Seguimiento | null = null;

  // ── Historial de candidatos rechazados ──────────────────────────────────
  /** Colores del badge de la etapa en la que se rechazó a un candidato del historial. */
  etapaColors = etapaRechazoColors;

  /** Búsqueda del historial de rechazados (nombre del candidato o etapa del rechazo). */
  busquedaRechazados = '';

  private readonly pagerRechazados = new ClientPager<CandidatoRechazado>();

  constructor(
    private service: SolicitudPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loaderService.show();
    this.service.getSeguimiento(this.requerimientoId).subscribe({
      next: (data) => {
        this.seguimiento = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.closeModal.emit();
      },
    });
  }

  /** Subtítulo del header: "REQ-AAAA-NNNN · Puesto". */
  get subtitulo(): string {
    if (!this.seguimiento) return '';
    const puesto = this.titleCase(this.seguimiento.puesto);
    return puesto ? `${this.seguimiento.codigo} · ${puesto}` : this.seguimiento.codigo;
  }

  /**
   * Etiqueta principal de la tarjeta "Aprobaciones": la decisión que manda sobre ESTA vacante, o el
   * estado mientras siga pendiente. Cuál manda depende del tipo de requerimiento: en una vacante
   * nueva es la de Gerencia General; en un reemplazo hacen falta las DOS —primero la del gerente
   * del área y después la de GTH—, así que la etiqueta las resume: aprobada solo con ambas,
   * rechazada apenas una diga que no. Un ingreso directo no tiene ninguna: llega sin tarjeta.
   */
  get aprobacionGgLabel(): string {
    const ap = this.seguimiento?.aprobacionGg;
    if (!ap) return 'No requerida';
    const d = this.decisionQueManda;
    if (d === true) return 'Aprobada';
    if (d === false) return 'Rechazada';
    return ap.enviadoEn ? 'Pendiente' : 'Correo sin enviar';
  }

  /**
   * La decisión que decide el destino de la vacante: la de Gerencia General en la ruta GG, y la
   * conjunción de las dos firmas en la de reemplazo (aprobada con las dos en true; rechazada apenas
   * una diga que no; pendiente mientras falte alguna).
   */
  private get decisionQueManda(): boolean | null {
    const ap = this.seguimiento?.aprobacionGg;
    if (!ap) return null;
    if (ap.ruta !== 'AREA_GTH') return ap.aprobado;
    if (ap.aprobadoGerenteArea === false || ap.aprobadoGth === false) return false;
    if (ap.aprobadoGerenteArea === true && ap.aprobadoGth === true) return true;
    return null;
  }

  /** Color de la etiqueta principal (verde aprobada, rojo rechazada, ámbar pendiente). */
  get aprobacionGgColor(): string {
    const ap = this.seguimiento?.aprobacionGg;
    if (!ap) return '#6B7280';
    const d = this.decisionQueManda;
    if (d === true) return '#15803D';
    if (d === false) return '#B91C1C';
    return '#B45309';
  }

  /** Detalle bajo la etiqueta: cuándo se decidió y quién, o a qué está esperando. */
  get aprobacionGgDetalle(): string {
    const ap = this.seguimiento?.aprobacionGg;
    // Sin aprobación hay dos motivos posibles: el ingreso directo, que no lo firma nadie, o un
    // requerimiento anterior a que existiera este paso.
    if (!ap)
      return this.seguimiento?.esFft
        ? 'El ingreso directo no pasa por aprobación'
        : 'Registrada antes de este paso del flujo';

    if (ap.ruta === 'AREA_GTH') {
      // El reemplazo lo cierra la ÚLTIMA de las dos firmas, así que se muestra esa fecha. Con un
      // rechazo puede haber una sola: la del que dijo que no, que cierra la vacante ahí mismo.
      const fechas = [ap.gerenteAreaDecididoEn, ap.gthDecididoEn].filter(
        (f): f is string => !!f,
      );
      const ultima = fechas.sort().pop();
      if (this.decisionQueManda !== null && ultima) {
        const quien = ap.aprobadoGerenteArea === false ? 'Gerente del área' : 'Gerente del área y GTH';
        return `${quien} · ${this.fecha(ultima)}`;
      }
      if (!ap.enviadoEn) return 'No se pudo enviar el correo; usa «Reenviar aprobación»';
      // Las dos firmas van EN ORDEN: primero el gerente del área y, con su visto bueno, GTH. La
      // línea dice en manos de quién está ahora, no a quiénes se le mandó alguna vez.
      return ap.gerenteAreaDecididoEn
        ? `En Gestión del Talento Humano desde el ${this.fecha(ap.gerenteAreaDecididoEn)}`
        : `Enviada al gerente del área el ${this.fecha(ap.enviadoEn)}`;
    }

    if (ap.decididoEn) return `Gerencia General · ${this.fecha(ap.decididoEn)}`;
    return ap.enviadoEn
      ? `Enviada a Gerencia General el ${this.fecha(ap.enviadoEn)}`
      : 'No se pudo enviar el correo; usa «Reenviar aprobación»';
  }

  /**
   * Segunda línea de la tarjeta: el desglose de las dos firmas. Solo tiene sentido en los
   * reemplazos, que son los únicos que las tienen — en la ruta de Gerencia General la etiqueta
   * principal ya lo dice todo y repetirlo sería ruido. Null cuando no aplica.
   */
  get aprobacionAreaLabel(): string | null {
    const ap = this.seguimiento?.aprobacionGg;
    if (!ap || ap.ruta !== 'AREA_GTH') return null;
    return (
      `Gerente del área: ${this.textoFirma(ap.aprobadoGerenteArea)} · ` +
      `GTH: ${this.textoFirma(ap.aprobadoGth)}`
    );
  }

  private textoFirma(v: boolean | null): string {
    if (v === true) return 'aprobada';
    if (v === false) return 'rechazada';
    return 'sin decidir';
  }

  /** Color de esa segunda línea; gris mientras falte alguna de las dos firmas. */
  get aprobacionAreaColor(): string {
    const d = this.decisionQueManda;
    if (d === true) return '#15803D';
    if (d === false) return '#B91C1C';
    return '#9CA3AF';
  }

  /** Comentario que dejó Gerencia General al decidir (si hay). */
  get aprobacionGgComentario(): string | null {
    return this.seguimiento?.aprobacionGg?.comentario ?? null;
  }

  /** Comentarios que dejaron el gerente del área y GTH al decidir un reemplazo (si hay). */
  get aprobacionAreaComentario(): string | null {
    const ap = this.seguimiento?.aprobacionGg;
    if (!ap) return null;
    const partes = [
      ap.gerenteAreaComentario ? `Gerente del área: ${ap.gerenteAreaComentario}` : null,
      ap.gthComentario ? `GTH: ${ap.gthComentario}` : null,
    ].filter((x): x is string => !!x);
    return partes.length > 0 ? partes.join(' · ') : null;
  }

  // ── Historial de candidatos rechazados ──────────────────────────────────
  /** Volver a la primera página al cambiar la búsqueda (si no, se quedaría en una vacía). */
  onBuscarRechazados(): void {
    this.pagerRechazados.reset();
  }

  get rechazadosFiltrados(): CandidatoRechazado[] {
    const rechazados = this.seguimiento?.candidatosRechazados ?? [];
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

  private fecha(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-PE');
  }

  private titleCase(value: string | null | undefined): string {
    return value ? new TitleCasePipe().transform(value) : '';
  }
}
