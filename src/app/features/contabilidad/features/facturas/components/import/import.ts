import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { InvoiceService } from '../../services/invoice.service';

/** Registro parseado del Excel (todos los campos se guardan; en pantalla solo se resume). */
interface ParsedRow {
  paymentOrderNumber: string;
  description: string;
  proveedorName: string;
  ruc: string;
  documentType: string;
  serie: string;
  correlativo: string;
  issueDate: string | null;
  currencyCode: string | null;
  total: number;
  authorizedAmount: number | null;
  observation: string;
  abrilName: string;
  file: File | null;
  displayFileName: string | null;
}

@Component({
  selector: 'app-factura-import',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, FileSelector],
  templateUrl: './import.html',
})
export class FacturaImport {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  excelName = '';
  rows: ParsedRow[] = [];

  // Filtros del resumen
  fNumber = '';
  fRazon = '';
  fRuc = '';
  fOnlyMissing = false;

  /** Fila resaltada mientras se arrastra un archivo sobre ella. */
  dragRow: ParsedRow | null = null;

  constructor(
    private service: InvoiceService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  get matchedCount(): number {
    return this.rows.filter((r) => r.file).length;
  }

  /** Registros visibles según los filtros del resumen. */
  get filteredRows(): ParsedRow[] {
    const num = this.fNumber.trim().toLowerCase();
    const raz = this.fRazon.trim().toLowerCase();
    const ruc = this.fRuc.trim().toLowerCase();
    return this.rows.filter((r) => {
      if (this.fOnlyMissing && r.file) return false;
      if (num && !this.invoiceNumber(r).toLowerCase().includes(num)) return false;
      if (raz && !r.proveedorName.toLowerCase().includes(raz)) return false;
      if (ruc && !r.ruc.toLowerCase().includes(ruc)) return false;
      return true;
    });
  }

  // ── Paso 1: Excel ──────────────────────────────────────────────────
  onExcelSelected(sel: SelectedFile): void {
    const file = sel.file;
    this.excelName = file.name;
    this.loaderService.show();
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        this.rows = this.parseWorkbook(wb);
        if (this.rows.length === 0) {
          Swal.fire({ icon: 'warning', title: 'Sin registros', text: 'El Excel no tiene filas de datos.' });
        }
      } catch {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo leer el Excel.' });
      } finally {
        this.loaderService.hide();
        this.cdr.detectChanges();
      }
    };
    reader.onerror = () => {
      this.loaderService.hide();
      this.cdr.detectChanges();
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo leer el archivo.' });
    };
    reader.readAsArrayBuffer(file);
  }

  private parseWorkbook(wb: XLSX.WorkBook): ParsedRow[] {
    const out: ParsedRow[] = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false, defval: '' });
      // Buscar la fila de encabezado (contiene "N° Documento").
      const headerIdx = rows.findIndex((r) => r.some((c) => String(c).toUpperCase().includes('DOCUMENTO')));
      if (headerIdx < 0) continue;
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r.some((c) => String(c).trim() !== '')) continue;
        const [serie, correlativo] = this.parseDocNumber(String(r[4] ?? ''));
        if (!serie && !correlativo) continue;
        out.push({
          paymentOrderNumber: String(r[0] ?? '').trim(),
          description: String(r[1] ?? '').trim(),
          proveedorName: String(r[2] ?? '').trim(),
          ruc: '', // El Excel aún no trae RUC; se llenará cuando exista la columna.
          documentType: String(r[3] ?? '').trim(),
          serie,
          correlativo,
          issueDate: this.parseDate(String(r[5] ?? '')),
          currencyCode: this.parseCurrency(String(r[6] ?? '')),
          total: this.parseNumber(String(r[7] ?? '')),
          authorizedAmount: r[8] != null && String(r[8]).trim() !== '' ? this.parseNumber(String(r[8])) : null,
          observation: String(r[9] ?? '').trim(),
          abrilName: sheetName.trim(),
          file: null,
          displayFileName: null,
        });
      }
    }
    return out;
  }

  /** "F F001-00042053" → ["F001","00042053"]; "DVG 0000000065" → ["","0000000065"]. */
  private parseDocNumber(raw: string): [string, string] {
    const tokens = raw.trim().split(/\s+/);
    const rest = tokens.length > 1 ? tokens.slice(1).join(' ') : tokens[0] ?? '';
    if (rest.includes('-')) {
      const idx = rest.indexOf('-');
      return [rest.slice(0, idx).trim(), rest.slice(idx + 1).trim()];
    }
    return ['', rest.trim()];
  }

  /** "08/05/2026" → "2026-05-08". */
  private parseDate(raw: string): string | null {
    const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  private parseCurrency(raw: string): string | null {
    const v = raw.trim().toUpperCase();
    if (v.startsWith('U') || v.includes('$')) return 'USD';
    if (v.startsWith('S')) return 'PEN';
    return null;
  }

  private parseNumber(raw: string): number {
    const n = parseFloat(raw.replace(/,/g, '').trim());
    return isNaN(n) ? 0 : n;
  }

  invoiceNumber(r: ParsedRow): string {
    return r.serie ? `${r.serie}-${r.correlativo}` : r.correlativo;
  }

  // ── Paso 2: archivos arrastrados (auto-match por nombre) ───────────
  onFilesSelected(sel: SelectedFile): void {
    this.matchFile(sel.file);
  }

  /** Normaliza para comparar (sin acentos, espacios ni signos, mayúsculas). */
  private norm(s: string): string {
    return s
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Asocia un archivo a un registro. El nombre puede ser:
   *  - "numerofactura"            (ej. F001-00042053)
   *  - "identificador_numerofactura" (identificador = RUC o razón social)
   * El número se compara EXACTO contra serie-correlativo o el correlativo.
   * Si el número coincide con 2+ registros se exige el identificador (razón social).
   */
  private matchFile(file: File): void {
    const baseName = file.name.replace(/\.[^.]+$/, '').trim();
    const parts = baseName.split('_');
    const numberPart = (parts[parts.length - 1] ?? '').trim();
    const identifier = parts.slice(0, -1).join(' ').trim();

    const numNorm = this.norm(numberPart);
    if (!numNorm) {
      this.warn(`"${file.name}" no contiene un N° de factura reconocible.`);
      return;
    }

    // Candidatos: el número (exacto) = serie-correlativo o = correlativo.
    let candidates = this.rows.filter(
      (r) => this.norm(this.invoiceNumber(r)) === numNorm || this.norm(r.correlativo) === numNorm,
    );

    if (candidates.length === 0) {
      this.warn(`No se encontró ninguna factura con el número "${numberPart}".`);
      return;
    }

    if (candidates.length > 1) {
      if (!identifier) {
        this.warn(
          `Hay ${candidates.length} facturas con el número "${numberPart}". ` +
          `Especifica el RUC o la razón social en el nombre del archivo, ej. "razonsocial_${numberPart}".`,
        );
        return;
      }
      const idNorm = this.norm(identifier);
      const byId = candidates.filter(
        (r) => this.norm(r.proveedorName).includes(idNorm) || idNorm.includes(this.norm(r.proveedorName)),
      );
      if (byId.length === 1) {
        candidates = byId;
      } else if (byId.length === 0) {
        this.warn(`No hay una factura "${numberPart}" cuya razón social coincida con "${identifier}".`);
        return;
      } else {
        this.warn(`Sigue habiendo ${byId.length} coincidencias para "${file.name}". Especifica mejor la razón social.`);
        return;
      }
    }

    const row = candidates[0];
    if (row.file) {
      this.warn(`La factura "${this.invoiceNumber(row)}" ya tenía un documento; se reemplazó por "${file.name}".`);
    }
    this.assignRowFile(row, file);
  }

  /** Carga manual: elige un archivo directamente en un registro. */
  onRowFileInput(r: ParsedRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.assignRowFile(r, file);
    input.value = '';
  }

  // Arrastrar y soltar un archivo directamente sobre un registro.
  onRowDragOver(r: ParsedRow, event: DragEvent): void {
    event.preventDefault();
    this.dragRow = r;
  }

  onRowDragLeave(r: ParsedRow, event: DragEvent): void {
    event.preventDefault();
    if (this.dragRow === r) this.dragRow = null;
  }

  onRowDrop(r: ParsedRow, event: DragEvent): void {
    event.preventDefault();
    this.dragRow = null;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.assignRowFile(r, file);
  }

  private assignRowFile(r: ParsedRow, file: File): void {
    r.file = file;
    r.displayFileName = file.name;
  }

  removeFile(r: ParsedRow): void {
    r.file = null;
    r.displayFileName = null;
  }

  private warn(text: string): void {
    Swal.fire({ icon: 'info', title: 'Atención', text });
  }

  // ── Guardar ────────────────────────────────────────────────────────
  save(): void {
    if (this.rows.length === 0) {
      Swal.fire({ icon: 'error', title: 'Falta el Excel', text: 'Carga el Excel de órdenes de pago.' });
      return;
    }

    const formData = new FormData();
    // Cada archivo se envía con una clave única (evita colisiones si dos archivos
    // tienen el mismo nombre). El File no se serializa en el JSON.
    const payload = this.rows.map((r, i) => {
      const { file, displayFileName, ...rest } = r;
      const key = file ? `f${i}__${file.name}` : null;
      return { ...rest, matchedFileName: key };
    });
    formData.append('recordsJson', JSON.stringify(payload));
    this.rows.forEach((r, i) => {
      if (r.file) formData.append('files', r.file, `f${i}__${r.file.name}`);
    });

    this.loaderService.show();
    this.service.import(formData).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Facturas registradas', timer: 2200, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
