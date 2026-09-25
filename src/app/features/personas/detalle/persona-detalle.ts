import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { BaseModal } from '../../../shared/components/base-modal/base-modal';
import { CatalogoValorModal } from '../../../shared/components/catalogo-valor-modal/catalogo-valor-modal';
import { LbPageHeader } from '../../../shared/components/lb-page-header/lb-page-header';
import { CatalogoValorService, CatalogoValor } from '../../../core/services/catalogo-valor.service';
import {
  PersonasService,
  PersonaDetalle,
  PersonaUpdate,
  CatalogosPersonas,
  AlmacenCatalogoItem,
  NuevaAsignacion,
  PersonaPlanilla,
} from '../../../core/services/personas.service';
import { LbAuthService } from '../../../core/services/lb-auth.service';

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-persona-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchSelect, BaseModal, CatalogoValorModal, LbPageHeader],
  templateUrl: './persona-detalle.html',
  styleUrl: './persona-detalle.css',
})
export class PersonaDetalleComponent implements OnInit {
  persona = signal<PersonaDetalle | null>(null);
  catalogos = signal<CatalogosPersonas | null>(null);
  loading = signal(false);

  showInvitarModal = signal(false);
  invitarEmail = '';
  invitarError = signal('');
  invitando = signal(false);
  reenviando = signal(false);

  showCambiarEmailModal = signal(false);
  nuevoEmail = '';
  cambiarEmailError = signal('');
  cambiandoEmail = signal(false);

  showAsignarModal = signal(false);
  asignarForm: NuevaAsignacion = { rolId: 0, proyectoId: null, almacenId: null, notificar: true };
  asignarError = signal('');
  asignando = signal(false);

  showDatosModal = signal(false);
  datosForm: PersonaUpdate = this.datosVacio();
  datosError = signal('');
  guardandoDatos = signal(false);

  showPlanillaModal = signal(false);
  planillaForm: PersonaPlanilla = this.planillaVacia();
  planillaError = signal('');
  guardandoPlanilla = signal(false);

  bancos = signal<CatalogoValor[]>([]);
  tiposAfpOnp = signal<CatalogoValor[]>([]);
  categoriasLaborales = signal<CatalogoValor[]>([]);
  catalogoAbierto = signal<'' | 'BANCO' | 'TIPO_AFP_ONP' | 'CATEGORIA_LABORAL'>('');

  private personaId!: number;

  constructor(
    private route: ActivatedRoute,
    private catalogoValorService: CatalogoValorService,
    private router: Router,
    private service: PersonasService,
    public authService: LbAuthService,
  ) {}

  ngOnInit(): void {
    this.personaId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
    this.service.getCatalogos().subscribe((c) => this.catalogos.set(c));
    this.cargarCatalogosValor();
  }

  cargar(): void {
    this.loading.set(true);
    this.service.getById(this.personaId).subscribe({
      next: (p) => {
        this.persona.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Dar acceso al sistema ──────────────────────────────────────────
  abrirInvitar(): void {
    const p = this.persona();
    this.invitarEmail = p?.emailLogin ?? p?.emailPersonal ?? '';
    this.invitarError.set('');
    this.showInvitarModal.set(true);
  }

  cerrarInvitar(): void {
    this.showInvitarModal.set(false);
  }

  enviarInvitacion(): void {
    if (!this.invitarEmail) return;
    this.invitando.set(true);
    this.invitarError.set('');
    this.service.crearUsuario(this.personaId, this.invitarEmail).subscribe({
      next: (p) => {
        this.persona.set(p);
        this.invitando.set(false);
        this.showInvitarModal.set(false);
        Swal.fire({
          icon: 'success',
          title: 'Invitación enviada',
          text: `Se envió un correo a ${this.invitarEmail} para que active su cuenta.`,
        });
      },
      error: (err) => {
        this.invitando.set(false);
        this.invitarError.set(err?.error?.message ?? 'No se pudo enviar la invitación.');
      },
    });
  }

  reenviarCredenciales(): void {
    this.reenviando.set(true);
    this.service.reenviarCredenciales(this.personaId).subscribe({
      next: (p) => {
        this.persona.set(p);
        this.reenviando.set(false);
        Swal.fire({
          icon: 'success',
          title: 'Credenciales reenviadas',
          text: `Se envió un correo a ${p.emailLogin} con un enlace para (re)crear su contraseña.`,
        });
      },
      error: (err) => {
        this.reenviando.set(false);
        Swal.fire({
          icon: 'error',
          title: 'No se pudo reenviar',
          text: err?.error?.message ?? 'Ocurrió un error al reenviar las credenciales.',
        });
      },
    });
  }

  // ── Cambiar correo de un usuario ya activo ──────────────────────────
  abrirCambiarEmail(): void {
    this.nuevoEmail = this.persona()?.emailLogin ?? '';
    this.cambiarEmailError.set('');
    this.showCambiarEmailModal.set(true);
  }

  cerrarCambiarEmail(): void {
    this.showCambiarEmailModal.set(false);
  }

  guardarCambiarEmail(): void {
    if (!this.nuevoEmail) return;
    this.cambiandoEmail.set(true);
    this.cambiarEmailError.set('');
    this.service.cambiarEmail(this.personaId, this.nuevoEmail).subscribe({
      next: (p) => {
        this.persona.set(p);
        this.cambiandoEmail.set(false);
        this.showCambiarEmailModal.set(false);
        Swal.fire({
          icon: 'success',
          title: 'Correo actualizado',
          text: `Se avisó al correo anterior del cambio. Ahora inicia sesión con ${this.nuevoEmail}.`,
        });
      },
      error: (err) => {
        this.cambiandoEmail.set(false);
        this.cambiarEmailError.set(err?.error?.message ?? 'No se pudo cambiar el correo.');
      },
    });
  }

  // ── Asignar rol ─────────────────────────────────────────────────────
  // El scope (global vs. un solo proyecto) lo decide quien otorga el acceso, no el rol — el
  // mismo rol puede ser global para una persona y de un solo proyecto para otra (ej. "Logística"
  // en Lima vs. "Logística" en Las Bravas). El selector de Proyecto siempre se muestra, opcional.
  get almacenesDelProyecto(): AlmacenCatalogoItem[] {
    const almacenes = this.catalogos()?.almacenes ?? [];
    if (!this.asignarForm.proyectoId) return almacenes.filter((a) => a.proyectoId === null);
    return almacenes.filter((a) => a.proyectoId === this.asignarForm.proyectoId || a.proyectoId === null);
  }

  abrirAsignar(): void {
    this.asignarForm = { rolId: 0, proyectoId: null, almacenId: null, notificar: true };
    this.asignarError.set('');
    this.showAsignarModal.set(true);
  }

  cerrarAsignar(): void {
    this.showAsignarModal.set(false);
  }

  guardarAsignacion(): void {
    if (!this.asignarForm.rolId) return;
    this.asignando.set(true);
    this.asignarError.set('');
    this.service.nuevaAsignacion(this.personaId, this.asignarForm).subscribe({
      next: (p) => {
        this.persona.set(p);
        this.asignando.set(false);
        this.showAsignarModal.set(false);
      },
      error: (err) => {
        this.asignando.set(false);
        this.asignarError.set(err?.error?.message ?? 'No se pudo asignar el rol.');
      },
    });
  }

  revocar(asignacionId: number): void {
    Swal.fire({
      icon: 'question',
      title: '¿Revocar este acceso?',
      text: 'La persona dejará de tener este rol de inmediato.',
      showCancelButton: true,
      confirmButtonText: 'Revocar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.service.revocarAsignacion(this.personaId, asignacionId).subscribe({
        next: (p) => this.persona.set(p),
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo revocar.' });
        },
      });
    });
  }

  toggleNotificar(asignacionId: number, notificar: boolean): void {
    this.service.toggleNotificarAsignacion(this.personaId, asignacionId, notificar).subscribe({
      next: (p) => this.persona.set(p),
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo actualizar.' });
      },
    });
  }

  volver(): void {
    this.router.navigate(['/personas']);
  }

  private cargarCatalogosValor(): void {
    this.catalogoValorService.list('BANCO').subscribe((v) => this.bancos.set(v.filter((x) => x.activo)));
    this.catalogoValorService.list('TIPO_AFP_ONP').subscribe((v) => this.tiposAfpOnp.set(v.filter((x) => x.activo)));
    this.catalogoValorService.list('CATEGORIA_LABORAL').subscribe((v) => this.categoriasLaborales.set(v.filter((x) => x.activo)));
  }

  abrirCatalogo(tipo: 'BANCO' | 'TIPO_AFP_ONP' | 'CATEGORIA_LABORAL'): void {
    this.catalogoAbierto.set(tipo);
  }

  cerrarCatalogo(): void {
    this.catalogoAbierto.set('');
    this.cargarCatalogosValor();
  }

  // ── Datos básicos (nombres, documento, contacto) ─────────────────────
  private datosVacio(): PersonaUpdate {
    return { nombres: '', apellidos: '', tipoDocumento: 'DNI', numeroDocumento: '', telefono: '', emailPersonal: '' };
  }

  abrirDatos(): void {
    const p = this.persona();
    if (!p) return;
    this.datosForm = {
      nombres: p.nombres,
      apellidos: p.apellidos,
      tipoDocumento: p.tipoDocumento,
      numeroDocumento: p.numeroDocumento,
      telefono: p.telefono ?? '',
      emailPersonal: p.emailPersonal ?? '',
    };
    this.datosError.set('');
    this.showDatosModal.set(true);
  }

  cerrarDatos(): void {
    this.showDatosModal.set(false);
  }

  guardarDatos(): void {
    this.guardandoDatos.set(true);
    this.datosError.set('');
    this.service.actualizarDatos(this.personaId, this.datosForm).subscribe({
      next: (p) => {
        this.persona.set(p);
        this.guardandoDatos.set(false);
        this.showDatosModal.set(false);
      },
      error: (err) => {
        this.guardandoDatos.set(false);
        this.datosError.set(err?.error?.message ?? 'No se pudieron guardar los datos.');
      },
    });
  }

  // ── Datos de planilla (Fase 1 del motor de Planillas) ────────────────
  private planillaVacia(): PersonaPlanilla {
    return {
      banco: '',
      numeroCuenta: '',
      cusp: '',
      tipoAfpOnp: '',
      categoriaLaboral: '',
      sueldoBase: null,
      jornal: null,
      asignacionFamiliar: false,
      sctr: false,
    };
  }

  abrirPlanilla(): void {
    const actual = this.persona()?.planilla;
    this.planillaForm = actual ? { ...actual } : this.planillaVacia();
    this.planillaError.set('');
    this.showPlanillaModal.set(true);
  }

  cerrarPlanilla(): void {
    this.showPlanillaModal.set(false);
  }

  guardarPlanilla(): void {
    this.guardandoPlanilla.set(true);
    this.planillaError.set('');
    this.service.actualizarPlanilla(this.personaId, this.planillaForm).subscribe({
      next: (p) => {
        this.persona.set(p);
        this.guardandoPlanilla.set(false);
        this.showPlanillaModal.set(false);
      },
      error: (err) => {
        this.guardandoPlanilla.set(false);
        this.planillaError.set(err?.error?.message ?? 'No se pudo guardar la planilla.');
      },
    });
  }
}
