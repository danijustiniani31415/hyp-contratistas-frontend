import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PetsService } from '../../pets.service';
import {
  PetDetalleDto,
  PetPasoDto,
  ImportPasoPreviewDto,
  ImportParrafoDto,
  PetItemSeleccionadoDto,
  PetAnexoDto,
  CatalogoItemDto,
  PetFirmaDto,
  PetRolFirma,
} from '../../pets.dtos';
import { forkJoin } from 'rxjs';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { environment } from '../../../../../../../environments/environment';

interface ParrafoSeleccionable extends ImportParrafoDto {
  seleccionado: boolean;
  profundidad: number;
}

interface PasoPreviewNodo extends ImportPasoPreviewDto {
  profundidad: number;
}

// Calcula cuántos niveles de "padre" tiene cada elemento (para sangrarlo en la
// vista previa) siguiendo parentIndice dentro de la MISMA lista — no asume que
// venga ordenada ni que los padres estén antes que los hijos.
function calcularProfundidades<T extends { indice: number; parentIndice?: number | null }>(lista: T[]): Map<number, number> {
  const porIndice = new Map(lista.map((p) => [p.indice, p]));
  const profundidades = new Map<number, number>();
  const visitando = new Set<number>();

  const calc = (item: T): number => {
    if (profundidades.has(item.indice)) return profundidades.get(item.indice)!;
    if (item.parentIndice == null || !porIndice.has(item.parentIndice) || visitando.has(item.indice)) {
      profundidades.set(item.indice, 0);
      return 0;
    }
    visitando.add(item.indice);
    const d = calc(porIndice.get(item.parentIndice)!) + 1;
    visitando.delete(item.indice);
    profundidades.set(item.indice, d);
    return d;
  };

  lista.forEach((item) => calc(item));
  return profundidades;
}

// Nodo del árbol de "Procedimiento de trabajo": subtitulo/paso/letra/guion, con
// hijos anidados (sin límite de niveles) y numeración ya calculada para mostrar
// ("numero" nunca se guarda en el backend, se recalcula cada vez que se arma el árbol).
interface PasoNodo extends PetPasoDto {
  hijos: PasoNodo[];
  numero: string;
  nuevoHijoTexto: string;
  nuevoHijoTipo: string;
}

const TIPOS_PASO = [
  { value: 'paso', label: 'Paso (sin viñeta)' },
  { value: 'letra', label: 'Letra (a, b, c...)' },
  { value: 'guion', label: 'Guión (-)' },
  { value: 'subtitulo', label: 'Subtítulo' },
];

type TabKind = 'arbol' | 'texto' | 'catalogo' | 'anexos';

interface TabDef {
  key: string;
  label: string;
  kind: TabKind;
}

// Procedimiento y Responsabilidades sí tienen estructura real (pasos/subtítulos) y
// usan el árbol reusado. El resto de secciones narrativas son un solo bloque de
// texto — no tiene sentido que cada oración sea su propia fila con tipo/controles.
const TABS: TabDef[] = [
  { key: 'procedimiento', label: 'Procedimiento', kind: 'arbol' },
  { key: 'introduccion', label: 'Introducción', kind: 'texto' },
  { key: 'alcance', label: 'Alcance', kind: 'texto' },
  { key: 'objetivo', label: 'Objetivo', kind: 'texto' },
  { key: 'marco_legal', label: 'Marco Legal', kind: 'catalogo' },
  { key: 'definiciones', label: 'Definiciones', kind: 'texto' },
  { key: 'responsabilidades', label: 'Responsabilidades', kind: 'arbol' },
  { key: 'epp', label: 'EPP', kind: 'catalogo' },
  { key: 'recurso', label: 'Recursos', kind: 'catalogo' },
  { key: 'restricciones', label: 'Restricciones', kind: 'texto' },
  { key: 'anexos', label: 'Anexos', kind: 'anexos' },
];

// Sub-bloques dentro de una pestaña de catálogo: Marco Legal no distingue tipo,
// EPP y Recursos sí — cada bloque se agrega/elimina de forma independiente.
const CATALOGO_TIPOS: Record<string, { value: string | null; label: string }[]> = {
  marco_legal: [{ value: null, label: 'Normas aplicables' }],
  epp: [
    { value: 'basico', label: 'EPP básico' },
    { value: 'especifico', label: 'EPP específico según la tarea' },
    { value: 'emergencia', label: 'EPP de emergencia' },
  ],
  recurso: [
    { value: 'equipo', label: 'Equipos' },
    { value: 'herramienta', label: 'Herramientas' },
    { value: 'material', label: 'Materiales' },
  ],
};

function claveCatalogo(grupo: string, tipo: string | null): string {
  return `${grupo}:${tipo ?? ''}`;
}

const ROLES_FIRMA: { value: PetRolFirma; label: string }[] = [
  { value: 'elaborado', label: 'Elaborado por' },
  { value: 'revisado', label: 'Revisado por' },
  { value: 'aprobado', label: 'Aprobado por' },
];

@Component({
  selector: 'app-pets-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './pets-detalle.html',
  styleUrl: './pets-detalle.css',
})
export class PetsDetalle implements OnInit {
  id!: number;
  loading = true;
  detalle: PetDetalleDto | null = null;
  guardandoCabecera = false;

  readonly tiposPaso = TIPOS_PASO;
  readonly tabs = TABS;
  readonly catalogoTipos = CATALOGO_TIPOS;
  readonly rolesFirma = ROLES_FIRMA;

  // ── Firmas (Elaborado por / Revisado por / Aprobado por) ─────────────────
  guardandoFirmas = false;
  subiendoFirmaRol: string | null = null;
  exportandoPdf = false;

  firmaUrl(firma: PetFirmaDto): string | null {
    if (!firma.firmaUrl) return null;
    return firma.firmaUrl.startsWith('http') ? firma.firmaUrl : `${this.apiOrigin}${firma.firmaUrl}`;
  }

  guardarFirmas(): void {
    if (!this.detalle) return;
    this.guardandoFirmas = true;
    const detalle = this.detalle;
    forkJoin(
      this.rolesFirma.map((r) => {
        const f = detalle.firmas[r.value];
        return this.petsService.actualizarFirma(this.id, r.value, { nombre: f.nombre, cargo: f.cargo, fecha: f.fecha });
      }),
    ).subscribe({
      next: () => {
        this.guardandoFirmas = false;
        Swal.fire({ icon: 'success', title: 'Firmas guardadas', toast: true, position: 'top-end', showConfirmButton: false, timer: 1800 });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoFirmas = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onFirmaImagenSeleccionada(event: Event, rol: PetRolFirma): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.subiendoFirmaRol = rol;
    this.petsService.subirFirma(this.id, rol, file).subscribe({
      next: ({ firmaUrl }) => {
        this.subiendoFirmaRol = null;
        if (this.detalle) this.detalle.firmas[rol].firmaUrl = firmaUrl;
        input.value = '';
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoFirmaRol = null;
        input.value = '';
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Exportar ──────────────────────────────────────────────────────────────
  // Abre el PDF inline en una pestaña nueva (visor nativo del navegador), no lo
  // descarga — mientras el PETS se sigue armando, es "vista previa", no entregable.
  exportarPdf(): void {
    if (!this.detalle) return;
    // Se abre en blanco AHORA, de forma síncrona dentro del click — así el navegador
    // no lo trata como pop-up bloqueado cuando recién le seteamos la URL más abajo.
    const nuevaVentana = window.open('', '_blank');
    this.exportandoPdf = true;
    this.petsService.exportarPdf(this.id).subscribe({
      next: (blob) => {
        this.exportandoPdf = false;
        const url = window.URL.createObjectURL(blob);
        if (nuevaVentana) {
          nuevaVentana.location.href = url;
        } else {
          window.open(url, '_blank');
        }
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.exportandoPdf = false;
        nuevaVentana?.close();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  seccionActiva = 'procedimiento';

  get tabActiva(): TabDef {
    return this.tabs.find((t) => t.key === this.seccionActiva) ?? this.tabs[0];
  }

  // Árboles por sección (procedimiento + responsabilidades), reconstruidos cada
  // vez que se recarga. Solo se muestra el de la pestaña activa.
  arboles: Record<string, PasoNodo[]> = {};

  get arbol(): PasoNodo[] {
    return this.arboles[this.seccionActiva] ?? [];
  }

  // ── Secciones narrativas (bloque de texto único) ─────────────────────────
  textoSecciones: Record<string, string> = {};
  guardandoTextoSeccion: Record<string, boolean> = {};

  guardarTextoSeccion(): void {
    const seccion = this.seccionActiva;
    const contenido = this.textoSecciones[seccion] ?? '';
    this.guardandoTextoSeccion[seccion] = true;
    this.petsService.actualizarSeccionTexto(this.id, seccion, contenido).subscribe({
      next: () => {
        this.guardandoTextoSeccion[seccion] = false;
        Swal.fire({ icon: 'success', title: 'Guardado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoTextoSeccion[seccion] = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Catálogo (Marco Legal / EPP / Recursos) ──────────────────────────────
  catalogoOpciones: Record<string, CatalogoItemDto[]> = {};
  seleccionEnCurso: Record<string, number | null> = {};
  personalizadoTexto: Record<string, string> = {};
  personalizadoAlCatalogo: Record<string, boolean> = {};
  guardandoSeleccion: Record<string, boolean> = {};

  // ── Anexos ────────────────────────────────────────────────────────────────
  nuevoAnexoNombre = '';
  subiendoAnexo = false;

  // Agregar al final (nivel superior)
  nuevoPasoTexto = '';
  nuevoPasoTipo = 'paso';
  agregando = false;

  // Insertar en medio — parentId + índice identifican el grupo de hermanos y la
  // posición exacta donde se abre el formulario.
  insertarEnPadre: number | null = null;
  insertarEnIndice: number | null = null;
  insertarTexto = '';
  insertarTipo = 'paso';

  // Edición inline
  editingPasoId: number | null = null;
  editingTexto = '';
  editingTipo = 'paso';

  subiendoImagenPasoId: number | null = null;

  // Importar desde Word (detección automática de TODAS las secciones conocidas)
  importandoDocx = false;
  previewSeccionesArbol: Record<string, PasoPreviewNodo[]> | null = null;
  previewSeccionesTexto: Record<string, string> | null = null;
  confirmandoImportacion = false;

  // true: reimportar una versión corregida — borra el Procedimiento vigente antes de
  // insertar. false (default): agrega al final, como antes. Se resetea en cada import nuevo.
  reemplazarAlConfirmar = false;

  // Importar desde Word (selección manual — respaldo cuando no se detecta el
  // encabezado automáticamente, o el usuario prefiere elegir a mano)
  previewManual: ParrafoSeleccionable[] | null = null;
  rangoDesde: number | null = null;
  rangoHasta: number | null = null;

  readonly apiOrigin = environment.apiUrl.replace(/\/$/, '');
  readonly plantillaUrl = `${this.apiOrigin}/templates/pets-plantilla.docx`;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private petsService: PetsService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  imagenUrl(paso: PetPasoDto): string | null {
    if (!paso.imagenUrl) return null;
    return paso.imagenUrl.startsWith('http') ? paso.imagenUrl : `${this.apiOrigin}${paso.imagenUrl}`;
  }

  load(): void {
    this.loading = true;
    this.petsService.getDetalle(this.id).subscribe({
      next: (d) => {
        this.detalle = d;
        this.arboles = {
          procedimiento: this.construirArbol(d.pasos),
          responsabilidades: this.construirArbol(d.responsabilidades),
        };
        this.textoSecciones = { ...d.seccionesTexto };
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── PESTAÑAS ──────────────────────────────────────────────────────────────
  seleccionarTab(key: string): void {
    this.seccionActiva = key;
    // Cualquier edición/inserción a medias queda de la pestaña anterior — se
    // descarta al cambiar para no dejar un formulario abierto "flotando". La
    // vista previa de importación (solo aplica a "Procedimiento") también se
    // descarta: si no se cierra, bloquea el árbol normal de CUALQUIER pestaña
    // porque ese estado es global, no por sección.
    this.cancelarInsertar();
    this.cancelarEdicion();
    this.previewSeccionesArbol = null;
    this.previewSeccionesTexto = null;
    this.previewManual = null;
    this.reemplazarAlConfirmar = false;

    const tab = this.tabs.find((t) => t.key === key);
    if (tab?.kind === 'catalogo') {
      this.cargarOpcionesCatalogo(tab.key);
    }
    this.cdr.markForCheck();
  }

  private construirArbol(pasos: PetPasoDto[]): PasoNodo[] {
    const nodos = new Map<number, PasoNodo>();
    pasos.forEach((p) => nodos.set(p.id, { ...p, hijos: [], numero: '', nuevoHijoTexto: '', nuevoHijoTipo: 'paso' }));

    const raiz: PasoNodo[] = [];
    pasos.forEach((p) => {
      const nodo = nodos.get(p.id)!;
      if (p.parentId != null && nodos.has(p.parentId)) {
        nodos.get(p.parentId)!.hijos.push(nodo);
      } else {
        raiz.push(nodo);
      }
    });

    const ordenarYNumerar = (lista: PasoNodo[], prefijoSubtitulo: string): void => {
      lista.sort((a, b) => a.orden - b.orden);
      let nSubtitulo = 0;
      let nLetra = 0;
      for (const n of lista) {
        if (n.tipo === 'subtitulo') {
          nSubtitulo++;
          n.numero = prefijoSubtitulo ? `${prefijoSubtitulo}.${nSubtitulo}` : `${nSubtitulo}`;
        } else if (n.tipo === 'letra') {
          nLetra++;
          n.numero = this.letraDesdeIndice(nLetra - 1);
        } else {
          n.numero = '';
        }
        ordenarYNumerar(n.hijos, n.tipo === 'subtitulo' ? n.numero : prefijoSubtitulo);
      }
    };
    ordenarYNumerar(raiz, '');
    return raiz;
  }

  // a, b, c, ..., z, aa, ab, ... (igual que columnas de Excel)
  private letraDesdeIndice(i: number): string {
    let s = '';
    let n = i;
    do {
      s = String.fromCharCode(97 + (n % 26)) + s;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return s;
  }

  irALista(): void {
    this.router.navigate(['/ssoma/gestion/pets']);
  }

  guardarCabecera(): void {
    if (!this.detalle) return;
    this.guardandoCabecera = true;
    this.petsService
      .actualizar(this.id, {
        nombre: this.detalle.nombre,
        codigo: this.detalle.codigo,
        sharepointUrl: this.detalle.sharepointUrl,
        activo: this.detalle.activo,
      })
      .subscribe({
        next: () => {
          this.guardandoCabecera = false;
          Swal.fire({ icon: 'success', title: 'Guardado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1800 });
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoCabecera = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── PASOS: agregar al final (nivel superior) ─────────────────────────────
  agregarPasoFinal(): void {
    const texto = this.nuevoPasoTexto.trim();
    if (!texto) return;
    this.agregando = true;
    this.petsService
      .agregarPaso(this.id, { descripcion: texto, seccion: this.seccionActiva, parentId: null, tipo: this.nuevoPasoTipo })
      .subscribe({
        next: () => {
          this.agregando = false;
          this.nuevoPasoTexto = '';
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.agregando = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── PASOS: agregar dentro de un subtítulo ────────────────────────────────
  agregarHijo(nodo: PasoNodo): void {
    const texto = nodo.nuevoHijoTexto.trim();
    if (!texto) return;
    this.petsService
      .agregarPaso(this.id, { descripcion: texto, seccion: this.seccionActiva, parentId: nodo.id, tipo: nodo.nuevoHijoTipo })
      .subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── PASOS: insertar en una posición específica ───────────────────────────
  // parentId + index (0-based, dentro de ese grupo de hermanos) identifican
  // exactamente dónde se quiere insertar — nunca se toca el orden de otro grupo.
  abrirInsertarEn(parentId: number | null, index: number): void {
    this.insertarEnPadre = parentId;
    this.insertarEnIndice = index;
    this.insertarTexto = '';
    this.insertarTipo = 'paso';
    this.cdr.markForCheck();
  }

  cancelarInsertar(): void {
    this.insertarEnPadre = null;
    this.insertarEnIndice = null;
    this.insertarTexto = '';
    this.cdr.markForCheck();
  }

  confirmarInsertar(): void {
    const texto = this.insertarTexto.trim();
    if (!texto || this.insertarEnIndice === null) return;
    const posicion = this.insertarEnIndice + 1; // 1-based para el backend
    this.petsService
      .agregarPaso(this.id, {
        descripcion: texto,
        seccion: this.seccionActiva,
        parentId: this.insertarEnPadre,
        tipo: this.insertarTipo,
        posicion,
      })
      .subscribe({
        next: () => {
          this.cancelarInsertar();
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── PASOS: editar texto/tipo ──────────────────────────────────────────────
  iniciarEdicion(nodo: PasoNodo): void {
    this.editingPasoId = nodo.id;
    this.editingTexto = nodo.descripcion;
    this.editingTipo = nodo.tipo;
    this.cdr.markForCheck();
  }

  cancelarEdicion(): void {
    this.editingPasoId = null;
    this.editingTexto = '';
    this.cdr.markForCheck();
  }

  guardarEdicion(nodo: PasoNodo): void {
    const texto = this.editingTexto.trim();
    if (!texto) return;
    this.petsService.actualizarPaso(this.id, nodo.id, { descripcion: texto, tipo: this.editingTipo }).subscribe({
      next: () => {
        this.cancelarEdicion();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── PASOS: eliminar ───────────────────────────────────────────────────────
  eliminarPaso(nodo: PasoNodo): void {
    const esSubtitulo = nodo.tipo === 'subtitulo' && nodo.hijos.length > 0;
    Swal.fire({
      icon: 'warning',
      title: esSubtitulo ? 'Este subtítulo tiene pasos dentro' : 'Eliminar paso',
      text: esSubtitulo
        ? 'Elimina primero los pasos que están dentro de este subtítulo.'
        : 'Este paso dejará de aparecer para quien lo use (OPT, checklists), pero se conserva en lo ya ejecutado.',
      showCancelButton: !esSubtitulo,
      confirmButtonText: esSubtitulo ? 'Entendido' : 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (esSubtitulo || !res.isConfirmed) return;
      this.petsService.eliminarPaso(this.id, nodo.id).subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  // ── PASOS: reordenar (mover arriba / abajo dentro del mismo grupo) ───────
  moverArriba(hermanos: PasoNodo[], parentId: number | null, index: number): void {
    if (index <= 0) return;
    this.reordenar(hermanos, parentId, index, index - 1);
  }

  moverAbajo(hermanos: PasoNodo[], parentId: number | null, index: number): void {
    if (index >= hermanos.length - 1) return;
    this.reordenar(hermanos, parentId, index, index + 1);
  }

  private reordenar(hermanos: PasoNodo[], parentId: number | null, desde: number, hacia: number): void {
    const copia = [...hermanos];
    const [movido] = copia.splice(desde, 1);
    copia.splice(hacia, 0, movido);
    const pasoIds = copia.map((p) => p.id);

    this.petsService.reordenarPasos(this.id, { seccion: this.seccionActiva, parentId, pasoIds }).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.load();
      },
    });
  }

  // ── PASOS: imagen ─────────────────────────────────────────────────────────
  onFileSelected(event: Event, paso: PetPasoDto): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.subiendoImagenPasoId = paso.id;
    this.petsService.subirImagenPaso(this.id, paso.id, file).subscribe({
      next: ({ imagenUrl }) => {
        this.subiendoImagenPasoId = null;
        if (this.detalle) {
          paso.imagenUrl = imagenUrl;
        }
        input.value = '';
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoImagenPasoId = null;
        this.errorService.handleError(err);
        input.value = '';
        this.cdr.markForCheck();
      },
    });
  }

  // ── IMPORTAR DESDE WORD ───────────────────────────────────────────────────
  onArchivoDocxSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importandoDocx = true;
    this.reemplazarAlConfirmar = false;
    this.petsService.previewImportarDocx(file).subscribe({
      next: (preview) => {
        this.importandoDocx = false;
        input.value = '';

        const huboArbol = Object.keys(preview.seccionesArbol).length > 0;
        const huboTexto = Object.keys(preview.seccionesTexto).length > 0;

        if (preview.seccionEncontrada && (huboArbol || huboTexto)) {
          const seccionesArbol: Record<string, PasoPreviewNodo[]> = {};
          for (const seccion of Object.keys(preview.seccionesArbol)) {
            const pasos = preview.seccionesArbol[seccion];
            const profundidades = calcularProfundidades(pasos);
            seccionesArbol[seccion] = pasos.map((p) => ({ ...p, profundidad: profundidades.get(p.indice) ?? 0 }));
          }
          this.previewSeccionesArbol = seccionesArbol;
          this.previewSeccionesTexto = { ...preview.seccionesTexto };
          this.cdr.markForCheck();
          return;
        }

        // No se detectó NINGÚN título de sección conocido: en vez de un error sin
        // salida, se ofrece elegir a mano los pasos de Procedimiento sobre todo el
        // contenido del documento.
        Swal.fire({
          icon: 'info',
          title: 'No detecté ninguna sección conocida automáticamente',
          text: 'Te muestro todo el documento para que marques tú mismo dónde empiezan y terminan los pasos del Procedimiento.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3500,
        });
        const profundidadesManual = calcularProfundidades(preview.todosLosParrafos);
        this.previewManual = preview.todosLosParrafos.map((p) => ({
          ...p,
          seleccionado: false,
          profundidad: profundidadesManual.get(p.indice) ?? 0,
        }));
        this.rangoDesde = null;
        this.rangoHasta = null;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.importandoDocx = false;
        input.value = '';
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  objectKeys(obj: Record<string, unknown> | null): string[] {
    return obj ? Object.keys(obj) : [];
  }

  labelDeSeccion(key: string): string {
    return this.tabs.find((t) => t.key === key)?.label ?? key;
  }

  quitarPreviewPaso(seccion: string, index: number): void {
    if (!this.previewSeccionesArbol?.[seccion]) return;
    this.previewSeccionesArbol[seccion] = this.previewSeccionesArbol[seccion].filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  cancelarImportacion(): void {
    this.previewSeccionesArbol = null;
    this.previewSeccionesTexto = null;
    this.cdr.markForCheck();
  }

  // Cuenta cuántos pasos existentes se perderían si se marca "reemplazar", sumando
  // solo las secciones en árbol que el documento realmente trajo.
  totalExistenteEnSeccionesDetectadas(): number {
    if (!this.previewSeccionesArbol || !this.detalle) return 0;
    let total = 0;
    if (this.previewSeccionesArbol['procedimiento']) total += this.detalle.pasos.length;
    if (this.previewSeccionesArbol['responsabilidades']) total += this.detalle.responsabilidades.length;
    return total;
  }

  confirmarImportacion(): void {
    if (!this.previewSeccionesArbol && !this.previewSeccionesTexto) return;

    if (this.reemplazarAlConfirmar && this.totalExistenteEnSeccionesDetectadas() > 0) {
      const totalActual = this.totalExistenteEnSeccionesDetectadas();
      Swal.fire({
        icon: 'warning',
        title: 'Reemplazar las secciones detectadas',
        text: `Se eliminarán ${totalActual} paso(s) existente(s) de Procedimiento/Responsabilidades antes de insertar los nuevos. El texto de las secciones narrativas detectadas también se sobrescribirá. Esta acción no se puede deshacer.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, reemplazar',
        cancelButtonText: 'Cancelar',
      }).then((res) => {
        if (res.isConfirmed) this.ejecutarConfirmarImportacion();
      });
      return;
    }
    this.ejecutarConfirmarImportacion();
  }

  private ejecutarConfirmarImportacion(): void {
    this.confirmandoImportacion = true;
    const seccionesArbol: Record<string, { indice: number; parentIndice?: number | null; tipo: string; texto: string; imagenBase64?: string }[]> = {};
    for (const seccion of Object.keys(this.previewSeccionesArbol ?? {})) {
      seccionesArbol[seccion] = (this.previewSeccionesArbol ?? {})[seccion].map((p) => ({
        indice: p.indice,
        parentIndice: p.parentIndice,
        tipo: p.tipo,
        texto: p.texto,
        imagenBase64: p.imagenBase64,
      }));
    }

    this.petsService
      .confirmarImportarDocx(this.id, {
        seccionesArbol,
        seccionesTexto: this.previewSeccionesTexto ?? {},
        reemplazar: this.reemplazarAlConfirmar,
      })
      .subscribe({
        next: () => {
          this.confirmandoImportacion = false;
          this.previewSeccionesArbol = null;
          this.previewSeccionesTexto = null;
          Swal.fire({ icon: 'success', title: 'Documento importado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.confirmandoImportacion = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── IMPORTAR DESDE WORD: selección manual (respaldo) ─────────────────────
  get seleccionadosManual(): ParrafoSeleccionable[] {
    return this.previewManual?.filter((p) => p.seleccionado) ?? [];
  }

  toggleSeleccionManual(p: ParrafoSeleccionable): void {
    p.seleccionado = !p.seleccionado;
  }

  seleccionarRango(): void {
    if (!this.previewManual || this.rangoDesde === null || this.rangoHasta === null) return;
    const desde = Math.min(this.rangoDesde, this.rangoHasta);
    const hasta = Math.max(this.rangoDesde, this.rangoHasta);
    this.previewManual.forEach((p) => {
      if (p.indice >= desde && p.indice <= hasta) p.seleccionado = true;
    });
    this.cdr.markForCheck();
  }

  limpiarSeleccionManual(): void {
    this.previewManual?.forEach((p) => (p.seleccionado = false));
    this.cdr.markForCheck();
  }

  cancelarImportacionManual(): void {
    this.previewManual = null;
    this.rangoDesde = null;
    this.rangoHasta = null;
    this.cdr.markForCheck();
  }

  confirmarSeleccionManual(): void {
    const seleccionados = this.seleccionadosManual;
    if (seleccionados.length === 0) return;

    if (this.reemplazarAlConfirmar) {
      const totalActual = this.detalle?.pasos.length ?? 0;
      Swal.fire({
        icon: 'warning',
        title: 'Reemplazar el Procedimiento actual',
        text: `Se eliminarán ${totalActual} paso(s) existente(s) antes de insertar los ${seleccionados.length} nuevos. Esta acción no se puede deshacer.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, reemplazar',
        cancelButtonText: 'Cancelar',
      }).then((res) => {
        if (res.isConfirmed) this.ejecutarConfirmarSeleccionManual(seleccionados);
      });
      return;
    }
    this.ejecutarConfirmarSeleccionManual(seleccionados);
  }

  private ejecutarConfirmarSeleccionManual(seleccionados: ParrafoSeleccionable[]): void {
    this.confirmandoImportacion = true;
    this.petsService
      .confirmarImportarDocx(this.id, {
        seccionesArbol: {
          procedimiento: seleccionados.map((p) => ({
            indice: p.indice,
            parentIndice: p.parentIndice,
            tipo: p.tipo,
            texto: p.texto,
            imagenBase64: p.imagenBase64,
          })),
        },
        seccionesTexto: {},
        reemplazar: this.reemplazarAlConfirmar,
      })
      .subscribe({
        next: () => {
          this.confirmandoImportacion = false;
          this.previewManual = null;
          Swal.fire({ icon: 'success', title: 'Pasos importados', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.confirmandoImportacion = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── CATÁLOGO (Marco Legal / EPP / Recursos) ──────────────────────────────

  claveCatalogo(grupo: string, tipo: string | null): string {
    return claveCatalogo(grupo, tipo);
  }

  itemsPorTipo(grupo: string, tipo: string | null): PetItemSeleccionadoDto[] {
    if (!this.detalle) return [];
    const lista =
      grupo === 'marco_legal' ? this.detalle.marcoLegal : grupo === 'epp' ? this.detalle.epp : this.detalle.recursos;
    return (lista ?? []).filter((i) => (tipo == null ? true : i.tipo === tipo));
  }

  opcionesDisponibles(grupo: string, tipo: string | null): CatalogoItemDto[] {
    const seleccionadosIds = new Set(
      this.itemsPorTipo(grupo, tipo)
        .map((i) => i.catalogoItemId)
        .filter((id): id is number => id != null),
    );
    return (this.catalogoOpciones[claveCatalogo(grupo, tipo)] ?? []).filter((o) => !seleccionadosIds.has(o.id));
  }

  private cargarOpcionesCatalogo(grupo: string): void {
    const tipos = this.catalogoTipos[grupo] ?? [{ value: null, label: '' }];
    tipos.forEach((t) => {
      this.petsService.getCatalogo(grupo, t.value ?? undefined).subscribe({
        next: (items) => {
          this.catalogoOpciones[claveCatalogo(grupo, t.value)] = items;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  agregarDesdeCatalogo(grupo: string, tipo: string | null): void {
    const clave = claveCatalogo(grupo, tipo);
    const catalogoItemId = this.seleccionEnCurso[clave];
    if (!catalogoItemId) return;

    this.guardandoSeleccion[clave] = true;
    this.petsService
      .seleccionarCatalogoItem(this.id, { grupo, tipo: tipo ?? undefined, catalogoItemId })
      .subscribe({
        next: () => {
          this.guardandoSeleccion[clave] = false;
          this.seleccionEnCurso[clave] = null;
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoSeleccion[clave] = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  agregarPersonalizado(grupo: string, tipo: string | null): void {
    const clave = claveCatalogo(grupo, tipo);
    const texto = (this.personalizadoTexto[clave] ?? '').trim();
    if (!texto) return;
    const agregarAlCatalogoGlobal = !!this.personalizadoAlCatalogo[clave];

    this.guardandoSeleccion[clave] = true;
    this.petsService
      .agregarItemPersonalizado(this.id, { grupo, tipo: tipo ?? undefined, descripcion: texto, agregarAlCatalogoGlobal })
      .subscribe({
        next: () => {
          this.guardandoSeleccion[clave] = false;
          this.personalizadoTexto[clave] = '';
          this.personalizadoAlCatalogo[clave] = false;
          if (agregarAlCatalogoGlobal) this.cargarOpcionesCatalogo(grupo);
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoSeleccion[clave] = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // "Quitar" solo de este PETS — no toca el catálogo global.
  quitarSeleccion(item: PetItemSeleccionadoDto): void {
    Swal.fire({
      icon: 'warning',
      title: 'Quitar de este PETS',
      text: 'Deja de aparecer en este PETS. Si viene del catálogo global, sigue disponible para los demás.',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.petsService.eliminarSeleccion(this.id, item.id).subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  // Elimina (desactiva) del catálogo GLOBAL — afecta la disponibilidad futura
  // para TODOS los PETS, no solo este.
  eliminarDeCatalogoGlobal(item: PetItemSeleccionadoDto): void {
    if (item.catalogoItemId == null) return;
    Swal.fire({
      icon: 'warning',
      title: 'Eliminar del catálogo global',
      text: 'Dejará de poder elegirse en CUALQUIER PETS a futuro. Los PETS que ya lo tenían seleccionado no se ven afectados.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar del catálogo',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.petsService.desactivarCatalogoItem(item.catalogoItemId!).subscribe({
        next: () => {
          this.cargarOpcionesCatalogo(item.grupo);
          this.load();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  // ── ANEXOS ────────────────────────────────────────────────────────────────

  anexoUrl(anexo: PetAnexoDto): string {
    return anexo.archivoUrl.startsWith('http') ? anexo.archivoUrl : `${this.apiOrigin}${anexo.archivoUrl}`;
  }

  onAnexoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const nombre = this.nuevoAnexoNombre.trim() || file.name;
    this.subiendoAnexo = true;
    this.petsService.subirAnexo(this.id, nombre, file).subscribe({
      next: () => {
        this.subiendoAnexo = false;
        this.nuevoAnexoNombre = '';
        input.value = '';
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoAnexo = false;
        input.value = '';
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  eliminarAnexo(anexo: PetAnexoDto): void {
    Swal.fire({
      icon: 'warning',
      title: 'Eliminar anexo',
      text: `¿Eliminar "${anexo.nombre}"?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.petsService.eliminarAnexo(this.id, anexo.id).subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
