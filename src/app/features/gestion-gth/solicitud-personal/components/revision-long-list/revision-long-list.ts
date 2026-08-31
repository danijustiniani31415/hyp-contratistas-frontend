import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudPersonalService } from '../../services/solicitud-personal.service';
import { CandidatoDecision, CandidatoRevision, RevisionLongList } from '../../dtos/solicitud-personal.dto';

/**
 * Modal "Revisar long list y CVs" (vista del solicitante): lista los candidatos que GTH cargó
 * en la long list de un requerimiento, con su CV y el comentario de GTH. El solicitante los
 * revisa para aprobar/rechazar y enviar su decisión a GTH.
 *
 * Los botones Aprobar/Rechazar funcionan como un toggle (checkbox): cada candidato queda
 * Aprobado, Rechazado o Pendiente. Solo cuando TODOS los candidatos tienen una decisión se
 * habilita "Enviar decisión de long list a GTH", que persiste la decisión, notifica a GTH por
 * correo y avanza el requerimiento (a "Long list aprobada" si hay ≥1 aprobado, o de vuelta a
 * long list si rechazó a todos, para que GTH envíe una nueva).
 */
@Component({
  standalone: true,
  selector: 'app-gth-revision-long-list',
  imports: [CommonModule, AbrilModalPanel, StatusBadge, TitleCasePipe],
  templateUrl: './revision-long-list.html',
})
export class GthRevisionLongList implements OnInit {
  /** Id del requerimiento cuya long list se revisa. */
  @Input({ required: true }) requerimientoId!: number;
  /**
   * false = modo consulta: se ven los CVs pero no se decide. Es lo que ve quien pertenece al área
   * sin ser jefatura y entra por el enlace del correo; la decisión es de JEFE / GERENTE / GERENTE
   * GENERAL y el backend la rechaza igual (403).
   */
  @Input() puedeGestionar = true;
  @Output() closeModal = new EventEmitter<void>();
  /** Emite cuando la decisión se registró con éxito (para que el panel se recargue). */
  @Output() decided = new EventEmitter<void>();

  revision: RevisionLongList | null = null;

  /** Candidato seleccionado para la vista previa del CV (por defecto, el primero). */
  seleccionado: CandidatoRevision | null = null;

  /** Decisión local por candidato (candidatoId → true=aprobado / false=rechazado). Sin entrada = pendiente. */
  decisiones = new Map<number, boolean>();

  /** true mientras se envía la decisión (evita doble envío). */
  enviando = false;

  constructor(
    private service: SolicitudPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private el: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getRevisionLongList(this.requerimientoId).subscribe({
      next: (data) => {
        this.revision = data;
        this.seleccionado = data.candidatos[0] ?? null;
        // Prellenar decisiones si algún candidato ya viniera decidido (normalmente todos PENDIENTE).
        for (const c of data.candidatos) {
          if (c.estadoCodigo === 'APROBADO') this.decisiones.set(c.candidatoId, true);
          else if (c.estadoCodigo === 'RECHAZADO') this.decisiones.set(c.candidatoId, false);
        }
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
    if (!this.revision) return '';
    const puesto = this.revision.puesto ? new TitleCasePipe().transform(this.revision.puesto) : '';
    return puesto ? `${this.revision.codigo} · ${puesto}` : this.revision.codigo;
  }

  get total(): number {
    return this.revision?.candidatos.length ?? 0;
  }

  /** Candidatos ya revisados (con una decisión local, aprobado o rechazado). */
  get revisados(): number {
    return this.decisiones.size;
  }

  get aprobados(): number {
    return [...this.decisiones.values()].filter((v) => v).length;
  }

  get rechazados(): number {
    return [...this.decisiones.values()].filter((v) => !v).length;
  }

  /** true si todos los candidatos tienen una decisión (habilita el envío). */
  get todosDecididos(): boolean {
    return this.total > 0 && this.decisiones.size === this.total;
  }

  get puedeEnviar(): boolean {
    return this.todosDecididos && !this.enviando;
  }

  seleccionar(c: CandidatoRevision): void {
    this.seleccionado = c;
  }

  // ── Toggle Aprobar / Rechazar (checkbox por candidato) ──────────────────
  esAprobado(c: CandidatoRevision): boolean {
    return this.decisiones.get(c.candidatoId) === true;
  }

  esRechazado(c: CandidatoRevision): boolean {
    return this.decisiones.get(c.candidatoId) === false;
  }

  aprobar(c: CandidatoRevision): void {
    // Toggle: si ya estaba aprobado, vuelve a pendiente; si no, queda aprobado.
    if (this.esAprobado(c)) this.decisiones.delete(c.candidatoId);
    else this.decisiones.set(c.candidatoId, true);
    this.marcarModalModificado();
  }

  rechazar(c: CandidatoRevision): void {
    if (this.esRechazado(c)) this.decisiones.delete(c.candidatoId);
    else this.decisiones.set(c.candidatoId, false);
    this.marcarModalModificado();
  }

  /**
   * Avisa al modal contenedor (`preventCloseWhenDirty`) que ya hay decisiones tomadas, para que
   * un clic fuera no las descarte. Aprobar/Rechazar son botones y no disparan `input`/`change`,
   * así que se emite el mismo evento que usan search-select y compañía.
   */
  private marcarModalModificado(): void {
    this.el.nativeElement.dispatchEvent(new Event('modalfieldchange', { bubbles: true }));
  }

  /** Estado efectivo (con la decisión local aplicada) para el badge y el tile de estado. */
  estadoEfectivo(c: CandidatoRevision | null): { codigo: string; nombre: string } {
    if (!c) return { codigo: 'PENDIENTE', nombre: 'Pendiente' };
    const d = this.decisiones.get(c.candidatoId);
    if (d === true) return { codigo: 'APROBADO', nombre: 'Aprobado' };
    if (d === false) return { codigo: 'RECHAZADO', nombre: 'Rechazado' };
    return { codigo: 'PENDIENTE', nombre: 'Pendiente' };
  }

  /** Iniciales para el avatar del candidato (máx. 2 letras). */
  iniciales(nombre: string): string {
    const parts = (nombre || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0][0] ?? '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
    return (first + second).toUpperCase();
  }

  /** Colores del badge del estado de revisión del candidato. */
  estadoColors(codigo: string): { bg: string; text: string } {
    switch (codigo) {
      case 'APROBADO':  return { bg: '#DCFCE7', text: '#15803D' };
      case 'RECHAZADO': return { bg: '#FEE2E2', text: '#B91C1C' };
      case 'PENDIENTE':
      default:          return { bg: '#F3F4F6', text: '#4B5563' };
    }
  }

  // ── Envío de la decisión ─────────────────────────────────────────────────
  enviarDecision(): void {
    if (!this.revision || !this.puedeEnviar) return;

    const decisiones: CandidatoDecision[] = this.revision.candidatos.map((c) => ({
      candidatoId: c.candidatoId,
      aprobado: this.decisiones.get(c.candidatoId) === true,
    }));

    this.enviando = true;
    this.loaderService.show();
    this.service.enviarDecisionLongList(this.requerimientoId, decisiones).subscribe({
      next: (res) => {
        this.enviando = false;
        this.loaderService.hide();

        if (res.todosRechazados) {
          Swal.fire({
            icon: 'info',
            title: 'Decisión registrada',
            text:
              'Rechazaste a todos los candidatos. GTH preparará y enviará una nueva long list ' +
              'para tu revisión.',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#005D9D',
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Long list enviada',
            text:
              'La long list ha sido enviada a GTH. El estado cambió de Pendiente a Enviado y ' +
              'GTH continuará con la evaluación de los candidatos aprobados.',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#005D9D',
          });
        }

        this.decided.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
