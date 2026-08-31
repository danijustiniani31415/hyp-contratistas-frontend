import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  KitResumenDto, KitDetalleDto, KitCalculoLineaDto, KitItemInputDto,
  TipoMaterialDto, FamiliaCatalogoDto,
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

@Component({
  selector: 'app-kits-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './kits-page.html',
  styleUrl: './kits-page.css',
})
export class KitsPage implements OnInit {
  readonly headerTabs = PRESUPUESTO_TABS;
  private svc    = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error  = inject(ErrorService);
  cdr            = inject(ChangeDetectorRef);

  loading = false;
  kits: KitResumenDto[] = [];
  kitSeleccionadoId: number | null = null;
  kitDetalle: KitDetalleDto | null = null;
  cantidadKits: number | null = null;
  resultado: KitCalculoLineaDto[] = [];

  get kitsOpts(): any[] {
    return this.kits.map((k) => ({ ...k, _label: `${k.nombre} (${k.nombreTipo})` }));
  }

  // ── Crear kit ────────────────────────────────────────────────────
  mostrarFormCrear = false;
  guardandoKit = false;
  tipos: TipoMaterialDto[] = [];
  familias: FamiliaCatalogoDto[] = [];
  nuevoKitNombre = '';
  nuevoKitTipoId: number | null = null;
  nuevoKitItems: KitItemInputDto[] = [];

  ngOnInit(): void {
    this.loading = true;
    this.loader.show();
    this.svc.listarKits().subscribe({
      next: (kits) => {
        this.kits = kits;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggleFormCrear(): void {
    this.mostrarFormCrear = !this.mostrarFormCrear;
    if (this.mostrarFormCrear) {
      this.resetFormCrear();
      if (this.tipos.length === 0) this.cargarTipos();
      if (this.familias.length === 0) this.cargarFamilias();
    }
    this.cdr.markForCheck();
  }

  private resetFormCrear(): void {
    this.nuevoKitNombre = '';
    this.nuevoKitTipoId = null;
    this.nuevoKitItems = [{ familiaId: 0, cantidadPorKit: 1, esConsumible: true }];
  }

  private cargarTipos(): void {
    this.svc.listarTiposCatalogo().subscribe({
      next: (tipos) => { this.tipos = tipos; this.cdr.markForCheck(); },
    });
  }

  private cargarFamilias(): void {
    this.svc.listarFamiliasCatalogo().subscribe({
      next: (familias) => { this.familias = familias; this.cdr.markForCheck(); },
    });
  }

  agregarItem(): void {
    this.nuevoKitItems.push({ familiaId: 0, cantidadPorKit: 1, esConsumible: true });
    this.cdr.markForCheck();
  }

  quitarItem(index: number): void {
    this.nuevoKitItems.splice(index, 1);
    this.cdr.markForCheck();
  }

  get formCrearValido(): boolean {
    return !!this.nuevoKitNombre.trim()
      && !!this.nuevoKitTipoId
      && this.nuevoKitItems.length > 0
      && this.nuevoKitItems.every((i) => i.familiaId > 0 && i.cantidadPorKit > 0);
  }

  guardarKit(): void {
    if (!this.formCrearValido || this.guardandoKit) return;
    this.guardandoKit = true;
    this.loader.show();
    this.svc.crearKit({
      nombre: this.nuevoKitNombre.trim(),
      tipoId: this.nuevoKitTipoId!,
      items: this.nuevoKitItems,
    }).subscribe({
      next: () => {
        this.guardandoKit = false;
        this.loader.hide();
        this.mostrarFormCrear = false;
        Swal.fire({ icon: 'success', title: 'Kit creado', timer: 1500, showConfirmButton: false });
        this.recargarKits();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoKit = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private recargarKits(): void {
    this.svc.listarKits().subscribe({
      next: (kits) => { this.kits = kits; this.cdr.markForCheck(); },
    });
  }

  onSeleccionarKit(): void {
    this.resultado = [];
    this.cantidadKits = null;
    if (this.kitSeleccionadoId == null) {
      this.kitDetalle = null;
      return;
    }
    this.loader.show();
    this.svc.getKit(this.kitSeleccionadoId).subscribe({
      next: (kit) => {
        this.kitDetalle = kit;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  calcular(): void {
    if (!this.kitSeleccionadoId || !this.cantidadKits || this.cantidadKits <= 0) return;
    this.loader.show();
    this.svc.calcularKit(this.kitSeleccionadoId, this.cantidadKits).subscribe({
      next: (lineas) => {
        this.resultado = lineas;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get consumibles(): KitCalculoLineaDto[] {
    return this.resultado.filter((r) => r.esConsumible);
  }

  get durables(): KitCalculoLineaDto[] {
    return this.resultado.filter((r) => !r.esConsumible);
  }
}
