import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { CharlaContratistaService } from '../../services/charla-contratista.service';
import { CharlaContratistaDto, CharlaContratistaPendienteDto } from '../../dtos/charla-contratista.dtos';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';

@Component({
  selector: 'app-charlas-contratista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FileSelector, Paginator, SearchInput, AbrilModalPanel],
  templateUrl: './charlas-contratista.html',
  styleUrl: './charlas-contratista.css',
})
export class CharlasContratista implements OnInit {
  pendientes: CharlaContratistaPendienteDto[] = [];
  diasFaltantes: CharlaContratistaPendienteDto[] = [];
  historial: CharlaContratistaDto[] = [];
  loadingPendientes = true;
  loadingDiasFaltantes = true;
  loadingHistorial = true;

  historialSearchText = '';
  private readonly historialPager = new ClientPager<CharlaContratistaDto>();

  get historialFiltrado(): CharlaContratistaDto[] {
    return this.historial.filter(
      (h) => !this.historialSearchText.trim() || SearchInput.matches(h.proyectoNombre ?? '', this.historialSearchText) || SearchInput.matches(h.tema ?? '', this.historialSearchText),
    );
  }

  get historialCurrentPage(): number {
    return this.historialPager.currentPage;
  }

  get historialTotalPages(): number {
    return this.historialPager.totalPages(this.historialFiltrado);
  }

  get historialPaged(): CharlaContratistaDto[] {
    return this.historialPager.page(this.historialFiltrado);
  }

  onHistorialFilterChange(): void {
    this.historialPager.reset();
  }

  changeHistorialPage(page: number): void {
    this.historialPager.goTo(page);
  }

  proyectoSeleccionado: CharlaContratistaPendienteDto | null = null;
  tema = '';
  descripcion = '';
  archivo: SelectedFile | null = null;
  guardando = false;

  constructor(
    private svc: CharlaContratistaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarPendientes();
    this.cargarDiasFaltantes();
    this.cargarHistorial();
  }

  get pendientesSinSubir(): CharlaContratistaPendienteDto[] {
    return this.pendientes.filter((p) => !p.yaSubida);
  }

  get pendientesSubidas(): CharlaContratistaPendienteDto[] {
    return this.pendientes.filter((p) => p.yaSubida);
  }

  cargarPendientes(): void {
    this.loadingPendientes = true;
    this.svc.getPendientes().subscribe({
      next: (res) => {
        this.pendientes = res ?? [];
        this.loadingPendientes = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingPendientes = false;
        this.cdr.markForCheck();
      },
    });
  }

  cargarDiasFaltantes(): void {
    this.loadingDiasFaltantes = true;
    this.svc.getDiasFaltantes().subscribe({
      next: (res) => {
        this.diasFaltantes = res ?? [];
        this.loadingDiasFaltantes = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingDiasFaltantes = false;
        this.cdr.markForCheck();
      },
    });
  }

  cargarHistorial(): void {
    this.loadingHistorial = true;
    this.svc.getHistorial().subscribe({
      next: (res) => {
        this.historial = res ?? [];
        this.historialPager.reset();
        this.loadingHistorial = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingHistorial = false;
        this.cdr.markForCheck();
      },
    });
  }

  abrirFormulario(p: CharlaContratistaPendienteDto): void {
    this.proyectoSeleccionado = p;
    this.tema = '';
    this.descripcion = '';
    this.archivo = null;
  }

  cerrarFormulario(): void {
    this.proyectoSeleccionado = null;
  }

  onArchivoSeleccionado(sf: SelectedFile): void {
    this.archivo = sf;
  }

  quitarArchivo(): void {
    this.archivo = null;
  }

  async guardar(): Promise<void> {
    if (!this.proyectoSeleccionado) return;
    if (!this.tema.trim()) {
      Swal.fire({ icon: 'warning', title: 'Falta el tema', text: 'Ingresa el tema de la charla dictada.' });
      return;
    }

    this.guardando = true;
    this.loaderService.show();

    let evidenciaBase64: string | undefined;
    if (this.archivo) {
      evidenciaBase64 = await this.fileToBase64(this.archivo.file);
    }

    this.svc
      .subir({
        proyectoId: this.proyectoSeleccionado.proyectoId,
        fecha: this.proyectoSeleccionado.fecha,
        tema: this.tema.trim(),
        descripcion: this.descripcion.trim() || undefined,
        evidenciaBase64,
        evidenciaNombre: this.archivo?.file.name,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Charla registrada', timer: 1800, showConfirmButton: false });
          this.cerrarFormulario();
          this.cargarPendientes();
          this.cargarDiasFaltantes();
          this.cargarHistorial();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
