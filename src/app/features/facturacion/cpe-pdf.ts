import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { CpeDetalle } from '../../core/services/facturacion.service';

const TITULOS: Record<string, string> = {
  '01': 'FACTURA ELECTRÓNICA',
  '07': 'NOTA DE CRÉDITO ELECTRÓNICA',
  '08': 'NOTA DE DÉBITO ELECTRÓNICA',
};

const NOMBRE_DOC_CLIENTE: Record<string, string> = { '6': 'RUC', '1': 'DNI', '4': 'CE', '7': 'PASAPORTE', '0': 'S/D' };

const soloFecha = (v: string): string => v.slice(0, 10).split('-').reverse().join('/');
const dinero = (n: number, dec = 2): string => n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });

/**
 * Representación impresa del comprobante electrónico. Lo que tiene valor tributario es el XML aceptado por SUNAT;
 * el PDF es su copia legible. El QR sigue el formato de SUNAT: RUC | tipo | serie | número | IGV | total | fecha |
 * tipo y número de documento del cliente. Un borrador o un comprobante de pruebas lleva marca de agua.
 */
export async function generarPdfCpe(d: CpeDetalle): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 12;
  const numero = d.numero != null ? String(d.numero).padStart(8, '0') : 'SIN NÚMERO';
  const simbolo = d.moneda === 'USD' ? 'US$' : 'S/';

  // ── Cabecera ──
  pdf.setFont('helvetica', 'bold').setFontSize(12);
  pdf.text(pdf.splitTextToSize(d.emisorRazonSocial || '', 110), M, 18);
  pdf.setFont('helvetica', 'normal').setFontSize(9);
  if (d.emisorDireccion) pdf.text(pdf.splitTextToSize(d.emisorDireccion, 110), M, 28);

  pdf.setDrawColor(40).setLineWidth(0.4).rect(W - M - 78, 10, 78, 30);
  pdf.setFont('helvetica', 'bold').setFontSize(10);
  pdf.text(`RUC N° ${d.emisorRuc}`, W - M - 39, 17, { align: 'center' });
  pdf.text(TITULOS[d.tipoDocumento] ?? 'COMPROBANTE', W - M - 39, 24, { align: 'center' });
  pdf.setFontSize(11).text(`${d.serie} - ${numero}`, W - M - 39, 33, { align: 'center' });

  // ── Datos del comprobante ──
  let y = 50;
  const fila = (etiqueta: string, valor: string | null | undefined) => {
    if (!valor) return;
    pdf.setFont('helvetica', 'bold').setFontSize(9).text(etiqueta, M, y);
    pdf.setFont('helvetica', 'normal');
    const lineas = pdf.splitTextToSize(valor, W - M * 2 - 42);
    pdf.text(lineas, M + 42, y);
    y += 5 * lineas.length;
  };
  fila('Fecha de emisión:', soloFecha(d.fechaEmision));
  if (d.fechaVencimiento) fila('Fecha de vencimiento:', soloFecha(d.fechaVencimiento));
  fila('Cliente:', d.clienteRazon);
  fila(`${NOMBRE_DOC_CLIENTE[d.clienteTipoDoc] ?? 'Documento'}:`, d.clienteNumeroDoc);
  fila('Dirección:', d.clienteDireccion);
  fila('Moneda:', d.moneda === 'USD' ? 'DÓLARES AMERICANOS' : 'SOLES');
  fila('Forma de pago:', d.formaPago === 'CREDITO' ? 'Crédito' : 'Contado');
  fila('Orden de compra:', d.ordenCompraRef);
  fila('Guía de remisión:', d.guiaRef);
  if (d.contratoCodigo) fila('Contrato:', d.contratoCodigo);
  if (d.refIdentificador) fila('Documento que modifica:', d.refIdentificador);
  if (d.motivoDescripcion) fila('Motivo:', d.motivoDescripcion);
  fila('Observación:', d.observacion);

  // ── Líneas ──
  autoTable(pdf, {
    startY: y + 3,
    head: [['Cant.', 'Un.', 'Descripción', 'Valor unit.', 'Valor venta']],
    body: d.items.map((i) => [dinero(i.cantidad, 2), i.unidadMedida, i.descripcion, dinero(i.valorUnitario, 4), dinero(i.valorVenta)]),
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    headStyles: { fillColor: [30, 58, 95] },
    columnStyles: { 0: { halign: 'right', cellWidth: 18 }, 1: { cellWidth: 14 }, 3: { halign: 'right', cellWidth: 28 }, 4: { halign: 'right', cellWidth: 28 } },
    margin: { left: M, right: M },
  });
  // @ts-expect-error lastAutoTable lo agrega el plugin
  y = (pdf.lastAutoTable?.finalY ?? y) + 6;

  // ── Totales ──
  const total = (etiqueta: string, valor: number, negrita = false) => {
    pdf.setFont('helvetica', negrita ? 'bold' : 'normal').setFontSize(negrita ? 10 : 9);
    pdf.text(etiqueta, W - M - 62, y);
    pdf.text(`${simbolo} ${dinero(valor)}`, W - M, y, { align: 'right' });
    y += 5;
  };
  if (d.totalGravado) total('Op. gravadas', d.totalGravado);
  if (d.totalExonerado) total('Op. exoneradas', d.totalExonerado);
  if (d.totalInafecto) total('Op. inafectas', d.totalInafecto);
  if (d.totalExportacion) total('Exportación', d.totalExportacion);
  total('IGV 18%', d.igv);
  total('TOTAL', d.total, true);

  y += 2;
  pdf.setFont('helvetica', 'bold').setFontSize(9).text(d.totalEnLetras, M, y);
  y += 6;

  if (d.detraccionMonto) {
    pdf.setFont('helvetica', 'normal').setFontSize(8.5);
    const t = `Operación sujeta al Sistema de Pago de Obligaciones Tributarias (detracción ${d.detraccionPorcentaje}%): depositar S/ ${dinero(d.detraccionMonto, 0)} en la cuenta ${d.detraccionCuenta ?? ''} del Banco de la Nación.`;
    const l = pdf.splitTextToSize(t, W - M * 2);
    pdf.text(l, M, y);
    y += 4.5 * l.length + 2;
  }
  if (d.formaPago === 'CREDITO' && d.cuotas.length) {
    pdf.setFont('helvetica', 'normal').setFontSize(8.5);
    pdf.text('Cuotas: ' + d.cuotas.map((c, i) => `${i + 1}) ${simbolo} ${dinero(c.monto)} el ${soloFecha(c.fecha)}`).join('  ·  '), M, y, { maxWidth: W - M * 2 });
    y += 7;
  }

  // ── QR y constancia ──
  if (y > H - 55) {
    pdf.addPage();
    y = 20;
  }
  const qrTexto = [d.emisorRuc, d.tipoDocumento, d.serie, d.numero ?? '', dinero(d.igv).replace(/,/g, ''), dinero(d.total).replace(/,/g, ''), d.fechaEmision.slice(0, 10), d.clienteTipoDoc, d.clienteNumeroDoc, ''].join('|');
  const qr = await QRCode.toDataURL(qrTexto, { margin: 1, width: 300 });
  pdf.addImage(qr, 'PNG', M, y, 32, 32);
  pdf.setFont('helvetica', 'normal').setFontSize(8);
  pdf.text('Representación impresa del comprobante electrónico.', M + 36, y + 6);
  pdf.text('Puede consultarse en el portal de SUNAT con el RUC, serie y número.', M + 36, y + 11);
  if (d.xmlHashFirma) pdf.text(`Resumen de firma digital: ${d.xmlHashFirma}`, M + 36, y + 16, { maxWidth: W - M * 2 - 36 });
  if (d.sunatDescripcion) pdf.text(`SUNAT: ${d.sunatDescripcion}`, M + 36, y + 24, { maxWidth: W - M * 2 - 36 });

  // ── Marca de agua ──
  const marca = d.estado === 'BORRADOR' ? 'BORRADOR' : d.ambiente !== 'Produccion' ? 'PRUEBA - SIN VALOR TRIBUTARIO' : d.estado === 'ANULADO' ? 'ANULADO' : null;
  if (marca) {
    pdf.setTextColor(210).setFont('helvetica', 'bold').setFontSize(marca.length > 12 ? 30 : 60);
    pdf.text(marca, W / 2, H / 2, { align: 'center', angle: 35 });
    pdf.setTextColor(0);
  }

  pdf.save(`${d.identificador}.pdf`);
}
