import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import {
  ContratistaUsuarioDto,
  ContratistaUsuarioService,
  InvitarUsuarioDto,
  ActualizarUsuarioDto,
  WorkerBusquedaDto,
} from '../../../../services/contratista-usuario.service';
import { HabEmpresaService } from '../../../../services/hab-empresa.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { jwtDecode } from 'jwt-decode';
import { ProyectoDisponibleDto } from '../../../../dtos/empresa.model';
import { Roles } from '../../../../../../core/constants/roles';

@Component({
  selector: 'app-contratista-usuarios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contratista-usuarios.html',
  styleUrl: './contratista-usuarios.css',
})
export class ContratistaUsuarios implements OnInit, OnChanges {
  @Input() contractorId!: number;
  @Input() currentUserId: number | null = null;
  @Input() forceAdminMode: boolean = false;

  private readonly CASEVIP_ID = 572;
  private readonly CLINICA_CONTRACTOR_ID = 644;

  usuarios: ContratistaUsuarioDto[] = [];
  proyectos: ProyectoDisponibleDto[] = [];
  loading = true;
  workerSeleccionado: WorkerBusquedaDto | null = null;
  tipoInvitacion: 'externo' | 'worker' = 'externo';

  get esOwner(): boolean {
    if (this.forceAdminMode) return true;
    if (this.currentUserId == null) return false;
    const uid = this.currentUserId;
    return this.usuarios.some((u) => u.userId === uid && u.rolNombre === 'OWNER');
  }

  constructor(
    private usuarioService: ContratistaUsuarioService,
    private habEmpresaService: HabEmpresaService,
    private errorService: ErrorService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.contractorId) {
      this.contractorId = this.authService.getEmpresaId() ?? 0;
    }
    if (this.currentUserId == null) {
      try {
        const user = JSON.parse(localStorage.getItem('user') ?? '{}');
        if (user?.userId != null) {
          this.currentUserId = parseInt(String(user.userId), 10);
        }
      } catch { }
    }
    if (this.currentUserId == null) {
      const token = this.authService.getToken();
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          const candidates = [
            decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
            decoded.userId,
            decoded.nameid,
            decoded.sub,
          ];
          for (const c of candidates) {
            if (c != null) {
              const parsed = parseInt(String(c), 10);
              if (!isNaN(parsed)) {
                this.currentUserId = parsed;
                break;
              }
            }
          }
        } catch { }
      }
    }
    this.loadUsuarios();
    this.loadProyectos();
  }

  /**
   * En la pantalla de admin (`admin-contratista-usuarios`) el componente se
   * mantiene vivo al cambiar de empresa en el desplegable: el `*ngIf` del padre
   * solo compara contra null, así que Angular no lo vuelve a crear y `ngOnInit`
   * no se repite. Sin esto el panel se quedaba mostrando los usuarios de la
   * PRIMERA empresa seleccionada aunque se eligiera otra.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const cambio = changes['contractorId'];
    if (!cambio || cambio.firstChange) return;
    if (cambio.previousValue === cambio.currentValue) return;
    if (!this.contractorId) return;

    this.usuarios = [];
    this.proyectos = [];
    this.loadUsuarios();
    this.loadProyectos();
  }

  loadUsuarios(): void {
    this.loading = true;
    this.usuarioService.getUsuarios(this.contractorId).subscribe({
      next: (res) => {
        this.usuarios = res ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  private loadProyectos(): void {
    this.habEmpresaService.getProyectosDisponibles(this.contractorId).subscribe({
      next: (res) => {
        this.proyectos = (res ?? []).filter((p) => p.estaActiva);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  async abrirModalInvitar(): Promise<void> {
    let tipoElegido: 'externo' | 'worker' | null = null;

    await Swal.fire({
      title: 'Tipo de usuario',
      html: `
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">
          <button id="btn-externo" style="padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;cursor:pointer;text-align:left;background:#fff;">
            <strong style="color:#0f172a;">Usuario externo</strong>
            <p style="margin:4px 0 0;font-size:0.82rem;color:#64748b;">Persona de oficina o supervisor remoto. Ingresa su email.</p>
          </button>
          <button id="btn-worker" style="padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;cursor:pointer;text-align:left;background:#fff;">
            <strong style="color:#0f172a;">Trabajador en obra</strong>
            <p style="margin:4px 0 0;font-size:0.82rem;color:#64748b;">Está registrado en la empresa. Búscalo por DNI o apellido.</p>
          </button>
        </div>`,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        document.getElementById('btn-externo')?.addEventListener('click', () => {
          tipoElegido = 'externo';
          Swal.close();
        });
        document.getElementById('btn-worker')?.addEventListener('click', () => {
          tipoElegido = 'worker';
          Swal.close();
        });
      },
    });

    if (tipoElegido === null) return;

    if (tipoElegido === 'externo') {
      const proyectosHtml = this.buildProyectosHtml([]);
      Swal.fire({
        title: 'Invitar usuario',
        html: this.buildFormHtml({
          email: true,
          rolNombre: '',
          scope: 'TODOS',
          proyectosHtml,
          showTipoAcceso: this.contractorId === this.CASEVIP_ID || this.contractorId === this.CLINICA_CONTRACTOR_ID,
          isClinica: this.contractorId === this.CLINICA_CONTRACTOR_ID,
        }),
        showCancelButton: true,
        confirmButtonText: 'Invitar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#64bc04',
        focusConfirm: false,
        width: '420px',
        didOpen: () => this.hookScopeToggle(),
        preConfirm: () => this.preConfirmInvitar(),
      }).then((result) => {
        if (!result.isConfirmed || !result.value) return;
        this.usuarioService
          .invitar(this.contractorId, result.value as InvitarUsuarioDto)
          .subscribe({
            next: () => {
              Swal.fire({ icon: 'success', title: 'Invitación enviada', timer: 1800, showConfirmButton: false });
              this.loadUsuarios();
            },
            error: (err: HttpErrorResponse) => this.errorService.handleError(err),
          });
      });
    } else {
      await this.abrirModalWorker();
    }
  }

  private async abrirModalWorker(): Promise<void> {
    const { value } = await Swal.fire({
      title: 'Buscar trabajador',
      html: `
        <input id="swal-search" type="text" placeholder="DNI o apellido..."
          style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:0.88rem;box-sizing:border-box;">
        <div id="swal-results" style="margin-top:10px;max-height:200px;overflow-y:auto;"></div>
        <div id="swal-worker-seleccionado" style="display:none;margin-top:10px;padding:8px;background:#f0fdf4;border-radius:8px;font-size:0.85rem;color:#166534;"></div>
        <div id="swal-email-worker" style="display:none;margin-top:10px;">
          <label style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">Email *</label>
          <input id="swal-email" type="email" placeholder="email@empresa.com"
            style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:0.88rem;box-sizing:border-box;margin-top:4px;">
        </div>
        <div id="swal-modulos-worker" style="display:none;margin-top:10px;">
          <label style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">Módulos</label>
          <select id="swal-modulos" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:0.88rem;margin-top:4px;">
            <option value="AMBOS">Gestión de Ingresos + SSOMA</option>
            <option value="INGRESOS">Solo Gestión de Ingresos</option>
            <option value="SSOMA">Solo Gestión SSOMA</option>
          </select>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Invitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      width: '440px',
      didOpen: () => {
        const searchEl = document.getElementById('swal-search') as HTMLInputElement;
        const resultsEl = document.getElementById('swal-results')!;

        searchEl.addEventListener('input', async () => {
          const q = searchEl.value.trim();
          if (q.length < 2) { resultsEl.innerHTML = ''; return; }
          const workers = await this.usuarioService
            .buscarWorkers(this.contractorId, q)
            .toPromise();
          resultsEl.innerHTML = (workers ?? []).map((w) => `
            <div data-id="${w.id}" data-nombre="${w.nombreCompleto ?? ''}" data-email="${w.emailCorporativo ?? ''}"
              style="padding:8px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:4px;cursor:pointer;font-size:0.83rem;">
              <strong>${w.nombreCompleto ?? '—'}</strong> · ${w.dni ?? ''}
              ${w.emailCorporativo ? `<span style="color:#64748b"> · ${w.emailCorporativo}</span>` : '<span style="color:#f59e0b"> · Sin email</span>'}
            </div>`).join('');

          resultsEl.querySelectorAll('[data-id]').forEach((el) => {
            el.addEventListener('click', () => {
              const elem = el as HTMLElement;
              const w = { id: parseInt(elem.dataset['id']!), nombre: elem.dataset['nombre'], email: elem.dataset['email'] };
              (window as any)._workerSeleccionado = w;
              document.getElementById('swal-worker-seleccionado')!.style.display = 'block';
              document.getElementById('swal-worker-seleccionado')!.textContent = `✓ ${w.nombre}`;
              document.getElementById('swal-email-worker')!.style.display = w.email ? 'none' : 'block';
              document.getElementById('swal-modulos-worker')!.style.display = 'block';
              resultsEl.innerHTML = '';
              searchEl.value = '';
            });
          });
        });
      },
      preConfirm: () => {
        const w = (window as any)._workerSeleccionado;
        if (!w) { Swal.showValidationMessage('Selecciona un trabajador'); return false; }
        const emailEl = document.getElementById('swal-email') as HTMLInputElement | null;
        const email = w.email || emailEl?.value?.trim();
        if (!email) { Swal.showValidationMessage('Ingresa un email para este trabajador'); return false; }
        const modulos = (document.getElementById('swal-modulos') as HTMLSelectElement)?.value ?? 'AMBOS';
        return { workerId: w.id, email, modulos };
      },
    });

    if (!value) return;

    (window as any)._workerSeleccionado = null;
    this.usuarioService.invitar(this.contractorId, {
      email: value.email,
      rolNombre: 'GESTOR',
      scope: 'TODOS',
      systemRoleId: parseInt(Roles.CONTRATISTA_SUPERVISOR_CAMPO, 10),
      modulos: value.modulos,
      workerId: value.workerId,
      esWorker: true,
    }).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Trabajador invitado', timer: 1800, showConfirmButton: false });
        this.loadUsuarios();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  abrirModalEditar(u: ContratistaUsuarioDto): void {
    const proyectosHtml = this.buildProyectosHtml(u.proyectoIds ?? []);
    Swal.fire({
      title: u.nombreCompleto || u.email,
      html: this.buildFormHtml({
        email: true,
        emailValue: u.email,
        rolNombre: u.rolNombre,
        scope: u.scope,
        proyectosHtml,
        initialScope: u.scope,
        modulos: u.modulos,
      }),
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      focusConfirm: false,
      width: '420px',
      didOpen: () => this.hookScopeToggle(),
      preConfirm: () => this.preConfirmEditar(),
    }).then((result) => {
      if (!result.isConfirmed || !result.value) return;
      this.usuarioService
        .actualizar(u.id, this.contractorId, result.value as ActualizarUsuarioDto)
        .subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
            this.loadUsuarios();
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
    });
  }

  toggleActivar(u: ContratistaUsuarioDto): void {
    // Un usuario con scope "Por proyecto" no se puede activar si no tiene ningún
    // proyecto asignado a nivel de login: el backend lo rechaza con el mensaje
    // "Debe seleccionar al menos un proyecto", que no le dice al usuario qué hacer.
    // Detectamos el caso aquí y lo guiamos a usar "Editar" (columna Acciones) para
    // asignarle al menos un proyecto antes de poder activarlo.
    if (!u.activo && u.scope === 'POR_PROYECTO' && (u.proyectoIds?.length ?? 0) === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Primero asígnale un proyecto',
        html:
          `Este usuario tiene acceso <strong>“Por proyecto”</strong> pero todavía no tiene ` +
          `ningún proyecto asignado, por eso no se puede activar.<br><br>` +
          `Presiona el botón <strong>“Editar”</strong> de la columna <strong>Acciones</strong> ` +
          `(en la fila de este usuario), asígnale al menos un proyecto y guarda. ` +
          `Luego podrás activarlo.`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#64bc04',
      });
      return;
    }

    const accion = u.activo ? 'desactivar' : 'activar';
    Swal.fire({
      icon: 'question',
      title: `¿${u.activo ? 'Desactivar' : 'Activar'} usuario?`,
      text: `${u.nombreCompleto || u.email} será ${u.activo ? 'desactivado' : 'reactivado'}.`,
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: u.activo ? '#ef4444' : '#64bc04',
    }).then((result) => {
      if (!result.isConfirmed) return;
      if (u.activo) {
        this.usuarioService.desactivar(u.id, this.contractorId).subscribe({
          next: () => this.loadUsuarios(),
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      } else {
        this.usuarioService.actualizar(u.id, this.contractorId, { activo: true }).subscribe({
          next: () => this.loadUsuarios(),
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      }
    });
  }

  // ── Swal helpers ──────────────────────────────────────────────

  private buildProyectosHtml(selectedIds: number[]): string {
    if (!this.proyectos.length) {
      return '<p style="color:#94a3b8;font-size:0.82rem;margin:0;">Sin proyectos activos</p>';
    }
    return this.proyectos
      .map(
        (p) =>
          `<label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:0.83rem;cursor:pointer;">
            <input type="checkbox" value="${p.id}" class="swal-proy-cb"
              ${selectedIds.includes(p.id) ? 'checked' : ''}
              style="accent-color:#64bc04;width:15px;height:15px;flex-shrink:0;">
            <span style="color:#374151;">${p.nombre}</span>
          </label>`,
      )
      .join('');
  }

  private buildFormHtml(opts: {
    email: boolean;
    emailValue?: string;
    rolNombre: string;
    scope: string;
    proyectosHtml: string;
    initialScope?: string;
    showTipoAcceso?: boolean;
    isClinica?: boolean;
    modulos?: string;
  }): string {
    const emailField = opts.email
      ? `<div style="margin-bottom:14px;">
          <label style="${this.labelCss}">Email *</label>
          <input id="swal-email" type="email" placeholder="usuario@empresa.com"
            value="${opts.emailValue ?? ''}"
            style="${this.inputCss}">
        </div>`
      : '';

    const roles = (this.contractorId === this.CASEVIP_ID || this.contractorId === this.CLINICA_CONTRACTOR_ID)
      ? ['ADMIN', 'GESTOR']
      : ['ADMIN'];
    const rolOpts = roles
      .map((r) => `<option value="${r}" ${opts.rolNombre === r ? 'selected' : ''}>${r}</option>`)
      .join('');

    const scopeOpts = [
      { v: 'TODOS', l: 'Todos los proyectos' },
      { v: 'POR_PROYECTO', l: 'Por proyecto' },
    ]
      .map(
        (s) =>
          `<option value="${s.v}" ${opts.scope === s.v ? 'selected' : ''}>${s.l}</option>`,
      )
      .join('');

    const showProyectos = (opts.initialScope ?? opts.scope) === 'POR_PROYECTO';

    const tipoAccesoField = opts.showTipoAcceso
      ? `<div style="margin-bottom:14px;">
          <label style="${this.labelCss}">Tipo de acceso *</label>
          <select id="swal-system-role" style="${this.inputCss}">
            ${opts.isClinica
              ? '<option value="14">Clínica</option>'
              : '<option value="11">Acceso completo</option><option value="49">Solo control de acceso</option>'
            }
          </select>
        </div>`
      : '';

    return `
      <div style="text-align:left;">
        ${emailField}
        <div style="margin-bottom:14px;">
          <label style="${this.labelCss}">Rol *</label>
          <select id="swal-rol" style="${this.inputCss}">${rolOpts}</select>
        </div>
        <div style="margin-bottom:14px;">
          <label style="${this.labelCss}">Scope *</label>
          <select id="swal-scope" style="${this.inputCss}">${scopeOpts}</select>
        </div>
        <div id="swal-proyectos-section" style="display:${showProyectos ? 'block' : 'none'};">
          <label style="${this.labelCss}">Proyectos asignados</label>
          <div style="max-height:150px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;">
            ${opts.proyectosHtml}
          </div>
        </div>
        ${tipoAccesoField}
        <div style="margin-bottom:14px;">
          <label style="${this.labelCss}">Módulos</label>
          <select id="swal-modulos" style="${this.inputCss}">
            <option value="AMBOS" ${(opts.modulos ?? 'AMBOS') === 'AMBOS' ? 'selected' : ''}>Gestión de Ingresos + SSOMA</option>
            <option value="INGRESOS" ${opts.modulos === 'INGRESOS' ? 'selected' : ''}>Solo Gestión de Ingresos</option>
            <option value="SSOMA" ${opts.modulos === 'SSOMA' ? 'selected' : ''}>Solo Gestión SSOMA</option>
          </select>
        </div>
      </div>`;
  }

  private readonly labelCss =
    'font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:5px;';
  private readonly inputCss =
    'width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:0.88rem;background:#fff;box-sizing:border-box;outline:none;';

  private hookScopeToggle(): void {
    const scopeEl = document.getElementById('swal-scope') as HTMLSelectElement | null;
    const section = document.getElementById('swal-proyectos-section') as HTMLDivElement | null;
    if (!scopeEl || !section) return;
    scopeEl.addEventListener('change', () => {
      section.style.display = scopeEl.value === 'POR_PROYECTO' ? 'block' : 'none';
    });
  }

  private getSelectedProyectoIds(): number[] {
    return Array.from(
      document.querySelectorAll<HTMLInputElement>('.swal-proy-cb:checked'),
    ).map((cb) => parseInt(cb.value, 10));
  }

  private preConfirmInvitar(): InvitarUsuarioDto | false {
    const email = (document.getElementById('swal-email') as HTMLInputElement | null)?.value.trim() ?? '';
    const rolNombre = (document.getElementById('swal-rol') as HTMLSelectElement).value;
    const scope = (document.getElementById('swal-scope') as HTMLSelectElement).value;
    if (!email) {
      Swal.showValidationMessage('El email es requerido');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Swal.showValidationMessage('Ingresa un email válido');
      return false;
    }
    const proyectoIds = scope === 'POR_PROYECTO' ? this.getSelectedProyectoIds() : undefined;
    const systemRoleEl = document.getElementById('swal-system-role') as HTMLSelectElement | null;
    const systemRoleId = systemRoleEl ? parseInt(systemRoleEl.value, 10) : 11;
    const modulos = (document.getElementById('swal-modulos') as HTMLSelectElement).value;
    return { email, rolNombre, scope, proyectoIds, systemRoleId, modulos };
  }

  private preConfirmEditar(): ActualizarUsuarioDto | false {
    const email = (document.getElementById('swal-email') as HTMLInputElement | null)?.value.trim() ?? '';
    if (!email) {
      Swal.showValidationMessage('El email es requerido');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Swal.showValidationMessage('Ingresa un email válido');
      return false;
    }
    const rolNombre = (document.getElementById('swal-rol') as HTMLSelectElement).value;
    const scope = (document.getElementById('swal-scope') as HTMLSelectElement).value;
    const proyectoIds = scope === 'POR_PROYECTO' ? this.getSelectedProyectoIds() : [];
    const modulos = (document.getElementById('swal-modulos') as HTMLSelectElement).value;
    return { email, rolNombre, scope, proyectoIds, modulos };
  }
}
