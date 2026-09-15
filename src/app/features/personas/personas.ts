import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { FabButton } from '../../shared/components/fab-button/fab-button';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbNav } from '../../shared/components/lb-nav/lb-nav';
import {
  PersonasService,
  PersonaListItem,
  CatalogosPersonas,
  PersonaCreate,
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
  imports: [CommonModule, FormsModule, RouterLink, SearchSelect, BaseModal, FabButton, Paginator, LbNav],
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
  showModal = signal(false);
  error = signal('');

  form: PersonaCreate = this.formVacio();

  constructor(private service: PersonasService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.service.list(this.search, this.page(), this.pageSize).subscribe({
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

  private formVacio(): PersonaCreate {
    return {
      nombres: '',
      apellidos: '',
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      tipoVinculoId: 0,
      fechaInicio: new Date().toISOString().slice(0, 10),
    };
  }
}
