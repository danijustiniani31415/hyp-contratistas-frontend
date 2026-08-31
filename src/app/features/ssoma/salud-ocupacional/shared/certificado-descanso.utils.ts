/**
 * Los certificados de un descanso médico viven en la carpeta de SharePoint configurada en BD
 * (tabla `ss_descanso_carpeta`). No se enlaza el `webUrl` de SharePoint directo porque ese link
 * solo abre para quien ya tiene sesión de Microsoft 365 en el navegador — el trabajador que
 * subió su descanso desde Mi Salud normalmente no la tiene. En su lugar se pide el archivo al
 * backend (que lo baja de Graph con su token de app) y se abre el blob resultante.
 */
export function abrirCertificado(blob: Blob, nombre?: string | null): void {
  const url = URL.createObjectURL(blob);

  // Abrir en pestaña para poder verlo (PDF/imagen). Si el navegador bloquea el popup —pasa
  // cuando se llama después de la respuesta HTTP y no dentro del click— se cae a descargarlo.
  const ventana = window.open(url, '_blank');
  if (!ventana) {
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre || 'certificado';
    a.click();
  }

  // El blob se libera con holgura: revocarlo de inmediato cancela la carga de la pestaña.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
