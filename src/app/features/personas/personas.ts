import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { DatePicker } from '../../shared/components/date-picker/date-picker';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { CatalogoValorModal } from '../../shared/components/catalogo-valor-modal/catalogo-valor-modal';
import { CatalogoValorService, CatalogoValor } from '../../core/services/catalogo-valor.service';
import { FabButton } from '../../shared/components/fab-button/fab-button';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import { FilterTriggerButton } from '../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../shared/components/filter-modal/filter-modal';
import {
  PersonasService,
  PersonaListItem,
  CatalogosPersonas,
  PersonaCreate,
  CargoDetalle,
} from '../../core/services/personas.service';

/**
 * [REVISADO] Estado en signals, no en campos de clase planos. Esta app usa
 * `provideHttpClient(withFetch())`, y Zone.js NO parcha `fetch()` acá (confirmado:
 * `window.fetch.toString()` da "[native code]", no la versión parcheada) — así que un
 * `this.algo = valor` dentro de un `.subscribe()` nunca dispara la detección de cambios sola:
 * el dato llega bien (200 OK, visible en Network) pero la vista se queda pegada en su estado
 * anterior para siempre ("Cargando..." eterno). Un interceptor que fuerza `ApplicationRef.tick()`
 * es fràgil (choca con NG0101 si Angular ya está en medio de un tick). Los signals evitan el
 * problema de raíz: notifican a Angular directo, sin depender de que Zone.js haya parchado nada.
 * Usar signals para todo estado que se actualice desde un callback asíncrono (HTTP, timers,
 * SignalR, etc.) en cualquier componente nuevo de Las Bravas — no campos de clase planos.
 */
@Component({
  selector: 'app-personas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchSelect, DatePicker, BaseModal, CatalogoValorModal, FabButton, Paginator, LbPageHeader, FilterTriggerButton, FilterModal],
  templateUrl: './personas.html',
  styleUrl: './personas.css',
})
export class Personas implements OnInit {
  personas = signal<PersonaListItem[]>([]);
  search = '';
  page = signal(1);
  pageSize = 20;
  totalRecords = signal(0);
  totalPages = signal(1);
  loading = signal(false);

  catalogos = signal<CatalogosPersonas | null>(null);

  showFiltros = signal(false);
  filtros = { cargoId: null as number | null, tipoVinculoId: null as number | null, estado: '' as string };
  estadosVinculo = ['ACTIVO', 'CESADO', 'SUSPENDIDO', 'SIN_VINCULO'];

  showModal = signal(false);
  error = signal('');
  buscandoDni = signal(false);

  form: PersonaCreate = this.formVacio();

  showCargosModal = signal(false);
  cargos = signal<CargoDetalle[]>([]);
  cargoNuevo = '';
  cargoError = signal('');
  guardandoCargo = signal(false);

  // Catálogos genéricos (banco, tipo AFP/ONP, categoría laboral) — editables desde el front,
  // nunca <option> hardcodeado. catalogoAbierto indica cuál modal genérico está abierto ('' = ninguno).
  bancos = signal<CatalogoValor[]>([]);
  tiposAfpOnp = signal<CatalogoValor[]>([]);
  categoriasLaborales = signal<CatalogoValor[]>([]);
  catalogoAbierto = signal<'' | 'BANCO' | 'TIPO_AFP_ONP' | 'CATEGORIA_LABORAL'>('');

  constructor(private service: PersonasService, private catalogoValorService: CatalogoValorService) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarCatalogosValor();
    this.service.getCatalogos().subscribe((c) => this.catalogos.set(c));
  }

  get filtrosActivos(): number {
    return (this.filtros.cargoId ? 1 : 0) + (this.filtros.tipoVinculoId ? 1 : 0) + (this.filtros.estado ? 1 : 0);
  }

  abrirFiltros(): void {
    this.showFiltros.set(true);
  }

  cerrarFiltros(): void {
    this.showFiltros.set(false);
  }

  limpiarFiltros(): void {
    this.filtros = { cargoId: null, tipoVinculoId: null, estado: '' };
    this.onSearch();
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
    this.cargarCatalogosValor(); // por si agregaron/desactivaron algo, refresca los combos
  }

  cargar(): void {
    this.loading.set(true);
    this.service.list(this.search, this.page(), this.pageSize, this.filtros).subscribe({
      next: (res) => {
        this.personas.set(res.data);
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

  /** Busca sola al escribir — sin botón "Buscar" ni Enter — con un pequeño debounce para no
   * disparar una petición por cada tecla. */
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
    this.showModal.set(true);
    if (!this.catalogos()) {
      this.service.getCatalogos().subscribe((c) => this.catalogos.set(c));
    }
  }

  cerrarModal(): void {
    this.showModal.set(false);
  }

  /** "Empresa contratista" solo aplica para el tipo de vínculo CONTRATISTA — Planilla/Locador/
   *  Practicante son siempre H&P directo. */
  get requiereEmpresaContratista(): boolean {
    const tipo = this.catalogos()?.tiposVinculo.find((t) => t.id === this.form.tipoVinculoId);
    return tipo?.codigo === 'CONTRATISTA';
  }

  onTipoVinculoChange(): void {
    if (!this.requiereEmpresaContratista) this.form.empresaContratistaId = null;
  }

  // ── Gestión de cargos ───────────────────────────────────────────────
  abrirCargos(): void {
    this.cargoError.set('');
    this.cargoNuevo = '';
    this.showCargosModal.set(true);
    this.service.listCargos().subscribe((c) => this.cargos.set(c));
  }

  cerrarCargos(): void {
    this.showCargosModal.set(false);
    // Refresca el combo de "Nueva persona" por si cambiaron nombres/estado de cargos.
    this.service.getCatalogos().subscribe((c) => this.catalogos.set(c));
  }

  agregarCargo(): void {
    const nombre = this.cargoNuevo.trim();
    if (!nombre) return;
    this.cargoError.set('');
    this.guardandoCargo.set(true);
    this.service.crearCargo({ nombre }).subscribe({
      next: (c) => {
        this.guardandoCargo.set(false);
        this.cargoNuevo = '';
        this.cargos.update((lista) => [...lista, c].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      },
      error: (err) => {
        this.guardandoCargo.set(false);
        this.cargoError.set(err?.error?.message ?? 'No se pudo crear el cargo.');
      },
    });
  }

  guardarCargo(cargo: CargoDetalle): void {
    this.cargoError.set('');
    this.service.actualizarCargo(cargo.id, { nombre: cargo.nombre, activo: cargo.activo }).subscribe({
      error: (err) => this.cargoError.set(err?.error?.message ?? 'No se pudo actualizar el cargo.'),
    });
  }

  toggleCargoActivo(cargo: CargoDetalle): void {
    cargo.activo = !cargo.activo;
    this.guardarCargo(cargo);
  }

  /** Autocompleta Nombres/Apellidos consultando RENIEC — mismo criterio que el resto de
   *  Plataforma Abril. Solo dispara con DNI de 8 dígitos; si no lo encuentra, deja los campos
   *  para llenado manual en vez de bloquear el formulario. */
  onDniBlur(): void {
    const dni = this.form.numeroDocumento.trim();
    if (this.form.tipoDocumento !== 'DNI' || dni.length !== 8) return;

    this.buscandoDni.set(true);
    this.service.buscarPorDni(dni).subscribe({
      next: (persona) => {
        this.buscandoDni.set(false);
        this.form.nombres = persona.nombres;
        this.form.apellidos = persona.apellidos;
      },
      error: () => this.buscandoDni.set(false),
    });
  }

  guardar(): void {
    this.error.set('');
    this.service.create(this.form).subscribe({
      next: () => {
        this.showModal.set(false);
        this.page.set(1);
        this.cargar();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'No se pudo guardar. Intenta de nuevo.');
      },
    });
  }

  /** Guardar solo se habilita con lo mínimo (identidad + vínculo laboral) — todo lo de
   *  planilla (banco, CUSP, sueldo, AFP...) es opcional, se completa cuando se tenga la info. */
  get formValido(): boolean {
    return !!(
      this.form.nombres.trim() &&
      this.form.apellidos.trim() &&
      this.form.numeroDocumento.trim() &&
      this.form.tipoVinculoId &&
      this.form.cargoId &&
      this.form.proyectoId &&
      this.form.fechaInicio
    );
  }

  private formVacio(): PersonaCreate {
    return {
      nombres: '',
      apellidos: '',
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      telefono: '',
      emailPersonal: '',
      tipoVinculoId: 0,
      proyectoId: null,
      fechaInicio: new Date().toISOString().slice(0, 10),
      planilla: {
        banco: '',
        numeroCuenta: '',
        cusp: '',
        tipoAfpOnp: '',
        categoriaLaboral: '',
        sueldoBase: null,
        jornal: null,
        asignacionFamiliar: false,
        sctr: false,
      },
    };
  }
}
