import {
  ChangeDetectionStrategy,
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
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { OnboardingService } from '../../services/onboarding.service';
import { FaseOnboarding, OnboardingListItem } from '../../dtos/onboarding.dto';
import { avanceColor, estadoOnboardingColors } from '../../onboarding-estado-colors';
import {
  ACTIVIDAD,
  ActividadEstado,
  AvanceChecklist,
  FASE,
  actividadesDeFase,
  avanceChecklist,
  faseCompletada,
  hechasEnFase,
} from '../../onboarding-checklist';

/**
 * Detalle del onboarding de un colaborador: se abre al hacer clic en una fila de la tabla.
 *
 * Muestra las «Fases» del proceso y, debajo, el checklist operativo de la fase que se está viendo.
 * Se puede navegar hacia atrás y hacia adelante entre las fases ya alcanzadas para ver el historial;
 * las fases futuras quedan bloqueadas (RF-ONB-26: solo se muestran las fases alcanzadas y el
 * siguiente paso).
 *
 * De momento la única fase con operación real es la primera: revisar la carta oferta firmada,
 * aprobarla y continuar. Lo normal es que el propio colaborador la firme desde el enlace que se le
 * envió —y entonces acá solo se revisa—; adjuntarla a mano quedó como respaldo para quien la firme en
 * papel. El resto del checklist se dibuja para que se vea el proceso completo, pero sin acciones — se
 * irán habilitando fase por fase.
 */
@Component({
  standalone: true,
  selector: 'app-gth-onboarding-detalle-modal',
  imports: [CommonModule, FormsModule, AbrilModalPanel, StatusBadge, TitleCasePipe],
  templateUrl: './onboarding-detalle-modal.html',
  styleUrl: './onboarding-detalle-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GthOnboardingDetalleModal implements OnInit {
  /** Fila de la tabla que se abrió. Se mantiene una copia local que se actualiza con cada acción. */
  @Input({ required: true }) colaborador!: OnboardingListItem;

  /** Catálogo de fases con su checklist (viene de la bandeja). */
  @Input() fases: FaseOnboarding[] = [];

  /** Emite la fila ya actualizada; el padre la reemplaza en la tabla sin recargar la bandeja. */
  @Output() actualizado = new EventEmitter<OnboardingListItem>();
  @Output() closeModal = new EventEmitter<void>();

  item!: OnboardingListItem;

  /** Fase que se está viendo (por `orden`), independiente de en cuál está parado el colaborador. */
  faseVista = 1;

  subiendo = false;
  aprobando = false;
  avanzando = false;
  reenviando = false;

  /**
   * Corrección administrativa de la razón social antes de continuar (RF-ONB-03). Todavía no está
   * implementada: se muestra para que el checklist refleje el proceso completo, pero no se guarda.
   */
  corregirRazonSocial = false;

  readonly ACTIVIDAD = ACTIVIDAD;
  estadoColors = estadoOnboardingColors;
  avanceColor = avanceColor;

  constructor(
    private service: OnboardingService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.item = { ...this.colaborador };
    this.faseVista = this.item.faseOrden;
  }

  // ── Fases ───────────────────────────────────────────────────────────────

  get fase(): FaseOnboarding | null {
    return this.fases.find((f) => f.orden === this.faseVista) ?? null;
  }

  get totalFases(): number {
    return this.fases.length;
  }

  /** True si la fase ya quedó atrás para este colaborador. */
  completada(fase: FaseOnboarding): boolean {
    return faseCompletada(fase, this.item);
  }

  /** Actividades hechas en una fase (el número que va bajo su círculo). */
  hechas(fase: FaseOnboarding): number {
    return hechasEnFase(fase, this.item);
  }

  /** Solo se puede entrar a las fases ya alcanzadas: las futuras aún no tienen nada que mostrar. */
  alcanzada(fase: FaseOnboarding): boolean {
    return fase.orden <= this.item.faseOrden;
  }

  irAFase(fase: FaseOnboarding): void {
    if (this.alcanzada(fase)) this.faseVista = fase.orden;
  }

  // ── Checklist de la fase que se está viendo ─────────────────────────────

  get actividades(): ActividadEstado[] {
    const fase = this.fase;
    return fase ? actividadesDeFase(fase, this.item) : [];
  }

  get hechasEnVista(): number {
    const fase = this.fase;
    return fase ? hechasEnFase(fase, this.item) : 0;
  }

  /**
   * Conteos del checklist. El PORCENTAJE no se calcula acá: se usa `item.avancePorcentaje`, que ya
   * viene del backend, para que la tabla y el detalle no puedan mostrar dos números distintos.
   */
  get avance(): AvanceChecklist {
    return avanceChecklist(this.fases, this.item);
  }

  /** True cuando se está viendo la fase en la que el colaborador está parado (la operable). */
  get viendoFaseActual(): boolean {
    return this.faseVista === this.item.faseOrden;
  }

  // ── Carta oferta firmada ────────────────────────────────────────────────

  get tieneCartaFirmada(): boolean {
    return !!this.item.cartaFirmadaUrl;
  }

  get cartaAprobada(): boolean {
    return !!this.item.cartaFirmadaAprobadaEn;
  }

  /**
   * True si el documento firmado lo produjo el propio colaborador desde el enlace público. En ese
   * caso GTH no adjuntó nada: solo tiene que revisarlo y aprobarlo.
   */
  get firmadaPorPostulante(): boolean {
    return !!this.item.cartaFirmadaPostulanteEn;
  }

  /**
   * Reenvía el correo con el enlace de firma. Es también la vía por la que un onboarding abierto
   * antes de la firma en línea obtiene su enlace: el backend le genera el token en ese momento.
   */
  reenviarEnlace(): void {
    if (this.reenviando) return;

    Swal.fire({
      icon: 'question',
      title: '¿Reenviar el enlace de firma?',
      html: this.item.correo
        ? `Se le volverá a enviar a <b>${this.item.correo}</b> el correo con el enlace para leer y firmar su carta oferta.`
        : 'Se le volverá a enviar el correo con el enlace para leer y firmar su carta oferta.',
      showCancelButton: true,
      confirmButtonText: 'Reenviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-logo-blue)',
    }).then((res) => {
      if (!res.isConfirmed) return;

      this.reenviando = true;
      this.loaderService.show();

      this.service.reenviarEnlaceFirma(this.item.onboardingId).subscribe({
        next: (r) => {
          this.reenviando = false;
          this.loaderService.hide();
          this.aplicar(r.colaborador);
          Swal.fire({ icon: 'success', title: 'Enlace reenviado', text: r.message });
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.reenviando = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  /**
   * Carga a mano desde el input oculto: sirve tanto para adjuntar la carta firmada por primera vez
   * (respaldo, cuando el colaborador la firmó en papel) como para reemplazar la que ya está.
   */
  onReemplazoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    // Se limpia el input para que volver a elegir el mismo archivo dispare el change de nuevo.
    input.value = '';
    if (archivo) this.reemplazarCartaFirmada(archivo);
  }

  /** Reemplazar la carta borra la aprobación anterior: se avisa antes de subir la nueva. */
  reemplazarCartaFirmada(archivo: File): void {
    if (!this.cartaAprobada) {
      this.subirCartaFirmada(archivo);
      return;
    }
    Swal.fire({
      icon: 'question',
      title: '¿Reemplazar la carta aprobada?',
      text: 'La aprobación actual se anula y tendrás que volver a aprobar la carta nueva.',
      showCancelButton: true,
      confirmButtonText: 'Reemplazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-logo-blue)',
    }).then((res) => {
      if (res.isConfirmed) this.subirCartaFirmada(archivo);
    });
  }

  private subirCartaFirmada(archivo: File): void {
    if (this.subiendo) return;
    this.subiendo = true;
    this.loaderService.show();

    this.service.subirCartaFirmada(this.item.onboardingId, archivo).subscribe({
      next: (res) => {
        this.subiendo = false;
        this.loaderService.hide();
        this.aplicar(res.colaborador);
        Swal.fire({ icon: 'success', title: 'Carta firmada adjuntada', text: res.message });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendo = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  aprobarCarta(): void {
    if (this.aprobando || !this.tieneCartaFirmada || this.cartaAprobada) return;

    Swal.fire({
      icon: 'question',
      title: '¿Aprobar la carta oferta firmada?',
      text: 'Confirma que revisaste el documento adjunto y que las condiciones son correctas.',
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-logo-blue)',
    }).then((res) => {
      if (!res.isConfirmed) return;

      this.aprobando = true;
      this.loaderService.show();

      this.service.aprobarCartaFirmada(this.item.onboardingId).subscribe({
        next: (r) => {
          this.aprobando = false;
          this.loaderService.hide();
          this.aplicar(r.colaborador);
          Swal.fire({ icon: 'success', title: 'Carta aprobada', text: r.message });
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.aprobando = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  // ── Navegación del pie del modal ────────────────────────────────────────

  get puedeRetroceder(): boolean {
    return this.faseVista > 1;
  }

  retroceder(): void {
    if (this.puedeRetroceder) this.faseVista--;
  }

  /**
   * Qué hace el botón de la derecha: navegar por el historial cuando se está viendo una fase ya
   * pasada, o cerrar la fase actual y pasar a la siguiente cuando se está en la que toca.
   */
  get etiquetaAvanzar(): string {
    if (!this.viendoFaseActual) return 'Fase siguiente';
    return this.esUltimaFase ? 'Onboarding completo' : 'Continuar';
  }

  get esUltimaFase(): boolean {
    return this.item.faseOrden >= this.totalFases;
  }

  get puedeAvanzar(): boolean {
    if (this.avanzando) return false;
    if (!this.viendoFaseActual) return true;
    return this.motivoBloqueo === null;
  }

  /** Por qué no se puede continuar todavía (va como tooltip del botón). */
  get motivoBloqueo(): string | null {
    if (!this.viendoFaseActual) return null;
    if (this.esUltimaFase) return 'El onboarding ya está en su última fase.';

    const fase = this.fase;
    if (fase?.codigo !== FASE.cartaOfertaFirmada)
      return `La fase «${fase?.nombre}» todavía no está habilitada para avanzar desde el sistema.`;

    if (!this.tieneCartaFirmada)
      return 'Todavía no hay carta oferta firmada: espera a que el colaborador la firme desde su enlace, o adjúntala a mano.';
    if (!this.cartaAprobada) return 'Aprueba la carta oferta firmada antes de continuar.';
    return null;
  }

  avanzar(): void {
    if (!this.puedeAvanzar) return;

    // Historial: solo se mueve la vista, no el proceso.
    if (!this.viendoFaseActual) {
      this.faseVista++;
      return;
    }

    this.avanzando = true;
    this.loaderService.show();

    this.service.avanzarFase(this.item.onboardingId).subscribe({
      next: (res) => {
        this.avanzando = false;
        this.loaderService.hide();
        this.aplicar(res.colaborador);
        if (res.colaborador) this.faseVista = res.colaborador.faseOrden;
        Swal.fire({ icon: 'success', title: 'Fase completada', text: res.message });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.avanzando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /** Deja la fila actualizada en el modal y avisa al padre para que la reemplace en la tabla. */
  private aplicar(colaborador: OnboardingListItem | null): void {
    if (!colaborador) return;
    this.item = colaborador;
    this.actualizado.emit(colaborador);
  }
}
