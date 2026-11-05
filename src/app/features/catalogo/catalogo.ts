import { Component, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { FabButton } from '../../shared/components/fab-button/fab-button';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import {
  CatalogoService,
  ProductoListItem,
  ProductoCreate,
  Categoria,
  SugerenciaProducto,
} from '../../core/services/catalogo.service';
import { LbAuthService } from '../../core/services/lb-auth.service';
import { agruparDuplicados, marcasConocidas } from '../guias-remision/producto-matching';

/** Un producto dentro de un grupo de posibles duplicados. */
interface MiembroDup { id: number; nombre: string; enUso: boolean; desactivar: boolean }
interface GrupoDup { principalId: number; miembros: MiembroDup[]; aplicando: boolean }

const UNIDADES_MEDIDA = ['UND', 'PAR', 'KG', 'GAL', 'M', 'M2', 'M3', 'L', 'ROLLO', 'CAJA'];
const TIPOS_TALLA = ['ROPA', 'CALZADO', 'GUANTES'];

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, BaseModal, FabButton, Paginator, LbPageHeader],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit {
  productos = signal<ProductoListItem[]>([]);
  search = '';
  page = signal(1);
  pageSize = 20;
  totalRecords = signal(0);
  totalPages = signal(1);
  loading = signal(false);

  categorias = signal<Categoria[]>([]);
  unidades = UNIDADES_MEDIDA;
  tiposTalla = TIPOS_TALLA;
  showModal = signal(false);
  error = signal('');
  guardando = signal(false);

  sugerencias = signal<SugerenciaProducto[]>([]);
  private sugerenciasTimer: ReturnType<typeof setTimeout> | null = null;

  form: ProductoCreate = this.formVacio();
  /** null = creando un producto nuevo; con valor = editando ese producto. */
  editandoId = signal<number | null>(null);
  editandoActivo = true;

  constructor(private service: CatalogoService, public authService: LbAuthService) {}

  ngOnInit(): void {
    this.cargar();
    this.service.listCategorias().subscribe((c) => this.categorias.set(c));
  }

  cargar(): void {
    this.loading.set(true);
    this.service.listProductos(this.search, this.page(), this.pageSize).subscribe({
      next: (res) => {
        this.productos.set(res.data);
        this.totalRecords.set(res.totalRecords);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(): void {
    this.page.set(1);
    this.cargar();
  }

  private buscarDebounce?: ReturnType<typeof setTimeout>;
  onSearchInput(): void {
    clearTimeout(this.buscarDebounce);
    this.buscarDebounce = setTimeout(() => this.onSearch(), 350);
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.cargar();
  }

  abrirNuevo(): void {
    this.form = this.formVacio();
    this.editandoId.set(null);
    this.error.set('');
    this.sugerencias.set([]);
    this.showModal.set(true);
  }

  // ── Alias (otras formas de escribir el nombre) ──
  aliasNuevo = '';

  agregarAlias(): void {
    const texto = this.aliasNuevo.trim();
    if (!texto) return;
    const lista = this.form.alias ?? [];
    if (!lista.some((a) => a.toLowerCase() === texto.toLowerCase())) this.form.alias = [...lista, texto];
    this.aliasNuevo = '';
  }

  quitarAlias(alias: string): void {
    this.form.alias = (this.form.alias ?? []).filter((a) => a !== alias);
  }

  // ── Revisar duplicados ──
  showDuplicados = signal(false);
  gruposDup = signal<GrupoDup[]>([]);
  cargandoDup = signal(false);
  mensajeDup = signal('');

  abrirDuplicados(): void {
    this.showDuplicados.set(true);
    this.cargandoDup.set(true);
    this.mensajeDup.set('');
    forkJoin({ prods: this.service.listProductos('', 1, 5000), uso: this.service.listUso() }).subscribe({
      next: ({ prods, uso }) => {
        const enUso = new Set(uso);
        const grupos = agruparDuplicados(prods.data, marcasConocidas(prods.data)).map((g) => {
          const miembros: MiembroDup[] = g.map((p) => ({ id: p.id, nombre: p.nombre, enUso: enUso.has(p.id), desactivar: false }));
          // Se conserva por defecto el que ya se usa; si no, el de nombre más completo.
          const principal = [...miembros].sort((a, b) =>
            Number(b.enUso) - Number(a.enUso) ||
            b.nombre.split(/\s+/).length - a.nombre.split(/\s+/).length ||
            a.nombre.localeCompare(b.nombre))[0];
          miembros.forEach((m) => (m.desactivar = m.id !== principal.id && !m.enUso));
          return { principalId: principal.id, miembros, aplicando: false } as GrupoDup;
        }).sort((a, b) => a.miembros[0].nombre.localeCompare(b.miembros[0].nombre));
        this.gruposDup.set(grupos);
        this.cargandoDup.set(false);
      },
      error: () => {
        this.cargandoDup.set(false);
        this.mensajeDup.set('No se pudo revisar el catálogo. Intenta de nuevo.');
      },
    });
  }

  elegirPrincipal(g: GrupoDup, id: number): void {
    g.principalId = id;
    g.miembros.forEach((m) => (m.desactivar = m.id !== id && !m.enUso));
    this.gruposDup.update((l) => [...l]);
  }

  aplicarGrupo(g: GrupoDup): void {
    const ids = g.miembros.filter((m) => m.desactivar && m.id !== g.principalId && !m.enUso).map((m) => m.id);
    if (!ids.length) return;
    g.aplicando = true;
    this.gruposDup.update((l) => [...l]);
    this.service.resolverDuplicados(g.principalId, ids).subscribe({
      next: (r) => {
        this.gruposDup.update((l) => l.filter((x) => x !== g));
        this.mensajeDup.set(`${r.desactivados} duplicados desactivados.` + (r.omitidos.length ? ` ${r.omitidos.join(' ')}` : ''));
        this.cargar();
      },
      error: (err) => {
        g.aplicando = false;
        this.gruposDup.update((l) => [...l]);
        this.mensajeDup.set(err?.error?.message ?? 'No se pudo aplicar.');
      },
    });
  }

  cerrarDuplicados(): void {
    this.showDuplicados.set(false);
  }

  abrirEditar(p: ProductoListItem): void {
    this.error.set('');
    this.sugerencias.set([]);
    this.service.getProducto(p.id).subscribe({
      next: (d) => {
        this.form = {
          codigo: d.codigo,
          nombre: d.nombre,
          marca: d.marca,
          alias: d.alias ?? [],
          descripcion: d.descripcion,
          categoriaId: d.categoriaId,
          unidadMedida: d.unidadMedida,
          requiereTalla: d.requiereTalla,
          tipoTalla: d.tipoTalla,
          requiereColor: d.requiereColor,
          esRetornable: d.esRetornable,
          presentacion: d.presentacion,
          unidadesPorPresentacion: d.unidadesPorPresentacion,
        };
        this.editandoActivo = d.activo;
        this.editandoId.set(d.id);
        this.showModal.set(true);
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo cargar el producto.' });
      },
    });
  }

  cerrarModal(): void {
    this.showModal.set(false);
  }

  /** Busca posibles duplicados 400ms después de que dejan de escribir — CONTEXT_LOGISTICA.md §6. */
  onNombreChange(): void {
    if (this.sugerenciasTimer) clearTimeout(this.sugerenciasTimer);
    const nombre = this.form.nombre;
    if (!nombre || nombre.trim().length < 3) {
      this.sugerencias.set([]);
      return;
    }
    this.sugerenciasTimer = setTimeout(() => {
      this.service.sugerirProductos(nombre).subscribe({
        next: (r) => this.sugerencias.set(r),
        error: () => this.sugerencias.set([]),
      });
    }, 400);
  }

  guardar(): void {
    if (this.form.requiereTalla && !this.form.tipoTalla) {
      this.error.set('Si requiere talla, indica el tipo (ROPA, CALZADO o GUANTES).');
      return;
    }
    this.error.set('');
    this.guardando.set(true);

    const editandoId = this.editandoId();
    const guardado$ = editandoId
      ? this.service.actualizarProducto(editandoId, { ...this.form, activo: this.editandoActivo })
      : this.service.crearProducto(this.form);

    guardado$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.showModal.set(false);
        this.page.set(1);
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo guardar. Intenta de nuevo.');
      },
    });
  }

  private formVacio(): ProductoCreate {
    return {
      nombre: '',
      categoriaId: 0,
      unidadMedida: 'UND',
      requiereTalla: false,
      requiereColor: false,
      esRetornable: false,
    };
  }
}
