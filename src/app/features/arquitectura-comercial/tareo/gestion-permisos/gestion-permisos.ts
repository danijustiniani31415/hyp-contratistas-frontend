import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { CameraCapture } from '../../../../shared/components/camera-capture/camera-capture';
import { TareoService } from '../../../../core/services/arquitectura-comercial/tareo.service';
import { FaceRecognitionService } from '../../../../core/services/arquitectura-comercial/face-recognition.service';
import { AC_TAREO_TABS } from '../../shared/arquitectura-comercial-tabs';
import { ClientPager } from '../../../../shared/utils/client-pager';
import { TareoTrabajadorEnrolamientoDTO, TareoProyectoGeoDTO } from '../../../../core/dtos/arquitectura-comercial/tareo.model';

@Component({
  selector: 'app-tareo-gestion-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, BaseModal, Paginator, CameraCapture],
  templateUrl: './gestion-permisos.html',
  styleUrl: './gestion-permisos.css',
})
export class TareoGestionPermisos {
  readonly tabs = AC_TAREO_TABS;

  trabajadores: TareoTrabajadorEnrolamientoDTO[] = [];
  cargando = true;
  busqueda = '';
  pager = new ClientPager<TareoTrabajadorEnrolamientoDTO>();

  modalAbierto = false;
  trabajadorSeleccionado: TareoTrabajadorEnrolamientoDTO | null = null;
  modelosListos = false;
  cargandoModelos = true;
  fotoCapturada: string | null = null;
  embeddingCapturado: number[] | null = null;
  capturando = false;
  guardando = false;

  subiendoAutorizacion: number | null = null;
  descargandoAutorizacion: number | null = null;

  proyectosGeo: TareoProyectoGeoDTO[] = [];
  cargandoProyectosGeo = true;
  geoAbierto = false;
  guardandoGeo: number | null = null;

  @ViewChild(CameraCapture) camara?: CameraCapture;

  get trabajadoresFiltrados(): TareoTrabajadorEnrolamientoDTO[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.trabajadores;
    return this.trabajadores.filter((t) => t.nombre.toLowerCase().includes(q));
  }

  get trabajadoresPagina(): TareoTrabajadorEnrolamientoDTO[] {
    return this.pager.page(this.trabajadoresFiltrados);
  }

  get totalPages(): number {
    return this.pager.totalPages(this.trabajadoresFiltrados);
  }

  constructor(
    private tareoService: TareoService,
    private faceService: FaceRecognitionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarProyectosGeo();
    this.faceService.cargarModelos().then((ok) => {
      this.modelosListos = ok;
      this.cargandoModelos = false;
      this.cdr.detectChanges();
    });
  }

  cargarProyectosGeo(): void {
    this.cargandoProyectosGeo = true;
    this.tareoService.getProyectosGeo().subscribe({
      next: (r) => {
        this.proyectosGeo = r;
        this.cargandoProyectosGeo = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoProyectosGeo = false;
        this.cdr.detectChanges();
      },
    });
  }

  guardarGeo(p: TareoProyectoGeoDTO): void {
    this.guardandoGeo = p.projectId;
    this.tareoService
      .setProyectoGeo(p.projectId, { lat: p.lat, lng: p.lng, radioGeofenceMetros: p.radioGeofenceMetros })
      .subscribe({
        next: () => {
          this.guardandoGeo = null;
          this.cdr.detectChanges();
          Swal.fire({ icon: 'success', title: 'Geolocalización guardada', timer: 1500, showConfirmButton: false });
        },
        error: (err) => {
          this.guardandoGeo = null;
          this.cdr.detectChanges();
          Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: err?.error?.message ?? 'Intenta de nuevo.' });
        },
      });
  }

  cargar(): void {
    this.cargando = true;
    this.tareoService.getTrabajadoresParaEnrolar().subscribe({
      next: (r) => {
        this.trabajadores = r;
        this.cargando = false;
        this.pager.reset();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.cdr.detectChanges();
        Swal.fire({ icon: 'error', title: 'No se pudo cargar la lista', text: err?.error?.message ?? 'Intenta de nuevo.' });
      },
    });
  }

  onBusquedaChange(): void {
    this.pager.reset();
  }

  fotoUrlConToken(url: string): string {
    return this.tareoService.fotoUrlConToken(url);
  }

  onPageChange(p: number): void {
    this.pager.goTo(p);
  }

  descargarAutorizacion(trabajador: TareoTrabajadorEnrolamientoDTO): void {
    this.descargandoAutorizacion = trabajador.workerId;
    this.tareoService.descargarAutorizacionPdf(trabajador.workerId).subscribe({
      next: (blob) => {
        this.descargandoAutorizacion = null;
        this.cdr.detectChanges();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SSO-FO-150_${trabajador.nombre.replace(/\s+/g, '_')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.descargandoAutorizacion = null;
        this.cdr.detectChanges();
        Swal.fire({ icon: 'error', title: 'No se pudo generar el SSO-FO-150', text: err?.error?.message ?? 'Intenta de nuevo.' });
      },
    });
  }

  onArchivoAutorizacion(trabajador: TareoTrabajadorEnrolamientoDTO, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.subiendoAutorizacion = trabajador.workerId;
    this.tareoService.subirAutorizacion(trabajador.workerId, file).subscribe({
      next: () => {
        this.subiendoAutorizacion = null;
        input.value = '';
        Swal.fire({ icon: 'success', title: 'Autorización subida', timer: 1600, showConfirmButton: false });
        this.cargar();
      },
      error: (err) => {
        this.subiendoAutorizacion = null;
        input.value = '';
        this.cdr.detectChanges();
        Swal.fire({ icon: 'error', title: 'No se pudo subir el documento', text: err?.error?.message ?? 'Intenta de nuevo.' });
      },
    });
  }

  abrirEnrolamiento(trabajador: TareoTrabajadorEnrolamientoDTO): void {
    if (!trabajador.autorizacionSubida) return;
    this.trabajadorSeleccionado = trabajador;
    this.fotoCapturada = null;
    this.embeddingCapturado = null;
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.camara?.detener();
    this.modalAbierto = false;
    this.trabajadorSeleccionado = null;
  }

  async capturar(): Promise<void> {
    if (!this.camara) return;
    this.capturando = true;
    this.cdr.detectChanges();

    const foto = this.camara.capturarFoto();
    if (!foto) {
      this.capturando = false;
      Swal.fire({ icon: 'error', title: 'No se pudo capturar la foto', text: 'Intenta de nuevo.' });
      return;
    }

    const embedding = this.modelosListos
      ? await this.faceService.calcularEmbedding(this.camara.videoElement)
      : null;

    if (!embedding) {
      this.capturando = false;
      this.cdr.detectChanges();
      Swal.fire({
        icon: 'warning',
        title: 'No se detectó el rostro con claridad',
        text: 'Pide que mire directo a la cámara con buena luz, luego intenta de nuevo.',
      });
      return;
    }

    this.fotoCapturada = foto;
    this.embeddingCapturado = embedding;
    this.capturando = false;
    this.cdr.detectChanges();
  }

  reintentar(): void {
    this.fotoCapturada = null;
    this.embeddingCapturado = null;
  }

  confirmar(): void {
    if (!this.trabajadorSeleccionado || !this.fotoCapturada || !this.embeddingCapturado) return;

    this.guardando = true;
    this.tareoService
      .enrolarTrabajador(this.trabajadorSeleccionado.workerId, {
        fotoBase64: this.fotoCapturada,
        embedding: this.embeddingCapturado,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          Swal.fire({ icon: 'success', title: 'Enrolamiento registrado', timer: 1800, showConfirmButton: false });
          this.cerrarModal();
          this.cargar();
        },
        error: (err) => {
          this.guardando = false;
          this.cdr.detectChanges();
          Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: err?.error?.message ?? 'Intenta de nuevo.' });
        },
      });
  }
}
