export type DossierEstadoSemana =
  | 'Borrador'
  | 'Enviado'
  | 'Aprobado'
  | 'Rechazado'
  | 'Observado'
  | 'NoAplica';
export type DossierEstadoDocumento = 'Pendiente' | 'Subido' | 'NA' | 'Aprobado' | 'Observado';
export type DossierTipoDocumento =
  | 'Accidente'
  | 'EPP'
  | 'Estadisticas'
  | 'Capacitaciones'
  | 'PETAR'
  | 'ATS'
  | 'Charlas';

export const DOSSIER_TIPOS: DossierTipoDocumento[] = [
  'Accidente',
  'EPP',
  'Estadisticas',
  'Capacitaciones',
  'PETAR',
  'ATS',
  'Charlas',
];

export interface DossierSemanaDto {
  id: number;
  contributorId: number;
  empresaNombre: string | null;
  proyectoId: number;
  proyectoNombre: string | null;
  anio: number;
  numeroSemana: number;
  fechaInicio: string;
  fechaFin: string;
  estado: DossierEstadoSemana;
  obsRevisor: string | null;
  createdAt: string;
  totalDocs: number;
  docsSubidos: number;
  docsNa: number;
  docsAprobados: number;
}

export interface DossierArchivoDto {
  id: number;
  nombreArchivo: string;
  archivoPath: string;
  createdAt: string;
}

export interface DossierDocumentoDto {
  id: number;
  dossierId: number;
  tipoDoc: DossierTipoDocumento;
  nombreArchivo: string | null;
  archivoPath: string | null;
  estado: DossierEstadoDocumento;
  obsRevisor: string | null;
  createdAt: string;
  updatedAt: string | null;
  archivos: DossierArchivoDto[];
}

export interface DossierSemanaDetalleDto extends DossierSemanaDto {
  documentos: DossierDocumentoDto[];
}

export interface EnsureSemanaRequest {
  contributorId: number;
  proyectoId: number;
  numeroSemana: number;
  anio: number;
}

export interface RevisarDossierRequest {
  estado: string;
  obsRevisor?: string | null;
}

export interface RevisarDocumentoRequest {
  estado: string;
  obsRevisor?: string | null;
}
