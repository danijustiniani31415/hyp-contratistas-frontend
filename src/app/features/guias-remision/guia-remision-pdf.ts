import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { GuiaRemisionDetalle } from '../../core/services/guias-remision.service';

const MOTIVOS: Record<string, string> = {
  '04': 'Traslado entre establecimientos de la misma empresa',
  '02': 'Compra (devolución a proveedor)',
  '13': 'Otros',
};
const MODALIDADES: Record<string, string> = { '01': 'Público', '02': 'Privado' };

const fechaLima = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const soloFecha = (v: string): string => v.slice(0, 10).split('-').reverse().join('/');

/**
 * Representación impresa de la Guía de Remisión Electrónica Remitente (sin valor tributario:
 * lo que vale es el XML aceptado por SUNAT). Estructura calcada de la guía que emite el portal SOL.
 *
 * El QR lleva RUC | tipo | serie | número | fecha de emisión: SUNAT indica que para sustentar el
 * traslado basta con mostrar el QR o decir RUC, serie y número — por eso esos son sus datos.
 */
export async function generarPdfGuia(d: GuiaRemisionDetalle): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const M = 12;
  const numero = d.numero != null ? String(d.numero).padStart(8, '0') : '';
  const emitida = d.estado === 'ACEPTADA' || d.estado === 'ENVIADA';

  // ── Cabecera: emisor a la izquierda, recuadro con RUC / título / número a la derecha ──
  pdf.setFont('helvetica', 'bold').setFontSize(11);
  const emisor = pdf.splitTextToSize(d.emisorRazonSocial, 100);
  pdf.text(emisor, M, 20);

  pdf.setDrawColor(40).setLineWidth(0.4).rect(W - M - 78, 10, 78, 28);
  pdf.setFontSize(10).text(`RUC N° ${d.emisorRuc}`, W - M - 39, 17, { align: 'center' });
  pdf.setFontSize(10).text('GUÍA DE REMISIÓN ELECTRÓNICA', W - M - 39, 24, { align: 'center' });
  pdf.text('REMITENTE', W - M - 39, 30, { align: 'center' });
  pdf.setFontSize(11).text(`N° ${d.serie} - ${numero || 'SIN NÚMERO'}`, W - M - 39, 36, { align: 'center' });

  // ── Datos generales ──
  let y = 46;
  const fila = (etiqueta: string, valor: string) => {
    pdf.setFont('helvetica', 'bold').setFontSize(9).text(etiqueta, M, y);
    pdf.setFont('helvetica', 'normal');
    const lineas = pdf.splitTextToSize(valor || '—', W - M * 2 - 52);
    pdf.text(lineas, M + 52, y);
    y += Math.max(5, lineas.length * 4.2);
  };

  fila('Fecha y hora de emisión:', fechaLima(d.enviadoEn));
  fila('Fecha de inicio de traslado:', soloFecha(d.fechaTraslado));
  fila('Motivo de traslado:', MOTIVOS[d.motivoTraslado] ?? d.motivoTraslado);

  const partida = [d.almacenOrigenDireccion, d.almacenOrigenUbigeo ? `(ubigeo ${d.almacenOrigenUbigeo})` : '']
    .filter(Boolean).join(' ');
  const llegada = d.almacenDestinoNombre
    ? [d.almacenDestinoDireccion, d.almacenDestinoUbigeo ? `(ubigeo ${d.almacenDestinoUbigeo})` : '']
        .filter(Boolean).join(' ')
    : '—';
  fila('Punto de partida:', partida);
  fila('Punto de llegada:', llegada);

  const destinatario = d.almacenDestinoNombre
    ? `${d.emisorRazonSocial} - RUC N° ${d.emisorRuc}`
    : `${d.destinatarioRazonSocial ?? '—'}${d.destinatarioRuc ? ` - RUC N° ${d.destinatarioRuc}` : ''}`;
  fila('Datos del destinatario:', destinatario);

  // ── Bienes por transportar ──
  y += 2;
  pdf.setFont('helvetica', 'bold').setFontSize(10).text('Bienes por transportar:', M, y);
  autoTable(pdf, {
    startY: y + 2,
    margin: { left: M, right: M },
    head: [['N°', 'Descripción detallada', 'Unidad de medida', 'Cantidad']],
    body: d.items.map((it, i) => {
      const partes = [it.productoNombre];
      if (it.talla && it.talla !== '—') partes.push(`TALLA ${it.talla}`);
      if (it.color && it.color !== '—') partes.push(`COLOR ${it.color}`);
      if (it.esBienTercero) partes.push('BIEN DE TERCERO');
      return [String(i + 1), partes.join(' - '), it.unidadMedida, it.cantidad.toFixed(2)];
    }),
    styles: { fontSize: 8.5, cellPadding: 1.6 },
    headStyles: { fillColor: [40, 40, 40] },
    columnStyles: { 0: { cellWidth: 12 }, 2: { cellWidth: 32 }, 3: { cellWidth: 24, halign: 'right' } },
  });
  y = ((pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 7;

  // ── Datos del traslado ──
  pdf.setFont('helvetica', 'bold').setFontSize(10).text('Datos del traslado:', M, y);
  y += 6;
  fila('Modalidad de traslado:', MODALIDADES[d.modalidadTraslado] ?? d.modalidadTraslado);
  fila('Peso bruto total de la carga:', `${d.pesoBrutoTotal} ${d.pesoBrutoUnidad}`);
  if (d.numBultos) fila('Número de bultos:', String(d.numBultos));

  if (d.modalidadTraslado === '01') {
    fila('Transportista:', `${d.transportistaRazonSocial ?? '—'}${d.transportistaRuc ? ` - RUC N° ${d.transportistaRuc}` : ''}`);
  } else {
    fila('Número de placa:', d.vehiculoPlaca ?? '—');
    // Guías nuevas traen apellidos aparte; las antiguas traen "Apellidos Nombres" juntos en conductorNombres.
    const conductor = d.conductorApellidos ? `${d.conductorApellidos} ${d.conductorNombres ?? ''}`.trim() : (d.conductorNombres ?? '—');
    fila('Conductor principal:', `${conductor}${d.conductorDni ? ` - DNI N° ${d.conductorDni}` : ''}`);
    fila('Número de licencia de conducir:', d.conductorLicencia ?? '—');
  }
  if (d.observacion) fila('Observaciones:', d.observacion);

  // ── QR + constancia ──
  y = Math.max(y + 6, 235);
  if (numero && emitida) {
    const emision = d.enviadoEn ? new Date(d.enviadoEn).toLocaleDateString('en-CA', { timeZone: 'America/Lima' }) : '';
    const qr = await QRCode.toDataURL(`${d.emisorRuc}|09|${d.serie}|${numero}|${emision}`, { margin: 1, width: 300 });
    pdf.addImage(qr, 'PNG', M, y, 32, 32);
  }
  pdf.setFont('helvetica', 'normal').setFontSize(8);
  const constancia =
    d.estado === 'ACEPTADA'
      ? `Estado SUNAT: ACEPTADA${d.cdrCodigoRespuesta ? ` (código ${d.cdrCodigoRespuesta})` : ''}.`
      : `Estado SUNAT: ${d.estado}. Esta guía todavía no es válida para el traslado.`;
  pdf.text(constancia, M + 36, y + 6);
  pdf.text(
    pdf.splitTextToSize(
      'Esta es una representación impresa sin valor tributario de la Guía de Remisión Electrónica. ' +
        'Puede verificarla con el RUC del emisor, la serie y el número, o utilizando su clave SOL.',
      W - M * 2 - 40,
    ),
    M + 36,
    y + 12,
  );

  pdf.save(`${d.emisorRuc}-09-${d.serie}-${numero || d.id}.pdf`);
}
