import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import { AccesoAsignacion, AccesoRol, AccesosService, AccesoUsuario } from '../../core/services/accesos.service';
import { CatalogoItem, PersonaListItem, PersonasService } from '../../core/services/personas.service';

/**
 * Accesos: quién entra al sistema y a qué. Una sola pantalla para dar un rol a una persona (con su alcance: toda la empresa o un
 * solo proyecto) y para quitarlo. Los cambios aplican la próxima vez que la persona inicie sesión.
 */
@Component({
  selector: 'app-accesos',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, LbPageHeader],
  templateUrl: './accesos.html',
  styleUrl: './accesos.css',
})
export class Accesos implements OnInit {
  usuarios = signal<AccesoUsuario[]>([]);
  roles = signal<AccesoRol[]>([]);
  proyectos = signal<CatalogoItem[]>([]);
  personas = signal<PersonaListItem[]>([]);
  loading = signal(false);
  search = signal('');

  filtrados = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.usuarios();
    return this.usuarios().filter(
      (u) => u.nombre.toLowerCase().includes(q) || u.emailLogin.toLowerCase().includes(q) || u.documento.includes(q)
        || u.asignaciones.some((a) => a.rolNombre.toLowerCase().includes(q) || (a.proyectoNombre ?? '').toLowerCase().includes(q)),
    );
  });

  // ── Modal «Dar acceso» ──
  showModal = signal(false);
  guardando = signal(false);
  error = signal('');
  personaId: number | null = null;
  personaBusqueda = '';
  email = '';
  rolId: number | null = null;
  alcance: 'TODA' | 'PROYECTO' = 'TODA';
  proyectoId: number | null = null;

  constructor(private service: AccesosService, private personasService: PersonasService) {}

  ngOnInit(): void {
    this.cargar();
    this.personasService.getCatalogos().subscribe((c) => this.proyectos.set(c.proyectos));
    this.personasService.list('', 1, 500).subscribe((r) => this.personas.set(r.data));
  }

  cargar(): void {
    this.loading.set(true);
    this.service.get().subscribe({
      next: (r) => {
        this.usuarios.set(r.usuarios);
        this.roles.set(r.roles);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  chip(a: AccesoAsignacion): string {
    return a.proyectoNombre ? `${a.rolNombre} · ${a.proyectoNombre}` : `${a.rolNombre} · Toda la empresa`;
  }

  get personaElegida(): PersonaListItem | undefined {
    return this.personas().find((p) => p.id === this.personaId);
  }

  get rolElegido(): AccesoRol | undefined {
    return this.roles().find((r) => r.id === this.rolId);
  }

  get personasFiltradas(): PersonaListItem[] {
    const q = this.personaBusqueda.trim().toLowerCase();
    const lista = q ? this.personas().filter((p) => p.nombreCompleto.toLowerCase().includes(q) || p.numeroDocumento.includes(q)) : this.personas();
    return lista.slice(0, 8);
  }

  get necesitaCorreo(): boolean {
    const p = this.personaElegida;
    return !!p && !p.tieneUsuario;
  }

  abrir(personaId: number | null = null): void {
    this.personaId = personaId;
    this.personaBusqueda = '';
    this.email = '';
    this.rolId = null;
    this.alcance = 'TODA';
    this.proyectoId = null;
    this.error.set('');
    this.showModal.set(true);
  }

  elegirPersona(p: PersonaListItem): void {
    this.personaId = p.id;
    this.personaBusqueda = '';
  }

  onRolChange(): void {
    // Un rol de proyecto (residente, almacenero) se da por proyecto; uno global (gerente, contadora), a toda la empresa.
    this.alcance = this.rolElegido?.esGlobal === false ? 'PROYECTO' : 'TODA';
    if (this.alcance === 'TODA') this.proyectoId = null;
  }

  get puedeGuardar(): boolean {
    if (!this.personaId || !this.rolId) return false;
    if (this.necesitaCorreo && !/^\S+@\S+\.\S+$/.test(this.email.trim())) return false;
    if (this.alcance === 'PROYECTO' && !this.proyectoId) return false;
    return true;
  }

  guardar(): void {
    if (!this.puedeGuardar || !this.personaId || !this.rolId) return;
    this.guardando.set(true);
    this.error.set('');
    const darRol = () =>
      this.personasService
        .nuevaAsignacion(this.personaId!, {
          rolId: this.rolId!,
          proyectoId: this.alcance === 'PROYECTO' ? this.proyectoId : null,
          notificar: true,
        })
        .subscribe({
          next: () => {
            this.guardando.set(false);
            this.showModal.set(false);
            this.cargar();
            this.personasService.list('', 1, 500).subscribe((r) => this.personas.set(r.data));
            Swal.fire({ icon: 'success', title: 'Acceso guardado', text: 'Aplica la próxima vez que la persona inicie sesión.', timer: 2500, showConfirmButton: false });
          },
          error: (e) => this.fallo(e),
        });

    if (this.necesitaCorreo) {
      this.personasService.crearUsuario(this.personaId, this.email.trim()).subscribe({ next: darRol, error: (e) => this.fallo(e) });
    } else {
      darRol();
    }
  }

  private fallo(e: any): void {
    this.guardando.set(false);
    this.error.set(e?.error?.message ?? 'No se pudo guardar. Intenta de nuevo.');
  }

  async quitar(u: AccesoUsuario, a: AccesoAsignacion): Promise<void> {
    const r = await Swal.fire({
      icon: 'question',
      title: '¿Quitar este acceso?',
      text: `${u.nombre} dejará de tener «${this.chip(a)}».`,
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;
    this.personasService.revocarAsignacion(u.personaId, a.id).subscribe({
      next: () => this.cargar(),
      error: (e) => Swal.fire({ icon: 'error', title: 'No se pudo quitar', text: e?.error?.message ?? 'Intenta de nuevo.' }),
    });
  }
}
