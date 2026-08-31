export interface PetListItemDto {
  id: number;
  nombre: string;
  codigo?: string;
  activo: boolean;
  totalPasos: number;
  createdAt: string;
}

export interface PetPasoDto {
  id: number;
  parentId?: number | null;
  tipo: string; // subtitulo | paso | letra | guion
  descripcion: string;
  imagenUrl?: string;
  orden: number;
}

// Secciones narrativas: un solo bloque de texto cada una (no árbol). Procedimiento
// y Responsabilidades sí tienen estructura real y van aparte, en árbol.
export type PetSeccionTexto = 'introduccion' | 'alcance' | 'objetivo' | 'definiciones' | 'restricciones';

export interface PetItemSeleccionadoDto {
  id: number;
  grupo: string; // marco_legal | epp | recurso
  tipo?: string | null;
  catalogoItemId?: number | null;
  descripcion: string;
  esPersonalizado: boolean;
  orden: number;
}

export interface PetAnexoDto {
  id: number;
  nombre: string;
  archivoUrl: string;
  orden: number;
}

export type PetRolFirma = 'elaborado' | 'revisado' | 'aprobado';

export interface PetFirmaDto {
  rol: string;
  nombre?: string | null;
  cargo?: string | null;
  fecha?: string | null;
  firmaUrl?: string | null;
}

export interface ActualizarFirmaRequest {
  nombre?: string | null;
  cargo?: string | null;
  fecha?: string | null;
}

export interface PetDetalleDto {
  id: number;
  nombre: string;
  codigo?: string;
  sharepointUrl?: string;
  activo: boolean;
  pasos: PetPasoDto[];
  responsabilidades: PetPasoDto[];
  seccionesTexto: Record<PetSeccionTexto, string>;
  marcoLegal: PetItemSeleccionadoDto[];
  epp: PetItemSeleccionadoDto[];
  recursos: PetItemSeleccionadoDto[];
  anexos: PetAnexoDto[];
  firmas: Record<PetRolFirma, PetFirmaDto>;
}

export interface CrearPetRequest {
  nombre: string;
  codigo?: string;
  sharepointUrl?: string;
}

export interface ActualizarPetRequest {
  nombre: string;
  codigo?: string;
  sharepointUrl?: string;
  activo: boolean;
}

export interface CrearPetPasoRequest {
  descripcion: string;
  seccion?: string; // procedimiento (default) | responsabilidades — únicas dos secciones en árbol
  parentId?: number | null;
  tipo?: string; // subtitulo | paso | letra | guion — default 'paso'
  posicion?: number;
}

export interface ActualizarPetPasoRequest {
  descripcion: string;
  tipo: string;
}

export interface ReordenarPasosRequest {
  seccion?: string;
  parentId?: number | null;
  pasoIds: number[];
}

// ── Catálogo (Marco Legal / EPP / Recursos) ──────────────────────────────────────

export interface CatalogoItemDto {
  id: number;
  grupo: string;
  tipo?: string | null;
  descripcion: string;
  activo: boolean;
  orden: number;
}

export interface CrearCatalogoItemRequest {
  grupo: string;
  tipo?: string | null;
  descripcion: string;
}

export interface SeleccionarItemCatalogoRequest {
  grupo: string;
  tipo?: string | null;
  catalogoItemId: number;
}

export interface AgregarItemPersonalizadoRequest {
  grupo: string;
  tipo?: string | null;
  descripcion: string;
  agregarAlCatalogoGlobal: boolean;
}

// "indice" = posición original del párrafo en el Word (identificador estable).
// "parentIndice" referencia el "indice" de otro elemento de la MISMA respuesta —
// permite reconstruir subtítulos/jerarquía detectados automáticamente.
export interface ImportPasoPreviewDto {
  indice: number;
  parentIndice?: number | null;
  tipo: string; // subtitulo | paso | letra | guion
  texto: string;
  imagenBase64?: string;
}

export interface ImportParrafoDto {
  indice: number;
  parentIndice?: number | null;
  tipo: string;
  texto: string;
  imagenBase64?: string;
}

export interface PetsImportPreviewDto {
  seccionEncontrada: boolean;
  // Procedimiento y Responsabilidades — detectadas y ya armadas en árbol.
  seccionesArbol: Record<string, ImportPasoPreviewDto[]>;
  // Introducción/Alcance/Objetivo/Definiciones/Restricciones — texto ya concatenado
  // por sección, editable antes de confirmar.
  seccionesTexto: Record<string, string>;
  // Respaldo cuando no se detecta NINGÚN título de sección conocido.
  todosLosParrafos: ImportParrafoDto[];
}

export interface ImportPasoConfirmDto {
  indice: number;
  parentIndice?: number | null;
  tipo: string;
  texto: string;
  imagenBase64?: string;
}

export interface ConfirmarImportacionRequest {
  seccionesArbol: Record<string, ImportPasoConfirmDto[]>;
  seccionesTexto: Record<string, string>;
  // true: borra la sección en árbol vigente antes de insertar (reimportar una
  // versión corregida). false/omitido: agrega al final, como hasta ahora. No aplica
  // a seccionesTexto: esas siempre se sobrescriben (es un solo bloque).
  reemplazar?: boolean;
}
