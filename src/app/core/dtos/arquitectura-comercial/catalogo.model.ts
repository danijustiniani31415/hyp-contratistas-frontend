export type CatalogoTipo = 'partidas' | 'areas-responsables' | 'lugares-revision';

export interface CatalogoItemDTO {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface CreateCatalogoItemBody {
  nombre: string;
}

export interface UpdateCatalogoItemBody {
  nombre: string;
  activo: boolean;
}
