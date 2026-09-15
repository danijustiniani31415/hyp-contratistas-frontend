import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LbNav } from '../../shared/components/lb-nav/lb-nav';
import {
  RolesPermisosService,
  RolListItem,
  Permiso,
  RolDetalle,
} from '../../core/services/roles-permisos.service';

/**
 * [REVISADO] Estado en signals, no en campos de clase planos — ver la regla obligatoria en
 * SISTEMA-DE-DISENO.md sección 0 (bug real de Zone.js + fetch()). Referencia: personas.ts.
 */
@Component({
  selector: 'app-roles-permisos',
  standalone: true,
  imports: [CommonModule, LbNav],
  templateUrl: './roles-permisos.html',
  styleUrl: './roles-permisos.css',
})
export class RolesPermisos implements OnInit {
  roles = signal<RolListItem[]>([]);
  permisos = signal<Permiso[]>([]);
  rolSeleccionado = signal<RolListItem | null>(null);
  permisoIdsSeleccionados = signal<Set<number>>(new Set());
  loading = signal(false);
  guardando = signal(false);
  guardadoOk = signal(false);
  error = signal('');

  modulos = computed(() => {
    const grupos = new Map<string, Permiso[]>();
    for (const p of this.permisos()) {
      if (!grupos.has(p.modulo)) grupos.set(p.modulo, []);
      grupos.get(p.modulo)!.push(p);
    }
    return Array.from(grupos.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([modulo, items]) => ({ modulo, items }));
  });

  constructor(private service: RolesPermisosService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.service.listRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
        if (roles.length) this.seleccionarRol(roles[0]);
      },
      error: () => this.loading.set(false),
    });
    this.service.listPermisos().subscribe((permisos) => this.permisos.set(permisos));
  }

  seleccionarRol(rol: RolListItem): void {
    this.rolSeleccionado.set(rol);
    this.guardadoOk.set(false);
    this.error.set('');
    this.service.getRolDetalle(rol.id).subscribe((detalle: RolDetalle) => {
      this.permisoIdsSeleccionados.set(new Set(detalle.permisoIds));
    });
  }

  tienePermiso(permisoId: number): boolean {
    return this.permisoIdsSeleccionados().has(permisoId);
  }

  toggle(permisoId: number): void {
    const actual = new Set(this.permisoIdsSeleccionados());
    if (actual.has(permisoId)) actual.delete(permisoId);
    else actual.add(permisoId);
    this.permisoIdsSeleccionados.set(actual);
    this.guardadoOk.set(false);
  }

  guardar(): void {
    const rol = this.rolSeleccionado();
    if (!rol) return;
    this.guardando.set(true);
    this.error.set('');
    this.service.actualizarPermisos(rol.id, Array.from(this.permisoIdsSeleccionados())).subscribe({
      next: () => {
        this.guardando.set(false);
        this.guardadoOk.set(true);
        this.roles.set(
          this.roles().map((r) =>
            r.id === rol.id ? { ...r, cantidadPermisos: this.permisoIdsSeleccionados().size } : r,
          ),
        );
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo guardar. Intenta de nuevo.');
      },
    });
  }
}
