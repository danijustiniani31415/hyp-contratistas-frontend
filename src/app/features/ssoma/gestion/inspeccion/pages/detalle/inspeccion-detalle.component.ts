import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { InspeccionService } from '../../inspeccion.service';
import {
  InspeccionDetalleDto,
  InspeccionHallazgoDto,
  InspeccionRespuestaDto,
  CerrarHallazgoRequest,
  EditarHallazgoRequest,
} from '../../inspeccion.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import Swal from 'sweetalert2';

interface GrupoRespuesta {
  categoria: string;
  items: InspeccionRespuestaDto[];
  expandido: boolean;
}

@Component({
  selector: 'app-inspeccion-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './inspeccion-detalle.component.html',
  styleUrl: './inspeccion-detalle.component.css',
})
export class InspeccionDetalleComponent implements OnInit {
  data: InspeccionDetalleDto | null = null;
  loading = true;
  id = 0;

  grupos: GrupoRespuesta[] = [];
  mostrarNA = false;

  hallazgoCierre: InspeccionHallazgoDto | null = null;
  cierreAccion = '';
  cierreFotoBase64 = '';
  cierreFotoPreview = '';
  cerrando = false;

  hallazgoEditar: InspeccionHallazgoDto | null = null;
  editDescripcion = '';
  editTipo: 'Critico' | 'Mayor' | 'Menor' = 'Mayor';
  editArea = '';
  editResponsableNombre = '';
  editResponsableCargo = '';
  editFechaLimite = '';
  editAccionCorrectiva = '';
  guardandoEdicion = false;
  eliminandoId: number | null = null;

  lightboxUrl = '';
  lightboxOpen = false;
  descargandoPdf = false;
  cerrandoColaborativa = false;
  reabriendoColaborativa = false;

  readonly circumference = 2 * Math.PI * 44;

  /** path SharePoint -> object URL de blob ya descargado (evita <img> apuntando directo a SharePoint, que exige sesión Microsoft y nunca carga). */
  private fotoUrls = new Map<string, string>();

  spUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url; // registros antiguos con webUrl guardado — ya no se pueden proxear
    return this.fotoUrls.get(url) ?? '';
  }

  private precargarFotos(d: InspeccionDetalleDto): void {
    const pendientes: { path: string; tipo: 'fotos' | 'firmas' }[] = [];
    for (const h of d.hallazgos) {
      for (const f of h.fotos) pendientes.push({ path: f.url, tipo: 'fotos' });
      if (h.evidenciaCierreUrl) pendientes.push({ path: h.evidenciaCierreUrl, tipo: 'fotos' });
    }
    if (d.firmaInspectorUrl) pendientes.push({ path: d.firmaInspectorUrl, tipo: 'firmas' });
    if (d.firmaRepresentanteUrl) pendientes.push({ path: d.firmaRepresentanteUrl, tipo: 'firmas' });

    for (const { path, tipo } of pendientes) {
      if (path.startsWith('http://') || path.startsWith('https://') || this.fotoUrls.has(path)) continue;
      this.inspeccionService.descargarFoto(path, tipo).subscribe({
        next: (blob) => {
          this.fotoUrls.set(path, URL.createObjectURL(blob));
          this.cdr.markForCheck();
        },
        error: () => {},
      });
    }
  }

  constructor(
    private inspeccionService: InspeccionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.inspeccionService.getDetalle(this.id).subscribe({
      next: (d) => {
        this.data = d;
        this.grupos = this.buildGrupos(d.respuestas);
        this.loading = false;
        this.loaderService.hide();
        this.precargarFotos(d);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private buildGrupos(respuestas: InspeccionRespuestaDto[]): GrupoRespuesta[] {
    const map = new Map<string, InspeccionRespuestaDto[]>();
    for (const r of respuestas) {
      const cat = r.categoria ?? 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return Array.from(map.entries()).map(([categoria, items]) => ({
      categoria,
      items,
      expandido: true,
    }));
  }

  toggleGrupo(g: GrupoRespuesta): void {
    g.expandido = !g.expandido;
    this.cdr.markForCheck();
  }

  itemsVisibles(g: GrupoRespuesta): InspeccionRespuestaDto[] {
    return this.mostrarNA ? g.items : g.items.filter((i) => i.resultado !== 'NA');
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/inspeccion/lista']);
  }

  scoreClass(v?: number | null): string {
    if (v == null) return 'score-na';
    if (v >= 80) return 'score-verde';
    if (v >= 60) return 'score-amarillo';
    return 'score-rojo';
  }

  scoreDashOffset(v?: number | null): number {
    const pct = v != null ? Math.min(100, Math.max(0, v)) : 0;
    return this.circumference * (1 - pct / 100);
  }

  resultadoClass(r: string): string {
    if (r === 'Cumple') return 'res-cumple';
    if (r === 'NoCumple') return 'res-nocumple';
    return 'res-na';
  }

  tipoClass(tipo: string): string {
    if (tipo === 'Critico') return 'badge-critico';
    if (tipo === 'Mayor') return 'badge-mayor';
    return 'badge-menor';
  }

  estadoHallazgoClass(estado: string): string {
    if (estado === 'Cerrado') return 'estado-cerrado';
    if (estado === 'EnProceso') return 'estado-proceso';
    return 'estado-abierto';
  }

  ambitoClass(ambito: string): string {
    if (ambito === 'Seguridad') return 'badge-seguridad';
    if (ambito === 'Salud') return 'badge-salud';
    return 'badge-ambiente';
  }

  abrirCierre(h: InspeccionHallazgoDto): void {
    this.hallazgoCierre = h;
    this.cierreAccion = '';
    this.cierreFotoBase64 = '';
    this.cierreFotoPreview = '';
    this.cdr.markForCheck();
  }

  cerrarDrawer(): void {
    this.hallazgoCierre = null;
    this.cdr.markForCheck();
  }

  onCierreFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target!.result as string;
      this.cierreFotoPreview = dataUrl;
      this.cierreFotoBase64 = dataUrl.split(',')[1];
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  confirmarCierre(): void {
    if (!this.cierreAccion.trim()) {
      Swal.fire({ icon: 'warning', title: 'Ingresa la acción correctiva', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
      return;
    }
    if (!this.hallazgoCierre) return;
    this.cerrando = true;
    this.loaderService.show();
    const req: CerrarHallazgoRequest = {
      accionCorrectiva: this.cierreAccion,
      evidenciaCierreBase64: this.cierreFotoBase64 || undefined,
    };
    this.inspeccionService.cerrarHallazgo(this.hallazgoCierre.id, req).subscribe({
      next: () => {
        this.cerrando = false;
        this.loaderService.hide();
        this.hallazgoCierre = null;
        Swal.fire({ icon: 'success', title: 'Hallazgo cerrado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.cerrando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  abrirEditar(h: InspeccionHallazgoDto): void {
    this.hallazgoEditar = h;
    this.editDescripcion = h.descripcion;
    this.editTipo = h.tipo;
    this.editArea = h.area ?? '';
    this.editResponsableNombre = h.responsableNombre ?? '';
    this.editResponsableCargo = h.responsableCargo ?? '';
    this.editFechaLimite = h.fechaLimite ? h.fechaLimite.substring(0, 10) : '';
    this.editAccionCorrectiva = h.accionCorrectiva ?? '';
    this.cdr.markForCheck();
  }

  cerrarDrawerEditar(): void {
    this.hallazgoEditar = null;
    this.cdr.markForCheck();
  }

  setEditTipo(t: 'Critico' | 'Mayor' | 'Menor'): void {
    this.editTipo = t;
    this.cdr.markForCheck();
  }

  confirmarEdicion(): void {
    if (!this.editDescripcion.trim()) {
      Swal.fire({ icon: 'warning', title: 'Ingresa la descripción del hallazgo', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
      return;
    }
    if (!this.hallazgoEditar) return;
    this.guardandoEdicion = true;
    this.loaderService.show();
    const req: EditarHallazgoRequest = {
      descripcion: this.editDescripcion,
      tipo: this.editTipo,
      area: this.editArea || undefined,
      responsableNombre: this.editResponsableNombre || undefined,
      responsableCargo: this.editResponsableCargo || undefined,
      fechaLimite: this.editFechaLimite || undefined,
      accionCorrectiva: this.editAccionCorrectiva || undefined,
    };
    this.inspeccionService.editarHallazgo(this.hallazgoEditar.id, req).subscribe({
      next: () => {
        this.guardandoEdicion = false;
        this.loaderService.hide();
        this.hallazgoEditar = null;
        Swal.fire({ icon: 'success', title: 'Hallazgo actualizado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoEdicion = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  eliminarHallazgo(h: InspeccionHallazgoDto): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar hallazgo?',
      text: 'Esta acción no se puede deshacer desde la pantalla.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.eliminandoId = h.id;
      this.cdr.markForCheck();
      this.inspeccionService.eliminarHallazgo(h.id).subscribe({
        next: () => {
          this.eliminandoId = null;
          Swal.fire({ icon: 'success', title: 'Hallazgo eliminado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.eliminandoId = null;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  openLightbox(url: string): void {
    this.lightboxUrl = url;
    this.lightboxOpen = true;
    this.cdr.markForCheck();
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    this.cdr.markForCheck();
  }

  irAAgregarHallazgo(): void {
    this.inspeccionService.unirse(this.id).subscribe({
      next: () => this.router.navigate(['/ssoma/gestion/inspeccion', this.id, 'agregar-hallazgo']),
      error: () => this.router.navigate(['/ssoma/gestion/inspeccion', this.id, 'agregar-hallazgo']),
    });
  }

  cerrarColaborativa(): void {
    if (this.cerrandoColaborativa) return;
    this.inspeccionService.getDestinatariosCierreColaborativa(this.id).subscribe({
      next: (d) => {
        const roles: { rol: string; email: string | null }[] = [
          { rol: 'Residente', email: d.residenteEmail },
          { rol: 'Coordinador SSOMA', email: d.coordSsomaEmail },
          { rol: 'Gerente Inmobiliario', email: d.gerenteInmobiliarioEmail },
        ];
        if (d.prevencionistas.length) {
          d.prevencionistas.forEach((p) => roles.push({ rol: 'Prevencionista', email: `${p.email} (${p.nombre})` }));
        } else {
          roles.push({ rol: 'Prevencionista', email: null });
        }
        const filas = roles
          .map(
            ({ rol, email }) =>
              `<tr><td style="padding:2px 8px 2px 0;color:#6b7280">${rol}</td><td>${
                email ?? '<span style="color:#d97706">sin correo cargado</span>'
              }</td></tr>`,
          )
          .join('');
        const ccEmails = [d.tuEmail, d.jefeSsomaEmail]
          .filter((e): e is string => !!e)
          .concat(d.participantes.map((p) => `${p.email} (${p.nombre})`));
        const cc = ccEmails.length
          ? `<p style="margin-top:8px;font-size:0.85rem;color:#6b7280">Con copia a: ${ccEmails.join(', ')}</p>`
          : '';

        Swal.fire({
          icon: 'question',
          title: '¿Cerrar esta inspección?',
          html: `
            <p style="text-align:left">Ya no se podrán agregar más hallazgos de otros participantes.</p>
            <p style="text-align:left;margin-top:8px">Al hacer clic se enviará un correo a:</p>
            <table style="text-align:left;font-size:0.9rem">${filas}</table>
            ${cc}
          `,
          showCancelButton: true,
          confirmButtonText: 'Cerrar inspección',
          cancelButtonText: 'Cancelar',
        }).then((res) => {
          if (!res.isConfirmed) return;
          this.cerrandoColaborativa = true;
          this.cdr.markForCheck();
          this.inspeccionService.cerrarColaborativa(this.id).subscribe({
            next: () => {
              this.cerrandoColaborativa = false;
              this.load();
            },
            error: (err: HttpErrorResponse) => {
              this.cerrandoColaborativa = false;
              this.errorService.handleError(err);
              this.cdr.markForCheck();
            },
          });
        });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  reabrirColaborativa(): void {
    if (this.reabriendoColaborativa) return;
    Swal.fire({
      icon: 'question',
      title: '¿Reabrir esta inspección?',
      text: 'Se podrán volver a agregar hallazgos de otros participantes.',
      showCancelButton: true,
      confirmButtonText: 'Reabrir',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.reabriendoColaborativa = true;
      this.cdr.markForCheck();
      this.inspeccionService.reabrirColaborativa(this.id).subscribe({
        next: () => {
          this.reabriendoColaborativa = false;
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.reabriendoColaborativa = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  descargarPdf(): void {
    if (this.descargandoPdf) return;
    this.descargandoPdf = true;
    this.cdr.markForCheck();
    this.inspeccionService.descargarPdf(this.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Inspeccion_${this.id}_${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.descargandoPdf = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.descargandoPdf = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
