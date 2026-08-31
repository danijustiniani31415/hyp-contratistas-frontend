import Swal, { SweetAlertResult } from 'sweetalert2';

/**
 * Preset compartido de SweetAlert2 con la paleta UDP (DESIGN-VICTOR.md §6.9) —
 * evita repetir colores/tamaños sueltos en cada llamada a Swal.fire().
 */
const UDP_ACCENT: Record<'success' | 'error', string> = {
  success: '#1B6B3A',
  error: '#C0392B',
};

function fireUdp(
  icon: 'success' | 'error',
  title: string,
  text?: string,
): Promise<SweetAlertResult> {
  return Swal.fire({
    icon,
    title,
    text,
    confirmButtonColor: UDP_ACCENT[icon],
    customClass: {
      popup: 'swal-udp-popup',
      title: 'swal-udp-title',
      htmlContainer: 'swal-udp-text',
      icon: `swal-udp-icon-${icon}`,
    },
  });
}

export const swalUdpSuccess = (title: string, text?: string) => fireUdp('success', title, text);
export const swalUdpError = (title: string, text?: string) => fireUdp('error', title, text);
