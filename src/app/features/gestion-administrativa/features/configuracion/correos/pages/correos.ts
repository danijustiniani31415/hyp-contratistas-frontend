import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { CorreosService } from '../services/correos.service';
import {
  CorreoAreaOption,
  CorreoEvento,
  CorreoRegla,
  CorreoReglaInput,
  CorreoTipoCodigo,
  CorreoWorkerOption,
} from '../dtos/ga-correo.dto';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SectionTabs, SectionTab } from '../../../../../../shared/components/section-tabs/section-tabs';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

/** Fila editable de un destinatario (inclusión o exclusión). */
interface FilaCorreo {
  tipoCodigo: CorreoTipoCodigo;
  workerId: number | null;
  areaScopeId: number | null;
  correo: string;
  incluirDescendientes: boolean;
  active: boolean;
}

/** Estado editable de un correo: sus dos listas de filas y sus dos interruptores. */
interface EstadoCorreo {
  incluir: FilaCorreo[];
  excluir: FilaCorreo[];
  /** Interruptor maestro: apagado = ese correo no se envía. */
  active: boolean;
  /** Interruptor del destinatario principal (el revisor en el correo al revisor). */
  destinatarioPrincipalActivo: boolean;
}

/**
 * Sección "Correos" de la Configuración de Gestión Administrativa.
 *
 * Por cada correo del flujo de salidas (Revisor, Confirmación, Aprobada, Rechazada)
 * define a quién SÍ se envía ("Se enviará a") y a quién NUNCA se envía ("Nunca se
 * enviará a"). La exclusión gana aunque el destinatario esté en la lista de envío.
 * Cada destinatario es un trabajador, un área (se expande a sus miembros) o un correo
 * escrito a mano (ej. un grupo de correos como gthnm@abril.pe).
 *
 * Los correos que la BD marca como apagables traen además dos interruptores: uno que
 * apaga el correo completo y otro que saca de la lista a su destinatario principal (el
 * que calcula el backend). Si al final no queda ningún destinatario, no se envía nada.
 */
@Component({
  selector: 'app-ga-correos',
  standalone: true,
  imports: [CommonModule, FormsModule, SectionTabs, SearchSelect],
  templateUrl: './correos.html',
  styles: [
    `
      :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

      /* Interruptor: mismo look que el de la configuración de correos de GTH. */
      .switch {
        position: relative;
        width: 44px;
        height: 24px;
        border-radius: 999px;
        border: none;
        background: #cbd5e1;
        cursor: pointer;
        padding: 0;
        transition: background 0.18s ease;
        flex-shrink: 0;
      }
      .switch--on { background: var(--color-abril-standard, #0f6e56); }
      .switch__knob {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        transition: transform 0.18s ease;
      }
      .switch--on .switch__knob { transform: translateX(20px); }
    `,
  ],
})
export class GaCorreos implements OnInit {
  eventos: CorreoEvento[] = [];
  trabajadores: CorreoWorkerOption[] = [];
  areas: CorreoAreaOption[] = [];

  /** Estado editable por código de correo. */
  estado: Record<string, EstadoCorreo> = {};
  activeCodigo: string | null = null;

  guardando = false;

  // Contrato del contenedor GaConfiguracion (esta sección no tiene filtros).
  filtrosActivos = 0;
  filtrosAbiertos = false;

  /**
   * Etiquetas cortas para las pestañas internas. Las pestañas salen de ga_correo_evento, así que
   * un correo nuevo aparece solo: sin entrada acá se muestra con su nombre completo.
   */
  private readonly labelCorto: Record<string, string> = {
    REVISOR: 'Revisor',
    CONFIRMACION: 'Confirmación',
    APROBADA: 'Aprobada',
    RECHAZADA: 'Rechazada',
    S10_REVISOR: 'S10 al revisor',
    REEMBOLSO_APROBADO: 'Reembolso OK',
    REEMBOLSO_RECHAZADO: 'Reembolso observado',
  };

  constructor(
    private service: CorreosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getInicial().subscribe({
      next: (data) => {
        this.eventos = data.eventos ?? [];
        this.trabajadores = (data.trabajadores ?? []).sort((a, b) =>
          (a.fullName ?? '').localeCompare(b.fullName ?? ''),
        );
        this.areas = this.conEtiquetas(data.areas ?? []).sort((a, b) =>
          (a.label ?? a.nombre).localeCompare(b.label ?? b.nombre),
        );

        this.estado = {};
        for (const ev of this.eventos) {
          this.estado[ev.codigo] = {
            incluir: (ev.incluir ?? []).map(this.reglaAFila),
            excluir: (ev.excluir ?? []).map(this.reglaAFila),
            active: ev.active !== false,
            destinatarioPrincipalActivo: ev.destinatarioPrincipalActivo !== false,
          };
        }
        this.activeCodigo = this.eventos[0]?.codigo ?? null;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Calcula la etiqueta de cada área para el desplegable. Si dos áreas comparten nombre
   * (ej. dos nodos "Gestión del Talento Humano"), desambigua con el nombre del padre; si no
   * hay padre, usa el correo de grupo del área.
   */
  private conEtiquetas(areas: CorreoAreaOption[]): CorreoAreaOption[] {
    const conteo = new Map<string, number>();
    for (const a of areas) conteo.set(a.nombre, (conteo.get(a.nombre) ?? 0) + 1);
    const porId = new Map(areas.map((a) => [a.areaScopeId, a] as const));

    return areas.map((a) => {
      let label = a.nombre;
      if ((conteo.get(a.nombre) ?? 0) > 1) {
        const padre = a.parentId != null ? porId.get(a.parentId) : undefined;
        if (padre) label = `${a.nombre} — ${padre.nombre}`;
        else if (a.email) label = `${a.nombre} — ${a.email}`;
      }
      return { ...a, label };
    });
  }

  private reglaAFila = (r: CorreoRegla): FilaCorreo => ({
    tipoCodigo: r.tipoCodigo,
    workerId: r.workerId ?? null,
    areaScopeId: r.areaScopeId ?? null,
    correo: r.correo ?? '',
    incluirDescendientes: r.incluirDescendientes,
    active: r.active,
  });

  // ── Pestañas internas ────────────────────────────────────────────────────

  get sectionTabs(): SectionTab[] {
    return this.eventos.map((e) => ({
      id: e.codigo,
      label: this.labelCorto[e.codigo] ?? e.nombre,
      // Solo se marcan los apagados: un badge en cada pestaña sería ruido.
      badge: this.estado[e.codigo]?.active === false ? 'Off' : null,
    }));
  }

  get activeEvento(): CorreoEvento | undefined {
    return this.eventos.find((e) => e.codigo === this.activeCodigo);
  }

  get activeEstado(): EstadoCorreo | undefined {
    return this.activeCodigo ? this.estado[this.activeCodigo] : undefined;
  }

  onTabChange(codigo: string): void {
    this.activeCodigo = codigo;
  }

  // ── Interruptores del correo ──────────────────────────────────────────────

  toggleEnvio(): void {
    const est = this.activeEstado;
    if (est && this.activeEvento?.permiteDesactivarEnvio) est.active = !est.active;
  }

  togglePrincipal(): void {
    const est = this.activeEstado;
    if (est && this.activeEvento?.permiteDesactivarPrincipal)
      est.destinatarioPrincipalActivo = !est.destinatarioPrincipalActivo;
  }

  /**
   * El correo está prendido pero no le llegaría a nadie: su destinatario principal está
   * apagado y no hay ningún destinatario activo en "Se enviará a". En ese caso no se envía.
   */
  get sinDestinatarios(): boolean {
    const ev = this.activeEvento;
    const est = this.activeEstado;
    if (!ev || !est || !est.active) return false;
    if (est.destinatarioPrincipalActivo) return false;
    return !est.incluir.some((f) => f.active);
  }

  // ── Edición de filas ───────────────────────────────────────────────────────

  agregar(lista: FilaCorreo[]): void {
    lista.push({
      tipoCodigo: 'TRABAJADOR',
      workerId: null,
      areaScopeId: null,
      correo: '',
      incluirDescendientes: true,
      active: true,
    });
  }

  quitar(lista: FilaCorreo[], i: number): void {
    lista.splice(i, 1);
  }

  /** Cambia el tipo de destinatario de una fila y limpia los campos que no aplican. */
  setTipo(fila: FilaCorreo, tipo: CorreoTipoCodigo): void {
    fila.tipoCodigo = tipo;
    fila.workerId = null;
    fila.areaScopeId = null;
    fila.correo = '';
    fila.incluirDescendientes = true;
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  guardar(): void {
    const codigo = this.activeCodigo;
    const est = this.activeEstado;
    const ev = this.activeEvento;
    if (!codigo || !est || !ev) return;

    const incompleta = (f: FilaCorreo): boolean => {
      if (f.tipoCodigo === 'TRABAJADOR') return f.workerId == null;
      if (f.tipoCodigo === 'AREA') return f.areaScopeId == null;
      return !f.correo.trim();
    };

    if (est.incluir.some(incompleta) || est.excluir.some(incompleta)) {
      Swal.fire({
        icon: 'warning',
        title: 'Filas incompletas',
        text: 'Completa el trabajador, área o correo de cada fila, o quita las filas vacías.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    const toInput = (f: FilaCorreo): CorreoReglaInput => ({
      tipoCodigo: f.tipoCodigo,
      workerId: f.tipoCodigo === 'TRABAJADOR' ? f.workerId : null,
      areaScopeId: f.tipoCodigo === 'AREA' ? f.areaScopeId : null,
      correo: f.tipoCodigo === 'CORREO' ? f.correo.trim() : null,
      incluirDescendientes: f.incluirDescendientes,
      active: f.active,
    });

    this.guardando = true;
    this.loaderService.show();
    this.service
      .updateReglas(codigo, {
        incluir: est.incluir.map(toInput),
        excluir: est.excluir.map(toInput),
        // Solo se mandan los interruptores que este correo permite cambiar.
        ...(ev.permiteDesactivarEnvio ? { active: est.active } : {}),
        ...(ev.permiteDesactivarPrincipal
          ? { destinatarioPrincipalActivo: est.destinatarioPrincipalActivo }
          : {}),
      })
      .subscribe({
        next: (res) => {
          this.guardando = false;
          // El evento guarda el estado que quedó en el servidor: si no se recarga la
          // pantalla, las pestañas y los interruptores tienen que reflejarlo igual.
          ev.active = est.active;
          ev.destinatarioPrincipalActivo = est.destinatarioPrincipalActivo;
          this.loaderService.hide();
          this.cdr.detectChanges();
          Swal.fire({
            icon: 'success',
            title: 'Guardado',
            text: res?.message ?? 'Destinatarios actualizados.',
            timer: 1800,
            showConfirmButton: false,
          });
        },
        error: (err: HttpErrorResponse) => {
          this.guardando = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
  }
}
