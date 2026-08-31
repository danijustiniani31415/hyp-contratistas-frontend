import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { UserListItemDto } from '../../../../../core/dtos/user/userListItem.model';

/**
 * Categoría de trabajador para el filtro de la tabla de usuarios. El backend la resuelve por
 * `workers.puesto_id → puesto.categoria_id` (la ficha del trabajador ya no guarda la categoría)
 * y solo devuelve las categorías que tienen al menos un usuario detrás, para que ninguna opción
 * del desplegable deje la tabla vacía.
 */
export interface UserCategoriaOptionDto {
  categoriaId: number;
  nombre: string;
}

/**
 * Respuesta de la carga inicial de la pantalla: opciones del filtro + primera página de la
 * tabla en una sola petición. Al cambiar búsqueda, filtro o página se llama al endpoint
 * paginado, que ya no reenvía las opciones.
 */
export interface UserListInitialDto {
  categorias: UserCategoriaOptionDto[];
  users: PagedResponseDTO<UserListItemDto>;
}
