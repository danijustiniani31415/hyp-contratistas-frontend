export type TipoEstructura = 'SUBESTRUCTURA' | 'SUPERESTRUCTURA';

export interface SectorConfigDTO {
  id?: number | null;
  nombre: string;
  orden?: number;
}

export interface NivelConfigDTO {
  id?: number | null;
  nombre: string;
  orden: number;
  tipoEstructura: TipoEstructura | null;
  /**
   * En las respuestas de lectura (GET) incluye tanto los sectores exclusivos de este nivel
   * como los sectores compartidos de la zona (repetidos bajo cada nivel). Al guardar, este
   * grid solo debe usarse tal cual para consumo de lectura (Carga Diaria) — la separación
   * exclusivo/compartido para el payload de guardado vive en ZonaUpdateDto.
   */
  sectores: SectorConfigDTO[];
}

export interface ZonaConfigDTO {
  id?: number | null;
  nombre: string;
  orden?: number;
  niveles: NivelConfigDTO[];
}

export interface FaseConfigDTO {
  id: number;
  nombre: string;
  fechaInicio: string | null;
  fechaFinMeta: string | null;
}

export interface ResponsableBimWorkerDTO {
  id: number;
  apellidoNombre: string;
}

export interface PlaneamientoBimConfigDTO {
  projectId?: number;
  responsableId: number | null;
  responsableNombre?: string | null;
  metaPpc: number | null;
  zonas: ZonaConfigDTO[];
  fases: FaseConfigDTO[];
}

// ── Payload de guardado (PUT /configuracion/{projectId}) ──────────────────

export interface NivelUpdateDto {
  id: number | null;
  nombre: string;
  orden: number;
  tipoEstructura: TipoEstructura | null;
  /** Sectores EXCLUSIVOS de este nivel — no incluye los compartidos de la zona. */
  sectores: SectorConfigDTO[];
}

export interface ZonaUpdateDto {
  id: number | null;
  nombre: string;
  orden: number;
  niveles: NivelUpdateDto[];
  /** Sectores que aplican a TODOS los niveles de la zona — se envían una sola vez acá. */
  sectoresCompartidos: SectorConfigDTO[];
}

export interface PlaneamientoBimConfigUpdateDto {
  responsableId: number | null;
  // Meta PPC ya no se envía: es un estándar fijo administrado por el backend (Fase A).
  zonas: ZonaUpdateDto[];
  fases: { id: number; fechaInicio: string | null; fechaFinMeta: string | null }[];
}
