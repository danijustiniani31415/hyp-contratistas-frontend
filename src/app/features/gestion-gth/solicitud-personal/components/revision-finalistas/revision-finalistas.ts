import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudPersonalService } from '../../services/solicitud-personal.service';
import { Finalista, RevisionFinalistas } from '../../dtos/solicitud-personal.dto';

/**
 * Modal "Finalistas enviados por GTH" (vista del solicitante): lista los candidatos que GTH ya
 * entrevistó y evaluó, con los comentarios del informe (resultado de la entrevista, informe
 * psicotécnico y recomendación de GTH) y el link a su CV.
 *
 * Sobre el finalista seleccionado se toma la decisión final (RF-REC-24):
 *  - Aprobarlo lo manda al EMO de ingreso, que es el último paso del proceso: según cómo salga el
 *    examen, GTH cierra el reclutamiento —y ahí el seleccionado pasa a onboarding— o retoma el
 *    proceso con otro candidato.
 *  - Rechazarlo le envía el mismo correo de fin de proceso que manda GTH a quien no continúa; si
 *    con eso no queda ningún finalista, el requerimiento vuelve al paso en el que GTH envía la
 *    long list/CVs al solicitante (RF-REC-25).
 */
@Component({
  standalone: true,
  selector: 'app-gth-revision-finalistas',
  imports: [CommonModule, AbrilModalPanel, TitleCasePipe],
  templateUrl: './revision-finalistas.html',
})
export class GthRevisionFinalistas implements OnInit {
  /** Id del requerimiento cuyo informe de finalistas se muestra. */
  @Input({ required: true }) requerimientoId!: number;
  /**
   * false = modo consulta: se lee el informe pero no se decide. Es lo que ve quien pertenece al
   * área sin ser jefatura y entra por el enlace del correo; la decisión es de JEFE / GERENTE /
   * GERENTE GENERAL y el backend la rechaza igual (403).
   */
  @Input() puedeGestionar = true;
  @Output() closeModal = new EventEmitter<void>();
  /** Emite cuando se registró una decisión (para que el panel del solicitante se recargue). */
  @Output() decided = new EventEmitter<void>();

  revision: RevisionFinalistas | null = null;

  /** Finalista cuyo informe se muestra en el panel derecho (por defecto, el primero). */
  seleccionado: Finalista | null = null;

  /** true mientras se registra una decisión (evita doble envío). */
  decidiendo = false;

  constructor(
    private service: SolicitudPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar({ cerrarSiFalla: true });
  }

  /**
   * Carga (o recarga) el informe.
   *  - `cerrarSiFalla`: cierra el modal cuando la primera carga falla.
   *  - `irAPendiente`: tras decidir sobre un finalista, deja mostrado al siguiente que aún no
   *    tiene decisión (en vez de quedarse en el que se acaba de rechazar).
   */
  private cargar(opts: { cerrarSiFalla?: boolean; irAPendiente?: boolean } = {}): void {
    this.loaderService.show();
    this.service.getRevisionFinalistas(this.requerimientoId).subscribe({
      next: (data) => {
        const previo = this.seleccionado?.candidatoId;
        this.revision = data;
        this.seleccionado = opts.irAPendiente
          ? data.finalistas.find((f) => !this.estaDecidido(f)) ?? data.finalistas[0] ?? null
          : data.finalistas.find((f) => f.candidatoId === previo) ?? data.finalistas[0] ?? null;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        if (opts.cerrarSiFalla) this.closeModal.emit();
      },
    });
  }

  /** Subtítulo del header: "REQ-AAAA-NNNN · Puesto". */
  get subtitulo(): string {
    if (!this.revision) return '';
    const puesto = this.revision.puesto ? new TitleCasePipe().transform(this.revision.puesto) : '';
    return puesto ? `${this.revision.codigo} · ${puesto}` : this.revision.codigo;
  }

  get total(): number {
    return this.revision?.finalistas.length ?? 0;
  }

  seleccionar(f: Finalista): void {
    this.seleccionado = f;
  }

  /** Iniciales para el avatar del finalista (máx. 2 letras). */
  iniciales(nombre: string): string {
    const parts = (nombre || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0][0] ?? '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
    return (first + second).toUpperCase();
  }

  /** Nombre del archivo del CV (o uno derivado del nombre si GTH no lo cargó con nombre). */
  nombreCv(f: Finalista): string {
    return f.cvNombre || `CV_${f.nombre}.pdf`;
  }

  // ── Decisión final sobre el finalista ───────────────────────────────────
  /** true si el finalista ya fue aprobado por el solicitante. */
  esSeleccionado(f: Finalista): boolean {
    return f.evaluacion.resultadoCodigo === 'SELECCIONADO';
  }

  /** true si el finalista ya fue rechazado por el solicitante. */
  esRechazado(f: Finalista): boolean {
    return f.evaluacion.resultadoCodigo === 'RECHAZADO';
  }

  /** true si sobre el finalista ya se tomó una decisión (aprobado o rechazado). */
  estaDecidido(f: Finalista): boolean {
    return this.esSeleccionado(f) || this.esRechazado(f);
  }

  /** true si el proceso ya se cerró: alguien fue seleccionado y no hay más decisiones que tomar. */
  get procesoCerrado(): boolean {
    return (this.revision?.finalistas ?? []).some((f) => this.esSeleccionado(f));
  }

  /**
   * Solo se decide sobre el finalista mostrado, si sigue pendiente, el proceso no está cerrado y
   * el usuario es jefatura del área (los demás entran a leer el informe).
   */
  get puedeDecidir(): boolean {
    return (
      this.puedeGestionar
      && !!this.seleccionado && !this.estaDecidido(this.seleccionado) && !this.procesoCerrado && !this.decidiendo
    );
  }

  /**
   * Aprueba al finalista mostrado: el puesto queda cubierto y GTH le programa su EMO de ingreso.
   * Al aprobar, los finalistas que seguían en carrera quedan fuera y reciben el correo de fin de
   * proceso, así que se avisa en el diálogo: es un correo a terceros que se dispara con este clic.
   */
  async aprobar(): Promise<void> {
    const f = this.seleccionado;
    if (!f || !this.puedeDecidir) return;

    const otros = this.pendientes - 1;
    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Aprobar a este finalista?',
      html:
        `Se enviará a GTH tu decisión de continuar con <b>${new TitleCasePipe().transform(f.nombre)}</b>. ` +
        'Con esto el puesto queda cubierto y GTH le programará su examen médico de ingreso.' +
        (this.areaDestinoNombre ? ` Ingresará al área de <b>${this.areaDestinoNombre}</b>.` : '') +
        (otros > 0
          ? ` Los otros <b>${otros}</b> finalista(s) quedarán fuera del proceso y recibirán el correo de fin de proceso.`
          : ''),
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar y enviar a GTH',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#005D9D',
    });
    if (!confirm.isConfirmed) return;

    this.decidir(f, true);
  }

  /** Rechaza al finalista mostrado: se le envía el correo de fin de proceso. */
  async rechazar(): Promise<void> {
    const f = this.seleccionado;
    if (!f || !this.puedeDecidir) return;

    const ultimo = this.pendientes === 1;
    const confirm = await Swal.fire({
      icon: 'warning',
      title: '¿Rechazar a este finalista?',
      html:
        `Se le enviará a <b>${new TitleCasePipe().transform(f.nombre)}</b> el correo de fin de proceso ` +
        'y quedará fuera del proceso.' +
        (ultimo
          ? ' Es el último finalista en carrera: al rechazarlo, el requerimiento volverá al paso en el que GTH envía la long list y los CVs.'
          : ''),
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazar finalista',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#DC2626',
    });
    if (!confirm.isConfirmed) return;

    this.decidir(f, false);
  }

  /**
   * Área a la que entra el seleccionado. La decide el puesto que se pidió, no el solicitante:
   * acá solo se muestra. Null cuando el puesto no tiene destino (los de obra), y entonces el
   * backend usa el área de quien pidió la vacante.
   */
  get areaDestinoNombre(): string | null {
    return this.revision?.areaDestino?.nombre ?? null;
  }

  /** Finalistas que todavía no tienen decisión del solicitante. */
  get pendientes(): number {
    return (this.revision?.finalistas ?? []).filter((f) => !this.estaDecidido(f)).length;
  }

  private decidir(f: Finalista, aprobado: boolean): void {
    this.decidiendo = true;
    this.loaderService.show();
    this.service.decidirFinalista(this.requerimientoId, f.candidatoId, aprobado).subscribe({
      next: (res) => {
        this.decidiendo = false;
        this.loaderService.hide();
        this.decided.emit();

        Swal.fire({
          icon: res.aprobado ? 'success' : res.todosRechazados ? 'info' : 'success',
          title: res.aprobado
            ? 'Selección final enviada'
            : res.todosRechazados
              ? 'Finalista rechazado'
              : 'Finalista rechazado',
          text: res.message,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#005D9D',
        });

        // Al aprobar (proceso cerrado) o al rechazar al último finalista ya no queda nada que
        // revisar: se cierra el modal. Si aún quedan finalistas, se recarga para pintar el badge
        // y se deja mostrado al siguiente pendiente, que es sobre el que toca decidir.
        if (res.aprobado || res.todosRechazados) this.closeModal.emit();
        else this.cargar({ irAPendiente: true });
      },
      error: (err: HttpErrorResponse) => {
        this.decidiendo = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }
}
