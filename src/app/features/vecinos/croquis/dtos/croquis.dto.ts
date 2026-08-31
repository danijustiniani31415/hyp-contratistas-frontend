/** Un proyecto con su croquis asignado (si tiene), para la pantalla de asignación. */
export interface ProjectCroquisItemDTO {
  projectId: number;
  projectDescription: string;
  projectCroquisId?: number | null;
  imageUrl?: string | null;
  originalFileName?: string | null;
  updatedDateTime?: string | null;
}

/** Un lote dibujado sobre el croquis. `puntos` en coordenadas relativas (0–1) a la imagen. */
export interface CroquisLoteDTO {
  projectCroquisLoteId?: number | null;
  numeroLote: string;
  puntos: number[][];
}
