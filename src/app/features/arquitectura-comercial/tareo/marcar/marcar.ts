import { Component, ChangeDetectorRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { CameraCapture } from '../../../../shared/components/camera-capture/camera-capture';
import { TareoService } from '../../../../core/services/arquitectura-comercial/tareo.service';
import { FaceRecognitionService } from '../../../../core/services/arquitectura-comercial/face-recognition.service';
import { AC_TAREO_TABS } from '../../shared/arquitectura-comercial-tabs';
import {
  TareoTipo,
  TareoMiTareoHoyDTO,
  TareoRegistroDTO,
  TAREO_TIPO_LABEL,
} from '../../../../core/dtos/arquitectura-comercial/tareo.model';

interface PasoTareo {
  tipo: TareoTipo;
  label: string;
  icono: string;
}

const PASOS: PasoTareo[] = [
  { tipo: 'INICIO_JORNADA', label: 'Inicio de jornada', icono: 'ti-sunrise' },
  { tipo: 'INICIO_ALMUERZO', label: 'Inicio de almuerzo', icono: 'ti-soup' },
  { tipo: 'RETORNO', label: 'Retorno de almuerzo', icono: 'ti-door-enter' },
  { tipo: 'FIN_JORNADA', label: 'Fin de jornada', icono: 'ti-moon' },
];

const INTERVALO_IDENTIFICACION_MS = 1500;

@Component({
  selector: 'app-tareo-marcar',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent, CameraCapture],
  templateUrl: './marcar.html',
  styleUrl: './marcar.css',
})
export class TareoMarcar implements OnDestroy {
  readonly tabs = AC_TAREO_TABS;
  readonly pasos = PASOS;
  readonly TAREO_TIPO_LABEL = TAREO_TIPO_LABEL;

  // La identidad de quien marca sale SIEMPRE del reconocimiento facial (1:N contra los enrolados
  // de Arquitectura Comercial) — el correo corporativo con el que se loguea es compartido entre
  // varios trabajadores, así que el login nunca identifica a la persona.
  camaraLista = false;
  identificando = false;
  workerId: number | null = null;
  nombreTrabajador: string | null = null;
  noReconocido = false;

  hoy: TareoMiTareoHoyDTO | null = null;
  cargandoHoy = false;

  procesando = false;
  gpsEstado: 'buscando' | 'ok' | 'error' = 'buscando';
  gpsCoords: GeolocationCoordinates | null = null;

  @ViewChild(CameraCapture) camara?: CameraCapture;

  private timerIdentificacion: ReturnType<typeof setInterval> | null = null;

  constructor(
    private tareoService: TareoService,
    private faceService: FaceRecognitionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.faceService.cargarModelos();
    this.pedirUbicacion();
  }

  ngOnDestroy(): void {
    this.detenerIdentificacionPeriodica();
  }

  onCamaraLista(): void {
    this.camaraLista = true;
    this.cdr.detectChanges();
    this.iniciarIdentificacionPeriodica();
  }

  private iniciarIdentificacionPeriodica(): void {
    this.detenerIdentificacionPeriodica();
    this.timerIdentificacion = setInterval(() => this.intentarIdentificar(), INTERVALO_IDENTIFICACION_MS);
  }

  private detenerIdentificacionPeriodica(): void {
    if (this.timerIdentificacion) {
      clearInterval(this.timerIdentificacion);
      this.timerIdentificacion = null;
    }
  }

  private async intentarIdentificar(): Promise<void> {
    if (this.identificando || this.workerId || !this.camara || !this.faceService.disponible()) return;

    this.identificando = true;
    const embedding = await this.faceService.calcularEmbedding(this.camara.videoElement);
    if (!embedding) {
      this.identificando = false;
      return;
    }

    this.tareoService.identificar(embedding).subscribe({
      next: (r) => {
        this.identificando = false;
        if (r.identificado && r.workerId) {
          this.detenerIdentificacionPeriodica();
          this.workerId = r.workerId;
          this.nombreTrabajador = r.nombre;
          this.noReconocido = false;
          this.cargarMiTareoHoy(r.workerId);
        }
        this.cdr.detectChanges();
      },
      error: () => { this.identificando = false; },
    });
  }

  reintentarIdentificacion(): void {
    this.workerId = null;
    this.nombreTrabajador = null;
    this.noReconocido = false;
    this.hoy = null;
    this.iniciarIdentificacionPeriodica();
  }

  private cargarMiTareoHoy(workerId: number): void {
    this.cargandoHoy = true;
    this.tareoService.getMiTareoHoy(workerId).subscribe({
      next: (r) => { this.hoy = r; this.cargandoHoy = false; this.cdr.detectChanges(); },
      error: () => { this.cargandoHoy = false; this.cdr.detectChanges(); },
    });
  }

  registroDe(tipo: TareoTipo): TareoRegistroDTO | null {
    if (!this.hoy) return null;
    switch (tipo) {
      case 'INICIO_JORNADA': return this.hoy.inicioJornada;
      case 'INICIO_ALMUERZO': return this.hoy.inicioAlmuerzo;
      case 'RETORNO': return this.hoy.retorno;
      case 'FIN_JORNADA': return this.hoy.finJornada;
    }
  }

  /** Solo el siguiente paso pendiente está habilitado — evita marcar fuera de orden por error. */
  esSiguientePendiente(tipo: TareoTipo): boolean {
    const idx = PASOS.findIndex((p) => p.tipo === tipo);
    for (let i = 0; i < idx; i++) {
      if (!this.registroDe(PASOS[i].tipo)) return false;
    }
    return !this.registroDe(tipo);
  }

  private pedirUbicacion(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.gpsEstado = 'error';
      this.cdr.detectChanges();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { this.gpsCoords = pos.coords; this.gpsEstado = 'ok'; this.cdr.detectChanges(); },
      () => { this.gpsEstado = 'error'; this.cdr.detectChanges(); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async marcarPaso(paso: PasoTareo): Promise<void> {
    if (!this.esSiguientePendiente(paso.tipo) || !this.camara || this.procesando || !this.workerId) return;
    this.procesando = true;
    this.cdr.detectChanges();

    const foto = this.camara.capturarFoto();
    if (!foto) {
      this.procesando = false;
      this.cdr.detectChanges();
      Swal.fire({ icon: 'error', title: 'No se pudo capturar la foto', text: 'Intenta de nuevo.' });
      return;
    }

    // El embedding se vuelve a calcular fresco en este instante — nunca se reusa el de la
    // identificación previa — porque el backend SIEMPRE re-identifica contra este embedding
    // (nunca confía en el workerId como tal, solo lo usa para mostrar nombre/pasos en pantalla).
    const embedding = await this.faceService.calcularEmbedding(this.camara.videoElement);

    const idempotencyKey = crypto.randomUUID();
    const tipo = paso.tipo;

    this.tareoService
      .marcar(
        {
          tipo,
          fotoBase64: foto,
          embedding,
          horaDispositivo: new Date().toISOString(),
          lat: this.gpsCoords?.latitude ?? null,
          lng: this.gpsCoords?.longitude ?? null,
          precisionMetros: this.gpsCoords?.accuracy ?? null,
        },
        idempotencyKey,
      )
      .subscribe({
        next: (registro) => {
          this.procesando = false;
          this.cdr.detectChanges();
          if (this.workerId) this.cargarMiTareoHoy(this.workerId);
          const ok = registro.estado === 'VERIFICADO';
          Swal.fire({
            icon: ok ? 'success' : 'info',
            title: `${TAREO_TIPO_LABEL[tipo]} registrado`,
            text: ok
              ? undefined
              : 'Tu hora quedó guardada. Un supervisor revisará el registro (' + (registro.motivoRevision ?? 'verificación pendiente') + ').',
            timer: ok ? 1800 : undefined,
            showConfirmButton: !ok,
          });
        },
        error: (err) => {
          this.procesando = false;
          this.cdr.detectChanges();
          if (err?.status === 422) {
            // El backend no pudo re-identificar el rostro al momento de guardar (cambió la luz,
            // se movió, etc.) — se reintenta la identificación desde cero, no se insiste con el
            // mismo workerId ya obtenido antes.
            this.reintentarIdentificacion();
          }
          Swal.fire({ icon: 'error', title: 'No se pudo registrar', text: err?.error?.message ?? 'Intenta de nuevo.' });
        },
      });
  }
}
