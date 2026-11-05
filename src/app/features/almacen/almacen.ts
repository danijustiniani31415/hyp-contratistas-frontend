import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { FabButton } from '../../shared/components/fab-button/fab-button';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import {
  AlmacenService,
  AlmacenGestion,
  StockListItem,
  MovimientoListItem,
  RegistrarMovimiento,
} from '../../core/services/almacen.service';
import { PersonasService, AlmacenCatalogoItem } from '../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../core/services/catalogo.service';
import { LbAuthService } from '../../core/services/lb-auth.service';
import Swal from 'sweetalert2';
import { Categoria } from '../../core/services/catalogo.service';
import { CargaMasivaFila } from '../../core/services/almacen.service';
import { adivinarTipoTalla, adivinarUnidad, extraerTalla, leerExcel } from '../guias-remision/guia-excel-import';
import { buscarProducto, marcasConocidas, separarColor, separarMarca } from '../guias-remision/producto-matching';
import { CatalogoValorService } from '../../core/services/catalogo-valor.service';

/** Fila del Excel de stock, antes de cargarla al almacén. */
interface FilaCarga {
  incluir: boolean;
  cantidad: number;
  /** Nombre SIN la marca: la marca va en su propio campo y el sistema la une al nombre al crear el producto. */
  nombre: string;
  marca: string;
  /** Variante de color (de la lista de colores del sistema): igual que la talla, el producto es el mismo. */
  color: string;
  talla: string;
  productoId: number | null;
  /** true si una persona eligió o descartó el producto: ya no se reasigna solo al editar nombre o marca. */
  manual: boolean;
  unidad: string;
  tipoTalla: '' | 'ROPA' | 'CALZADO' | 'GUANTES';
  costo: number | null;
  /** Producto parecido (no idéntico) del catálogo: se ofrece, pero no se asigna solo. */
  sugerido: { id: number; nombre: string; porcentaje: number; otraMarca: boolean; alternativas: string[] } | null;
}

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-almacen',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, BaseModal, FabButton, Paginator, LbPageHeader],
  templateUrl: './almacen.html',
  styleUrl: './almacen.css',
})
export class AlmacenComponent implements OnInit {
  almacenes = signal<AlmacenCatalogoItem[]>([]);
  productos = signal<ProductoListItem[]>([]);

  almacenFiltro: number | null = null;
  search = '';
  stock = signal<StockListItem[]>([]);
  page = signal(1);
  pageSize = 20;
  totalRecords = signal(0);
  totalPages = signal(1);
  loading = signal(false);

  movimientos = signal<MovimientoListItem[]>([]);

  showModal = signal(false);
  error = signal('');
  guardando = signal(false);
  form: RegistrarMovimiento = this.formVacio();

  // ── Cargar stock desde Excel (crea los productos que falten y registra los ingresos) ──
  showCarga = signal(false);
  cargaFilas = signal<FilaCarga[]>([]);
  categorias = signal<Categoria[]>([]);
  /** Lista de colores del sistema (editable): se usa para detectar el color en el Excel y elegirlo a mano. */
  colores = signal<string[]>([]);
  cargaAlmacenId: number | null = null;
  cargaCategoriaId: number | null = null;
  cargaLeyendo = signal(false);
  cargaEnviando = signal(false);
  unidadesCarga = ['UND', 'PAR', 'KG', 'GAL', 'M', 'M2', 'M3', 'L', 'ROLLO', 'CAJA'];

  async onExcelStockElegido(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    this.cargaLeyendo.set(true);
    try {
      const filas = leerExcel(await archivo.arrayBuffer());
      if (!filas.length) {
        Swal.fire({ icon: 'warning', title: 'No encontré productos', text: 'El Excel debe tener una columna de cantidad y otra con la descripción del producto.' });
        return;
      }
      const catalogo = this.productos();
      const conocidas = marcasConocidas(catalogo);
      this.cargaFilas.set(
        filas.map((f) => {
          const { base: sinTalla, talla } = extraerTalla(f.descripcion);
          // La marca es un dato propio: se separa del nombre y cuenta para decidir si el producto ya existe.
          // El color es variante (como la talla): se separa del nombre y se guarda aparte.
          const { color, base: sinColor } = separarColor(sinTalla, this.colores());
          const { marca, base } = separarMarca(sinColor, conocidas);
          const { exacto: productoId, sugerido } = buscarProducto(base, marca, catalogo, conocidas);
          const existente = catalogo.find((p) => p.id === productoId);
          return {
            incluir: true,
            cantidad: f.cantidad,
            nombre: base,
            marca,
            color,
            talla,
            productoId,
            manual: false,
            unidad: existente?.unidadMedida ?? adivinarUnidad(base),
            tipoTalla: adivinarTipoTalla(base, talla),
            costo: null,
            sugerido,
          } as FilaCarga;
        }),
      );
      this.cargaAlmacenId = this.almacenFiltro;
      this.cargaCategoriaId = null;
      this.categoriasCargar();
      this.showCarga.set(true);
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo leer el Excel', text: 'Verifica que sea un archivo .xlsx válido.' });
    } finally {
      this.cargaLeyendo.set(false);
    }
  }

  private categoriasCargar(): void {
    if (this.categorias().length) return;
    this.catalogoService.listCategorias().subscribe((c) => this.categorias.set(c));
  }

  get cargaNuevos(): number {
    return this.cargaFilas().filter((f) => f.incluir && !f.productoId).length;
  }

  get cargaIncluidas(): number {
    return this.cargaFilas().filter((f) => f.incluir).length;
  }

  /** El producto existente se maneja por color: la fila debe traerlo. */
  exigeColor(f: FilaCarga): boolean {
    return !!f.productoId && !!this.productos().find((x) => x.id === f.productoId)?.requiereColor;
  }

  /** La fila trae un color pero el producto elegido no lo maneja: ese color no se guardaría. */
  colorIgnorado(f: FilaCarga): boolean {
    const p = f.productoId ? this.productos().find((x) => x.id === f.productoId) : undefined;
    return !!p && !p.requiereColor && !!f.color;
  }

  usarSugeridoCarga(f: FilaCarga): void {
    if (!f.sugerido) return;
    f.productoId = f.sugerido.id;
    f.sugerido = null;
    f.manual = true;
    this.onProductoCargaCambiado(f);
  }

  /** El usuario eligió (o quitó) el producto a mano: se respeta aunque después edite el nombre o la marca. */
  onProductoElegidoCarga(f: FilaCarga): void {
    f.manual = true;
    this.onProductoCargaCambiado(f);
  }

  onProductoCargaCambiado(f: FilaCarga): void {
    const p = this.productos().find((x) => x.id === f.productoId);
    if (p) f.unidad = p.unidadMedida;
    this.cargaFilas.update((l) => [...l]);
  }

  /** Si escribe una marca que ya está dentro del nombre, la saca del nombre y vuelve a buscar el producto. */
  onMarcaCargaCambiada(f: FilaCarga): void {
    const m = f.marca.trim();
    if (m) {
      const sep = separarMarca(f.nombre, [m]);
      if (sep.marca) f.nombre = sep.base;
    }
    this.reevaluarFila(f);
  }

  /** Vuelve a buscar en el catálogo con el nombre y la marca actuales, salvo que una persona ya eligiera. */
  reevaluarFila(f: FilaCarga): void {
    if (!f.manual) {
      const catalogo = this.productos();
      const m = buscarProducto(f.nombre.trim(), f.marca.trim(), catalogo, marcasConocidas(catalogo));
      f.productoId = m.exacto;
      f.sugerido = m.exacto ? null : m.sugerido;
      const p = catalogo.find((x) => x.id === f.productoId);
      if (p) f.unidad = p.unidadMedida;
    }
    this.cargaFilas.update((l) => [...l]);
  }

  cerrarCarga(): void {
    this.showCarga.set(false);
  }

  confirmarCarga(): void {
    const filas = this.cargaFilas().filter((f) => f.incluir);
    if (!this.cargaAlmacenId) {
      Swal.fire({ icon: 'info', title: 'Elige el almacén al que ingresan' });
      return;
    }
    if (this.cargaNuevos > 0 && !this.cargaCategoriaId) {
      Swal.fire({ icon: 'info', title: 'Elige la categoría', text: `Hay ${this.cargaNuevos} productos nuevos y hace falta una categoría para crearlos.` });
      return;
    }
    const sinColor = filas.find((f) => this.exigeColor(f) && !f.color);
    if (sinColor) {
      Swal.fire({ icon: 'warning', title: 'Falta el color', text: `«${sinColor.nombre}» se maneja por color y la fila no lo trae: elígelo en su columna.` });
      return;
    }
    const invalida = filas.find((f) => f.cantidad <= 0 || (!f.productoId && !f.nombre.trim()) || (f.tipoTalla && !f.talla.trim()));
    if (invalida) {
      Swal.fire({ icon: 'warning', title: 'Revisa las filas', text: `Hay una fila con datos incompletos: «${invalida.nombre || '(sin nombre)'}» (cantidad, nombre o talla).` });
      return;
    }
    const nombreAlmacen = this.almacenes().find((a) => a.id === this.cargaAlmacenId)?.nombre ?? '';
    Swal.fire({
      icon: 'question',
      title: `¿Cargar ${filas.length} productos?`,
      html: `Se registrará un <b>ingreso</b> en <b>${nombreAlmacen}</b> por cada fila` +
        (this.cargaNuevos ? ` y se crearán <b>${this.cargaNuevos}</b> productos nuevos en el catálogo.` : '.') +
        '<br><br>Si cargas el mismo Excel dos veces, el stock se suma dos veces.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cargar',
      cancelButtonText: 'Volver',
    }).then((res) => {
      if (!res.isConfirmed) return;
      const payload: CargaMasivaFila[] = filas.map((f) => ({
        productoId: f.productoId,
        nuevoProducto: f.productoId
          ? null
          : {
              nombre: f.nombre.trim(),
              marca: f.marca.trim() || null,
              categoriaId: this.cargaCategoriaId!,
              unidadMedida: f.unidad,
              requiereTalla: !!f.tipoTalla,
              requiereColor: !!f.color,
              tipoTalla: f.tipoTalla || null,
            },
        talla: f.talla.trim(),
        color: f.color,
        cantidad: f.cantidad,
        costoUnitario: f.costo,
      }));
      this.cargaEnviando.set(true);
      this.service.cargaMasiva(this.cargaAlmacenId!, payload).subscribe({
        next: (r) => {
          this.cargaEnviando.set(false);
          const errores = r.filas.filter((x) => !x.ok);
          if (errores.length) {
            // Se quedan en pantalla solo las filas que fallaron, para corregirlas y reintentar sin duplicar el resto.
            const fallidas = new Set(errores.map((e) => e.fila - 1));
            this.cargaFilas.set(filas.filter((_, i) => fallidas.has(i)));
            Swal.fire({
              icon: 'warning',
              title: `${r.registradas} cargadas, ${r.fallidas} con error`,
              html: errores.slice(0, 8).map((e) => `Fila ${e.fila}: ${e.mensaje}`).join('<br>') +
                (errores.length > 8 ? `<br>… y ${errores.length - 8} más` : '') +
                '<br><br>Las filas con error siguen en pantalla; las cargadas no se repetirán.',
            });
          } else {
            this.showCarga.set(false);
            Swal.fire({ icon: 'success', title: `${r.registradas} productos cargados`, text: r.productosCreados ? `${r.productosCreados} productos nuevos creados en el catálogo.` : undefined });
          }
          this.catalogoService.listProductos('', 1, 5000).subscribe((p) => this.productos.set(p.data));
          this.cargar();
          this.cargarMovimientos();
        },
        error: (err) => {
          this.cargaEnviando.set(false);
          Swal.fire({ icon: 'error', title: 'No se pudo cargar', text: err?.error?.message ?? 'Error del servidor.' });
        },
      });
    });
  }

  // ── Gestionar almacenes (datos que SUNAT ve en la guía de remisión) ──
  showAlmacenes = signal(false);
  almacenesGestion = signal<AlmacenGestion[]>([]);
  almacenEditando = signal<AlmacenGestion | null>(null);
  almacenNuevo = signal(false);
  formAlmacen: { nombre: string; tipo: 'CENTRAL' | 'PROYECTO'; direccion: string; ubigeo: string; codigoEstablecimientoSunat: string } =
    { nombre: '', tipo: 'PROYECTO', direccion: '', ubigeo: '', codigoEstablecimientoSunat: '' };
  guardandoAlmacen = signal(false);
  errorAlmacen = signal('');

  constructor(
    private service: AlmacenService,
    private personasService: PersonasService,
    private catalogoService: CatalogoService,
    private catalogoValorService: CatalogoValorService,
    public authService: LbAuthService,
  ) {}

  ngOnInit(): void {
    this.personasService.getCatalogos().subscribe((c) => this.almacenes.set(c.almacenes));
    this.catalogoService.listProductos('', 1, 5000).subscribe((r) => this.productos.set(r.data));
    this.catalogoValorService.list('COLOR').subscribe((v) => this.colores.set(v.filter((x) => x.activo).map((x) => x.valor)));
    this.cargar();
    this.cargarMovimientos();
  }

  cargar(): void {
    this.loading.set(true);
    this.service.listStock(this.almacenFiltro, this.search, this.page(), this.pageSize).subscribe({
      next: (res) => {
        this.stock.set(res.data);
        this.totalRecords.set(res.totalRecords);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  cargarMovimientos(): void {
    this.service.listMovimientos(this.almacenFiltro, 1, 10).subscribe((r) => this.movimientos.set(r.data));
  }

  onFiltroChange(): void {
    this.page.set(1);
    this.cargar();
    this.cargarMovimientos();
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

  /** Nombre legible del motivo de un movimiento: de dónde salió o por qué entró ese stock. */
  motivoMovimiento(tipo: string | null): string {
    switch (tipo) {
      case null: return 'Ajuste manual';
      case 'GUIA_REMISION': return 'Guía de remisión aceptada';
      case 'GUIA_REMISION_ANULACION': return 'Reversa de guía (anulada o eliminada)';
      case 'GUIA_REMISION_AJUSTE': return 'Faltante al recibir una guía';
      case 'CARGA_EXCEL': return 'Carga desde Excel';
      case 'COMPRA': return 'Compra';
      case 'ORDEN_COMPRA': return 'Orden de compra';
      case 'PEDIDO': return 'Pedido';
      case 'ENTREGA_EPP': return 'Entrega de EPP';
      case 'PRESTAMO_HERRAMIENTA': return 'Préstamo de herramienta';
      default: return tipo;
    }
  }

  abrirNuevo(): void {
    this.form = this.formVacio();
    if (this.almacenFiltro) this.form.almacenId = this.almacenFiltro;
    this.error.set('');
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
  }

  guardar(): void {
    if (!this.form.almacenId || !this.form.productoId || !this.form.cantidad) return;
    this.error.set('');
    this.guardando.set(true);
    this.service.registrarMovimiento(this.form).subscribe({
      next: () => {
        this.guardando.set(false);
        this.showModal.set(false);
        this.cargar();
        this.cargarMovimientos();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo registrar el movimiento.');
      },
    });
  }

  abrirAlmacenes(): void {
    this.almacenEditando.set(null);
    this.almacenNuevo.set(false);
    this.errorAlmacen.set('');
    this.service.listAlmacenes().subscribe((a) => this.almacenesGestion.set(a));
    this.showAlmacenes.set(true);
  }

  cerrarAlmacenes(): void {
    this.showAlmacenes.set(false);
  }

  nuevoAlmacen(): void {
    this.almacenEditando.set(null);
    this.errorAlmacen.set('');
    this.formAlmacen = { nombre: '', tipo: 'PROYECTO', direccion: '', ubigeo: '', codigoEstablecimientoSunat: '' };
    this.almacenNuevo.set(true);
  }

  editarAlmacen(a: AlmacenGestion): void {
    this.almacenNuevo.set(false);
    this.almacenEditando.set(a);
    this.errorAlmacen.set('');
    this.formAlmacen = {
      nombre: a.nombre,
      tipo: a.tipo === 'CENTRAL' ? 'CENTRAL' : 'PROYECTO',
      direccion: a.direccion ?? '',
      ubigeo: a.ubigeo ?? '',
      codigoEstablecimientoSunat: a.codigoEstablecimientoSunat,
    };
  }

  volverAlmacenes(): void {
    this.almacenEditando.set(null);
    this.almacenNuevo.set(false);
  }

  /** Refresca la lista y también los selectores de la pantalla, para ver el cambio sin recargar. */
  private refrescarAlmacenes(): void {
    this.service.listAlmacenes().subscribe((a) => this.almacenesGestion.set(a));
    this.personasService.getCatalogos().subscribe((c) => this.almacenes.set(c.almacenes));
  }

  guardarAlmacen(): void {
    this.errorAlmacen.set('');
    this.guardandoAlmacen.set(true);
    const fin = {
      next: () => {
        this.guardandoAlmacen.set(false);
        this.volverAlmacenes();
        this.refrescarAlmacenes();
      },
      error: (err: { error?: { message?: string } }) => {
        this.guardandoAlmacen.set(false);
        this.errorAlmacen.set(err?.error?.message ?? 'No se pudo guardar el almacén.');
      },
    };
    const f = this.formAlmacen;
    const a = this.almacenEditando();
    if (a) {
      this.service.actualizarAlmacen(a.id, {
        nombre: f.nombre, direccion: f.direccion, ubigeo: f.ubigeo, codigoEstablecimientoSunat: f.codigoEstablecimientoSunat,
      }).subscribe(fin);
    } else {
      this.service.crearAlmacen(f).subscribe(fin);
    }
  }

  /** Desactivar no borra: el almacén conserva su historial de movimientos y guías. */
  alternarActivoAlmacen(a: AlmacenGestion): void {
    this.service.actualizarAlmacen(a.id, {
      direccion: a.direccion ?? '', ubigeo: a.ubigeo ?? '', codigoEstablecimientoSunat: a.codigoEstablecimientoSunat, activo: !a.activo,
    }).subscribe({
      next: () => this.refrescarAlmacenes(),
      error: (err) => this.errorAlmacen.set(err?.error?.message ?? 'No se pudo cambiar el estado.'),
    });
  }

  private formVacio(): RegistrarMovimiento {
    return {
      almacenId: 0,
      productoId: 0,
      talla: '',
      tipoMovimiento: 'INGRESO',
      cantidad: 0,
      costoUnitario: null,
    };
  }
}
