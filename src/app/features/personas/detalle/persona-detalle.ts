import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { BaseModal } from '../../../shared/components/base-modal/base-modal';
import {
  PersonasService,
  PersonaDetalle,
  CatalogosPersonas,
  AlmacenCatalogoItem,
  NuevaAsignacion,
} from '../../../core/services/personas.service';

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-persona-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchSelect, BaseModal],
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

  showAsignarModal = signal(false);
  asignarForm: NuevaAsignacion = { rolId: 0, proyectoId: null, almacenId: null };
  asignarError = signal('');
  asignando = signal(false);

  private personaId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: PersonasService,
  ) {}

  ngOnInit(): void {
    this.personaId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
    this.service.getCatalogos().subscribe((c) => this.catalogos.set(c));
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
    this.invitarEmail = this.persona()?.emailPersonal ?? '';
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

  // ── Asignar rol ─────────────────────────────────────────────────────
  get rolSeleccionadoEsGlobal(): boolean {
    const rol = this.catalogos()?.roles.find((r) => r.id === this.asignarForm.rolId);
    return rol?.esGlobal ?? true;
  }

  get almacenesDelProyecto(): AlmacenCatalogoItem[] {
    const almacenes = this.catalogos()?.almacenes ?? [];
    if (!this.asignarForm.proyectoId) return almacenes.filter((a) => a.proyectoId === null);
    return almacenes.filter((a) => a.proyectoId === this.asignarForm.proyectoId || a.proyectoId === null);
  }

  abrirAsignar(): void {
    this.asignarForm = { rolId: 0, proyectoId: null, almacenId: null };
    this.asignarError.set('');
    this.showAsignarModal.set(true);
  }

  cerrarAsignar(): void {
    this.showAsignarModal.set(false);
  }

  guardarAsignacion(): void {
    if (!this.asignarForm.rolId) return;
    if (!this.rolSeleccionadoEsGlobal && !this.asignarForm.proyectoId) {
      this.asignarError.set('Este rol requiere un proyecto.');
      return;
    }
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

  volver(): void {
    this.router.navigate(['/personas']);
  }
}
