import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

const UNIDADES_MEDIDA = ['UND', 'PAR', 'KG', 'GAL', 'M', 'M2', 'M3', 'L', 'ROLLO', 'CAJA'];

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
  showModal = signal(false);
  error = signal('');
  guardando = signal(false);

  sugerencias = signal<SugerenciaProducto[]>([]);
  private sugerenciasTimer: ReturnType<typeof setTimeout> | null = null;

  form: ProductoCreate = this.formVacio();

  constructor(private service: CatalogoService) {}

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
    this.error.set('');
    this.sugerencias.set([]);
    this.showModal.set(true);
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
    this.error.set('');
    this.guardando.set(true);
    this.service.crearProducto(this.form).subscribe({
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
      esRetornable: false,
    };
  }
}
