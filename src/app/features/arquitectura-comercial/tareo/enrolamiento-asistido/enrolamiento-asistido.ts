import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { CameraCapture } from '../../../../shared/components/camera-capture/camera-capture';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { TareoService } from '../../../../core/services/arquitectura-comercial/tareo.service';
import { FaceRecognitionService } from '../../../../core/services/arquitectura-comercial/face-recognition.service';
import { AC_TAREO_TABS } from '../../shared/arquitectura-comercial-tabs';
import { TareoTrabajadorEnrolamientoDTO } from '../../../../core/dtos/arquitectura-comercial/tareo.model';

/** Enrolamiento asistido: pantalla de autoservicio para la cuenta corporativa compartida de
 * campo (operarios). El correo de obra no identifica a la persona (varios trabajadores lo usan),
 * así que cada uno elige su propio nombre de una lista — solo aparecen quienes ya tienen el
 * SSO-FO-150 firmado y subido por el coordinador — y se toma su foto de referencia. */
@Component({
  selector: 'app-tareo-enrolamiento-asistido',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, CameraCapture, SearchSelect],
  templateUrl: './enrolamiento-asistido.html',
  styleUrl: './enrolamiento-asistido.css',
})
export class TareoEnrolamientoAsistido {
  readonly tabs = AC_TAREO_TABS;

  @ViewChild(CameraCapture) camara?: CameraCapture;

  trabajadores: TareoTrabajadorEnrolamientoDTO[] = [];
  cargandoTrabajadores = true;
  workerIdSeleccionado: number | null = null;

  modelosListos = false;
  cargandoModelos = true;

  fotoCapturada: string | null = null;
  embeddingCapturado: number[] | null = null;
  capturando = false;
  aceptaConsentimiento = false;
  guardando = false;

  get trabajadorSeleccionado(): TareoTrabajadorEnrolamientoDTO | null {
    return this.trabajadores.find((t) => t.workerId === this.workerIdSeleccionado) ?? null;
  }

  constructor(
    private tareoService: TareoService,
    private faceService: FaceRecognitionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarTrabajadores();
    this.faceService.cargarModelos().then((ok) => {
      this.modelosListos = ok;
      this.cargandoModelos = false;
      this.cdr.detectChanges();
    });
  }

  cargarTrabajadores(): void {
    this.cargandoTrabajadores = true;
    this.tareoService.getTrabajadoresDisponiblesParaEnrolar().subscribe({
      next: (r) => {
        this.trabajadores = r;
        this.cargandoTrabajadores = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargandoTrabajadores = false;
        this.cdr.detectChanges();
        Swal.fire({ icon: 'error', title: 'No se pudo cargar la lista', text: err?.error?.message ?? 'Intenta de nuevo.' });
      },
    });
  }

  onSeleccionChange(): void {
    this.reintentar();
  }

  cambiarTrabajador(): void {
    this.workerIdSeleccionado = null;
    this.reintentar();
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
        title: 'No se detectó tu rostro con claridad',
        text: 'Asegúrate de tener buena luz y mirar directo a la cámara, luego intenta de nuevo.',
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
    this.aceptaConsentimiento = false;
  }

  confirmar(): void {
    const workerId = this.workerIdSeleccionado;
    if (!workerId || !this.fotoCapturada || !this.embeddingCapturado || !this.aceptaConsentimiento) return;

    this.guardando = true;
    this.tareoService
      .enrolarDisponible(workerId, { fotoBase64: this.fotoCapturada, embedding: this.embeddingCapturado })
      .subscribe({
        next: () => {
          this.guardando = false;
          Swal.fire({ icon: 'success', title: 'Enrolamiento registrado', timer: 1800, showConfirmButton: false });
          this.cambiarTrabajador();
          this.cargarTrabajadores();
        },
        error: (err) => {
          this.guardando = false;
          this.cdr.detectChanges();
          Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: err?.error?.message ?? 'Intenta de nuevo.' });
        },
      });
  }
}
