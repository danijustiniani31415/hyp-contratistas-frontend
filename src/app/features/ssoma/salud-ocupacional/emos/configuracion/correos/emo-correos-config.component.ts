import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import {
  SectionTabs,
  SectionTab,
} from '../../../../../../shared/components/section-tabs/section-tabs';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { EmoConfiguracionService } from '../../../services/emo-configuracion.service';
import {
  EmoCorreoCeldaDto,
  EmoCorreoEventoDto,
  EmoCorreoFilaDto,
  EmoCorreoPerfilDto,
  EmoCorreoTipo,
} from '../../../dtos/emo-configuracion.model';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LoaderService } from '../../../../../../core/services/loader.service';

/**
 * Configuración de EMOs → destinatarios de los correos de EMO.
 *
 * Una sección (`app-section-tabs`) por cada uno de los 4 correos: programación
 * automática, programación manual, aceptada por la clínica y rechazada por la
 * clínica. Dentro de cada sección, una matriz destinatario × perfil del
 * trabajador (Oficina Central / Staff / Obra / Contratista) con un interruptor
 * por celda, porque a un trabajador de Oficina Central no le escribe la misma
 * gente que a uno de obra.
 *
 * Hay tres clases de destinatario:
 *  • Dinámicos (clínica, jefe, trabajador, residente, coordinadores, admin de la
 *    razón social, GTH): su correo se resuelve al enviar, solo se prenden/apagan.
 *  • Buzones de área (medicina ocupacional, ArqCom, Post Venta): el correo se
 *    edita acá; ya no vive en el appsettings del servidor.
 *  • Correos adicionales: alta/edición/baja completa desde la pantalla.
 */
@Component({
  selector: 'app-emo-correos-config',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SectionTabs, SearchSelect],
  templateUrl: './emo-correos-config.component.html',
  styleUrl: './emo-correos-config.component.css',
})
export class EmoCorreosConfigComponent implements OnInit {
  perfiles: EmoCorreoPerfilDto[] = [];
  eventos: EmoCorreoEventoDto[] = [];
  loading = false;

  /** Código del correo cuya sección se está viendo. */
  eventoActivoCodigo: string | null = null;

  /** id de la regla que se está guardando, para bloquear su switch. */
  savingReglaId: number | null = null;
  /** id del destinatario que se está editando/eliminando. */
  savingDestinatarioId: number | null = null;

  // ── Modal de alta/edición ──
  formOpen = false;
  /** null = alta de un correo adicional; distinto de null = edición. */
  formId: number | null = null;
  /** true = la fila es un buzón de área: se edita el correo pero no el tipo. */
  formEsBuzonArea = false;
  formEmail = '';
  formNombre = '';
  formTipo: EmoCorreoTipo = 'PRINCIPAL';
  /** Opciones de "Recibe como". Orden deliberado (Para antes que CC) → `sortAlpha` en false. */
  readonly tipoOptions: { id: EmoCorreoTipo; label: string }[] = [
    { id: 'PRINCIPAL', label: 'Destinatario (Para)' },
    { id: 'COPIA', label: 'Copia (CC)' },
  ];
  formError: string | null = null;
  saving = false;

  constructor(
    private svc: EmoConfiguracionService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getCorreos().subscribe({
      next: (res) => {
        this.perfiles = res.perfiles ?? [];
        this.eventos = res.eventos ?? [];
        if (!this.eventos.some((e) => e.codigo === this.eventoActivoCodigo))
          this.eventoActivoCodigo = this.eventos[0]?.codigo ?? null;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Secciones ──
  get sectionTabs(): SectionTab[] {
    return this.eventos.map((e) => ({
      id: e.codigo,
      label: e.nombre,
      badge: this.destinatariosActivos(e),
    }));
  }

  get eventoActivo(): EmoCorreoEventoDto | null {
    return this.eventos.find((e) => e.codigo === this.eventoActivoCodigo) ?? null;
  }

  onSectionChange(codigo: string): void {
    this.eventoActivoCodigo = codigo;
    this.cdr.detectChanges();
  }

  /** Cuántos destinatarios distintos reciben ese correo en al menos un perfil. */
  private destinatariosActivos(evento: EmoCorreoEventoDto): number {
    return evento.destinatarios.filter((f) => f.celdas.some((c) => c.active)).length;
  }

  /**
   * Celda de una fila para un perfil. Se busca por id en vez de confiar en el
   * orden del array para que un dato incompleto no termine prendiendo la columna
   * equivocada sin que se note.
   */
  celdaDe(fila: EmoCorreoFilaDto, perfil: EmoCorreoPerfilDto): EmoCorreoCeldaDto | null {
    return fila.celdas.find((c) => c.perfilId === perfil.id) ?? null;
  }

  /** Sin ningún destinatario activo, ese correo directamente no se envía. */
  get sinDestinatariosActivos(): boolean {
    const evento = this.eventoActivo;
    return !this.loading && !!evento && this.destinatariosActivos(evento) === 0;
  }

  /** Filas activas en algún perfil pero sin correo cargado: no le llegan a nadie. */
  get filasSinCorreo(): EmoCorreoFilaDto[] {
    const evento = this.eventoActivo;
    if (!evento) return [];
    return evento.destinatarios.filter((f) => f.sinCorreo && f.celdas.some((c) => c.active));
  }

  // ── Toggle de una celda ──
  toggle(celda: EmoCorreoCeldaDto): void {
    if (this.savingReglaId !== null) return;

    const nuevo = !celda.active;
    this.savingReglaId = celda.reglaId;
    // Optimista: se pinta al toque y se revierte si el guardado falla.
    celda.active = nuevo;

    this.svc.setReglaActive(celda.reglaId, nuevo).subscribe({
      next: () => {
        this.savingReglaId = null;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        celda.active = !nuevo;
        this.savingReglaId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Alta / edición ──
  abrirAlta(): void {
    this.formId = null;
    this.formEsBuzonArea = false;
    this.formEmail = '';
    this.formNombre = '';
    this.formTipo = 'PRINCIPAL';
    this.formError = null;
    this.formOpen = true;
    this.cdr.detectChanges();
  }

  abrirEdicion(fila: EmoCorreoFilaDto): void {
    if (!fila.editable) return;
    this.formId = fila.destinatarioId;
    this.formEsBuzonArea = fila.codigo !== null;
    this.formEmail = fila.email ?? '';
    this.formNombre = fila.nombre ?? '';
    this.formTipo = fila.tipo;
    this.formError = null;
    this.formOpen = true;
    this.cdr.detectChanges();
  }

  cerrarForm(): void {
    if (this.saving) return;
    this.formOpen = false;
    this.cdr.detectChanges();
  }

  get formTitulo(): string {
    if (this.formId === null) return 'Agregar correo adicional';
    return this.formEsBuzonArea ? 'Editar correo del área' : 'Editar correo adicional';
  }

  get formValido(): boolean {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.formEmail.trim());
  }

  guardarForm(): void {
    if (!this.formValido || this.saving) return;
    this.saving = true;
    this.formError = null;

    const email = this.formEmail.trim();
    const nombre = this.formNombre.trim() || null;

    const request$ =
      this.formId === null
        ? this.svc.crearAdicional({
            eventoCodigo: this.eventoActivoCodigo ?? '',
            email,
            nombre,
            tipo: this.formTipo,
          })
        : this.svc.actualizarDestinatario(this.formId, {
            email,
            nombre,
            tipo: this.formEsBuzonArea ? undefined : this.formTipo,
          });

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.formOpen = false;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        // 400/409 traen un mensaje útil (formato inválido, correo duplicado):
        // se muestra dentro del modal en vez de cerrarlo con un alert genérico.
        if (err.status === 400 || err.status === 409) {
          this.formError = err.error?.message ?? 'No se pudo guardar el destinatario.';
        } else {
          this.errorService.handleError(err);
        }
        this.cdr.detectChanges();
      },
    });
  }

  // ── Eliminar ──
  async eliminar(fila: EmoCorreoFilaDto): Promise<void> {
    if (!fila.eliminable || this.savingDestinatarioId !== null) return;

    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar destinatario?',
      text: `${fila.email} dejará de recibir los correos de EMO en los que esté activo.`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;

    this.savingDestinatarioId = fila.destinatarioId;
    this.svc.eliminarAdicional(fila.destinatarioId).subscribe({
      next: () => {
        this.savingDestinatarioId = null;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.savingDestinatarioId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  trackFila(_: number, f: EmoCorreoFilaDto): number {
    return f.destinatarioId;
  }

  trackPerfil(_: number, p: EmoCorreoPerfilDto): number {
    return p.id;
  }
}
