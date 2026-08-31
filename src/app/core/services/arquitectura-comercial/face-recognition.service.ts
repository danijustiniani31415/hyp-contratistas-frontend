import { Injectable } from '@angular/core';

/** Umbral de distancia euclidiana entre embeddings (128-d) de face-api.js. Por debajo de esto se
 * considera la misma persona; es el valor que recomienda la propia librería para faceRecognitionNet. */
const DISTANCIA_MATCH = 0.6;

const MODELS_URL = '/models';

/**
 * Envoltorio sobre face-api.js para detección/reconocimiento facial 1:1, corriendo 100% en el
 * navegador (sin costo, sin mandar la imagen cruda a un servicio externo).
 *
 * Diseño "a prueba de errores": si los modelos no cargan (sin conexión, archivo faltante, browser
 * viejo sin WebGL) NINGÚN flujo de marcado debe bloquearse — este servicio expone `disponible()` y
 * los llamadores tratan un resultado null/false como "no se pudo verificar", no como "rechazado".
 */
@Injectable({ providedIn: 'root' })
export class FaceRecognitionService {
  private cargando: Promise<boolean> | null = null;
  private listo = false;

  /** Carga los modelos una sola vez (se cachea la promesa). Nunca lanza — devuelve false si falla. */
  async cargarModelos(): Promise<boolean> {
    if (this.listo) return true;
    if (this.cargando) return this.cargando;

    this.cargando = (async () => {
      try {
        const faceapi = await import('face-api.js');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);
        this.listo = true;
        return true;
      } catch (err) {
        console.error('[Tareo] No se pudieron cargar los modelos de reconocimiento facial', err);
        this.listo = false;
        return false;
      }
    })();

    return this.cargando;
  }

  disponible(): boolean {
    return this.listo;
  }

  /** Detecta UNA cara en el video/imagen y devuelve su embedding (128 floats), o null si no
   * detectó cara / los modelos no están listos. Nunca lanza. */
  async calcularEmbedding(fuente: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<number[] | null> {
    if (!this.listo) {
      const ok = await this.cargarModelos();
      if (!ok) return null;
    }
    try {
      const faceapi = await import('face-api.js');
      // inputSize chico (default de la librería es 416) — para un reconocimiento en vivo, cada
      // punto de tamaño extra es tiempo de cómputo que no aporta nada; con la persona a menos de
      // ~1m de la cámara 224 detecta igual de bien y es notablemente más rápido.
      const deteccion = await faceapi
        .detectSingleFace(fuente, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!deteccion) return null;
      return Array.from(deteccion.descriptor);
    } catch (err) {
      console.error('[Tareo] Error calculando embedding facial', err);
      return null;
    }
  }

  /** Similitud 0-1 (1 = idéntico) entre dos embeddings, o null si no se puede calcular. */
  compararEmbeddings(a: number[] | null, b: number[] | null): number | null {
    if (!a || !b || a.length !== b.length || a.length === 0) return null;
    let sumaCuadrados = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sumaCuadrados += diff * diff;
    }
    const distancia = Math.sqrt(sumaCuadrados);
    // Normaliza a un score 0-1 donde >= match típico (distancia 0.6) cae alrededor de 0.5-0.6
    const score = Math.max(0, 1 - distancia / (DISTANCIA_MATCH * 2));
    return Math.round(score * 1000) / 1000;
  }

  esMatch(distanciaOScore: number | null): boolean {
    return distanciaOScore !== null && distanciaOScore >= 0.5;
  }
}
