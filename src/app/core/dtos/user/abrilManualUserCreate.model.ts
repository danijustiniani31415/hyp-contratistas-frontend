/**
 * Alta manual de un "usuario de Abril" que NO está registrado en workers
 * (casos especiales, p. ej. gerencia). El correo @abril.pe se escribe a mano y el
 * backend lo valida contra el directorio de Abril (Microsoft) antes de crearlo.
 */
export interface AbrilManualUserCreateDto {
  email: string;
  roleIds: number[];
}
