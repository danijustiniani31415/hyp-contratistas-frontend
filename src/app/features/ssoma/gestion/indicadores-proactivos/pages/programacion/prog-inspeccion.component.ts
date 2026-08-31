import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { IndicadoresProactivosService } from '../../indicadores-proactivos.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import {
  InspeccionTipoDto,
  EmpresaProgInspeccionDto,
  ProgInspeccionResumenDto,
} from '../../indicadores-proactivos.dtos';
import { SharedFiltersService, SelectOption } from '../../../../../../shared/services/shared-filters.service';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

@Component({
  selector: 'app-prog-inspeccion',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './prog-inspeccion.component.html',
  styleUrls: ['./prog-inspeccion.component.css'],
})
export class ProgInspeccionComponent implements OnInit {
  private svc = inject(IndicadoresProactivosService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private filtersSvc = inject(SharedFiltersService);

  // ── Filtros ───────────────────────────────────────────────────────────────
  proyectoId = signal<number | null>(null);
  mesSeleccionado = signal<number>(new Date().getMonth() + 1);
  anioSeleccionado = signal<number>(new Date().getFullYear());

  // ── Datos ─────────────────────────────────────────────────────────────────
  tiposInspeccion = signal<InspeccionTipoDto[]>([]);
  resumen = signal<ProgInspeccionResumenDto | null>(null);
  empresaActiva = signal<EmpresaProgInspeccionDto | null>(null);
  guardando = signal(false);

  // ── Proyectos disponibles (cargados desde el tareo) ───────────────────────
  proyectos = signal<SelectOption[]>([]);

  meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
  ];

  anios = [2024, 2025, 2026, 2027].map(a => ({ valor: a, nombre: String(a) }));

  // Agrupación de tipos de inspección por categoría para mostrarlos mejor
  gruposTipos = computed(() => {
    const tipos = this.tiposInspeccion();
    return [
      { grupo: 'Protección contra incendios y emergencias', ids: [1, 12, 19, 32] },
      { grupo: 'Orden, limpieza y bienestar', ids: [4, 16, 17, 18, 30, 31] },
      { grupo: 'Herramientas y equipos', ids: [5, 6, 7, 8, 11] },
      { grupo: 'EPP y protección colectiva', ids: [9, 10, 22] },
      { grupo: 'Instalaciones y almacenes', ids: [2, 3, 13, 14, 15, 20] },
      { grupo: 'Trabajos de riesgo especial', ids: [24, 25, 26, 27, 28, 29] },
      { grupo: 'Medio ambiente', ids: [21] },
      { grupo: 'Inspección integral', ids: [23] },
    ].map(g => ({
      ...g,
      tipos: tipos.filter(t => g.ids.includes(t.id)),
    })).filter(g => g.tipos.length > 0);
  });

  ngOnInit(): void {
    this.filtersSvc.getProyectos().subscribe({
      next: data => this.proyectos.set(data),
      error: err => this.errorSvc.handleError(err),
    });
    this.svc.getTiposInspeccion().subscribe({
      next: tipos => this.tiposInspeccion.set(tipos),
      error: err => this.errorSvc.handleError(err),
    });
  }

  cargar(): void {
    if (!this.proyectoId()) return;
    this.loader.show();
    this.svc
      .getProgramacion(this.proyectoId()!, this.mesSeleccionado(), this.anioSeleccionado())
      .subscribe({
        next: r => {
          this.resumen.set(r);
          this.empresaActiva.set(r.empresas[0] ?? null);
          this.loader.hide();
        },
        error: err => {
          this.loader.hide();
          this.errorSvc.handleError(err);
        },
      });
  }

  seleccionarEmpresa(emp: EmpresaProgInspeccionDto): void {
    this.empresaActiva.set({ ...emp, tiposAplicables: [...emp.tiposAplicables] });
  }

  toggleTipo(tipoId: number): void {
    const emp = this.empresaActiva();
    if (!emp) return;
    const idx = emp.tiposAplicables.indexOf(tipoId);
    if (idx >= 0) {
      emp.tiposAplicables.splice(idx, 1);
    } else {
      emp.tiposAplicables.push(tipoId);
    }
    this.empresaActiva.set({ ...emp });
  }

  tieneSeleccionado(tipoId: number): boolean {
    return this.empresaActiva()?.tiposAplicables.includes(tipoId) ?? false;
  }

  seleccionarTodos(): void {
    const emp = this.empresaActiva();
    if (!emp) return;
    this.empresaActiva.set({
      ...emp,
      tiposAplicables: this.tiposInspeccion().map(t => t.id),
    });
  }

  deseleccionarTodos(): void {
    const emp = this.empresaActiva();
    if (!emp) return;
    this.empresaActiva.set({ ...emp, tiposAplicables: [] });
  }

  async guardar(): Promise<void> {
    const emp = this.empresaActiva();
    if (!emp || !this.proyectoId()) return;

    const confirm = await Swal.fire({
      title: '¿Guardar configuración?',
      html: `Se registrarán <b>${emp.tiposAplicables.length} tipos de inspección</b> para <b>${emp.empresaNombre}</b> en ${this.nombreMes(this.mesSeleccionado())} ${this.anioSeleccionado()}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0f4c75',
    });

    if (!confirm.isConfirmed) return;

    this.guardando.set(true);
    this.svc
      .guardarProgramacion({
        proyectoId: this.proyectoId()!,
        mes: this.mesSeleccionado(),
        anio: this.anioSeleccionado(),
        empresaId: emp.empresaId,
        empresaTipo: emp.empresaTipo,
        tiposAplicables: emp.tiposAplicables,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          // Actualizar el resumen local
          const r = this.resumen();
          if (r) {
            const idx = r.empresas.findIndex(
              e => e.empresaId === emp.empresaId && e.empresaTipo === emp.empresaTipo,
            );
            if (idx >= 0) r.empresas[idx] = { ...emp };
            this.resumen.set({ ...r });
          }
          Swal.fire({
            icon: 'success',
            title: 'Guardado',
            text: 'Programación de inspecciones actualizada correctamente.',
            timer: 2000,
            showConfirmButton: false,
          });
        },
        error: err => {
          this.guardando.set(false);
          this.errorSvc.handleError(err);
        },
      });
  }

  nombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre ?? '';
  }

  get totalSeleccionados(): number {
    return this.empresaActiva()?.tiposAplicables.length ?? 0;
  }

  contarSeleccionadosEnGrupo(tipos: InspeccionTipoDto[], seleccionados: number[]): number {
    return tipos.filter(t => seleccionados.includes(t.id)).length;
  }
}
