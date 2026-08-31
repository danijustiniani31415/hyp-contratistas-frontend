/**
 * Validación de correos compartida por las features del módulo de contratistas
 * (registro y gestión).
 *
 * Regla: el correo solo puede contener letras y números, además del '@', '.', '_' y '-'.
 * No se permiten otros símbolos como ' < > + etc., no puede empezar ni terminar con un
 * símbolo (debe empezar y terminar con una letra o número) ni tener símbolos consecutivos.
 * Debe tener exactamente un '@' y un dominio con al menos un punto.
 */
export const CONTRACTOR_EMAIL_REGEX =
  /^[A-Za-z0-9]+([._-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)+$/;

/** Devuelve true si el correo cumple con la regla (letras, números, '@', '.', '_' y '-'). */
export function isValidContractorEmail(email: string): boolean {
  return CONTRACTOR_EMAIL_REGEX.test(email.trim());
}
