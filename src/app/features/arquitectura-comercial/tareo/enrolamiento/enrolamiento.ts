import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { CameraCapture } from '../../../../shared/components/camera-capture/camera-capture';
import { TareoService } from '../../../../core/services/arquitectura-comercial/tareo.service';
import { FaceRecognitionService } from '../../../../core/services/arquitectura-comercial/face-recognition.service';
import { AC_TAREO_TABS } from '../../shared/arquitectura-comercial-tabs';

@Component({
  selector: 'app-tareo-enrolamiento',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, CameraCapture],
  templateUrl: './enrolamiento.html',
  styleUrl: './enrolamiento.css',
})
export class TareoEnrolamiento {
  readonly tabs = AC_TAREO_TABS;

  @ViewChild(CameraCapture) camara!: CameraCapture;

  yaEnrolado = false;
  fechaEnrolamiento: string | null = null;
  cargandoEstado = true;
  modelosListos = false;
  cargandoModelos = true;

  fotoCapturada: string | null = null;
  embeddingCapturado: number[] | null = null;
  capturando = false;
  aceptaConsentimiento = false;
  guardando = false;

  constructor(
    private tareoService: TareoService,
    private faceService: FaceRecognitionService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.tareoService.getEnrolamientoEstado().subscribe({
      next: (r) => {
        this.yaEnrolado = r.enrolado;
        this.fechaEnrolamiento = r.fechaEnrolamiento;
        this.cargandoEstado = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoEstado = false; this.cdr.detectChanges(); },
    });

    this.faceService.cargarModelos().then((ok) => {
      this.modelosListos = ok;
      this.cargandoModelos = false;
      this.cdr.detectChanges();
    });
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
  }

  confirmar(): void {
    if (!this.fotoCapturada || !this.embeddingCapturado || !this.aceptaConsentimiento) return;

    this.guardando = true;
    this.tareoService
      .enrolar({ fotoBase64: this.fotoCapturada, embedding: this.embeddingCapturado })
      .subscribe({
        next: () => {
          this.guardando = false;
          Swal.fire({ icon: 'success', title: 'Enrolamiento registrado', timer: 1800, showConfirmButton: false })
            .then(() => this.router.navigateByUrl('/arquitectura-comercial/tareo/marcar'));
        },
        error: (err) => {
          this.guardando = false;
          this.cdr.detectChanges();
          Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: err?.error?.message ?? 'Intenta de nuevo.' });
        },
      });
  }
}
