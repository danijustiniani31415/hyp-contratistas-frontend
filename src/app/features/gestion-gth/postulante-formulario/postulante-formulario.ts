import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../shared/components/date-picker/date-picker';
import { FileSelector, SelectedFile } from '../../../shared/components/file-selector/file-selector';
import { PostulanteFormularioService } from './services/postulante-formulario.service';
import {
  DistritoOpcion,
  OpcionFormulario,
  PostulanteFormularioPublico,
  PostulanteFormularioRespuestas,
  TipoDocumentoOpcion,
  respuestasVacias,
} from './dtos/postulante-formulario.dto';

/**
 * Página PÚBLICA del formulario de información del postulante (acceso por token, sin login).
 * Reemplaza al Microsoft Forms "FORMULARIO POSTULANTE - ABRIL GRUPO INMOBILIARIO". Se llena en
 * 5 pasos (protección de datos, datos personales, estudios, experiencia laboral, consentimiento)
 * y al enviarse queda COMPLETADO a la espera de la revisión de GTH.
 */
@Component({
  standalone: true,
  selector: 'app-postulante-formulario',
  imports: [CommonModule, FormsModule, SearchSelect, DatePicker, FileSelector],
  templateUrl: './postulante-formulario.html',
  styleUrl: './postulante-formulario.css',
})
export class PostulanteFormulario implements OnInit {
  /** Color de acento del formulario (verde de la marca Abril). */
  readonly accent = 'var(--color-abril-primary-dark)';

  token = '';
  cargando = true;
  enviando = false;
  /** true cuando la carga falla o el token no es válido. */
  errorCarga = false;
  mensajeError = '';
  /** true cuando el postulante envió el formulario correctamente (pantalla de agradecimiento). */
  enviado = false;

  data: PostulanteFormularioPublico | null = null;
  model: PostulanteFormularioRespuestas = respuestasVacias();

  /**
   * CV documentado que el postulante adjuntó en esta sesión. null si no eligió ninguno todavía:
   * en ese caso el envío vale solo si ya había subido uno antes (ver `cvNombreCargado`), que es el
   * caso de quien vuelve a abrir el enlace para corregir lo observado.
   */
  cv: SelectedFile | null = null;

  /** Formatos y tope del CV. Los mismos que valida el backend. */
  readonly cvAccept = '.pdf,.doc,.docx';
  readonly cvMaxMb = 25;

  /** Universidades ya ordenadas (alfabéticas y "Otras" al final). Se calcula una sola vez al cargar. */
  universidades: OpcionFormulario[] = [];

  /** Largo exacto del número de documento cuando el tipo es DNI (8 dígitos). */
  readonly dniLargo = 8;
  /** Largo máximo del número de documento cuando el tipo es CE (12 caracteres). */
  readonly ceLargo = 12;
  /** Largo máximo del número de celular (9 dígitos). */
  readonly celularLargo = 9;
  /** Edad mínima para postular: nadie menor de edad puede ser contratado. */
  readonly edadMinima = 18;

  paso = 1;
  readonly totalPasos = 5;
  readonly pasosNombres = [
    'Protección de datos',
    'Datos personales',
    'Estudios',
    'Experiencia laboral',
    'CV y consentimiento',
  ];

  constructor(
    private route: ActivatedRoute,
    private service: PostulanteFormularioService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.errorCarga = true;
      this.mensajeError = 'El enlace del formulario no es válido.';
      this.cargando = false;
      return;
    }
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    // App zoneless: forzamos el refresco para que el formulario aparezca sin un click extra.
    this.service.getPublico(this.token).subscribe({
      next: (data) => {
        this.data = data;
        this.universidades = this.ordenarUniversidades(data.universidades ?? []);
        this.model = { ...respuestasVacias(), ...data.respuestas };
        // El archivo no se puede precargar en un <input type=file>: lo que se conserva es el
        // nombre del que ya está en el servidor, para no volver a pedírselo.
        this.cv = null;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.errorCarga = true;
        this.mensajeError =
          err.error?.message ?? 'No se pudo cargar el formulario. Verifica el enlace e inténtalo de nuevo.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Corrección tras un rechazo de GTH ───────────────────────────────────
  /**
   * Observaciones que dejó GTH al rechazar el formulario. Vienen solo cuando el formulario está
   * RECHAZADO: se muestran en las 4 páginas para que el postulante corrija sobre lo que ya llenó
   * (sus respuestas llegan precargadas) en vez de empezar de cero.
   */
  get observaciones(): string | null {
    return this.data?.observaciones ?? null;
  }

  /** true si el postulante está corrigiendo un formulario observado por GTH. */
  get esCorreccion(): boolean {
    return !!this.observaciones || this.data?.estadoCodigo === 'RECHAZADO';
  }

  // ── CV documentado ───────────────────────────────────────────────────────
  /** Nombre del CV que ya está guardado en el servidor (null si nunca subió ninguno). */
  get cvNombreCargado(): string | null {
    return this.data?.cvNombre ?? null;
  }

  /**
   * true si el envío tiene CV: el que acaba de adjuntar o el que ya estaba guardado. Es la misma
   * regla que aplica el backend, que también acepta el envío sin archivo cuando ya hay uno.
   */
  get cvValido(): boolean {
    return !!this.cv || !!this.cvNombreCargado;
  }

  /**
   * Guarda el CV elegido. Reemplaza al anterior: el formulario pide un archivo, no una lista.
   * El tope se valida acá además del backend para no hacerle subir 40 MB por gusto a alguien que
   * está llenando esto desde el celular.
   */
  onCvSelected(archivo: SelectedFile): void {
    if (archivo.file.size > this.cvMaxMb * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'El archivo es muy grande',
        text: `Tu CV no puede pesar más de ${this.cvMaxMb} MB. Comprímelo o súbelo en PDF.`,
        confirmButtonColor: 'var(--color-abril-primary-dark)',
      });
      return;
    }
    this.cv = archivo;
  }

  quitarCv(): void {
    this.cv = null;
  }

  // ── Catálogos (atajos para el template) ─────────────────────────────────
  get estadosCiviles(): OpcionFormulario[] { return this.data?.estadosCiviles ?? []; }
  get tiposDocumento(): TipoDocumentoOpcion[] { return this.data?.tiposDocumento ?? []; }
  get distritos(): DistritoOpcion[] { return this.data?.distritos ?? []; }
  get gradosAcademicos(): OpcionFormulario[] { return this.data?.gradosAcademicos ?? []; }
  get disponibilidades(): OpcionFormulario[] { return this.data?.disponibilidades ?? []; }
  get motivosCese(): OpcionFormulario[] { return this.data?.motivosCese ?? []; }

  /**
   * Universidades en orden alfabético con "Otras" siempre al final: es la opción de escape del
   * catálogo, no una universidad más, así que no debe competir por su letra inicial.
   */
  private ordenarUniversidades(lista: OpcionFormulario[]): OpcionFormulario[] {
    const esOtras = (o: OpcionFormulario) => /^otr[ao]s?$/i.test((o.nombre ?? '').trim());
    const otras = lista.filter(esOtras);
    const resto = lista
      .filter((o) => !esOtras(o))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return [...resto, ...otras];
  }

  // ── Número de documento / celular (solo dígitos) ─────────────────────────
  /** true si el tipo de documento elegido es DNI (que son exactamente 8 dígitos numéricos). */
  get esDni(): boolean {
    return this.tiposDocumento.find((t) => t.id === this.model.tipoDocumentoId)?.codigo === 'DNI';
  }

  /**
   * Largo máximo del número de documento según el tipo elegido: 8 para el DNI y 12 para el carné
   * de extranjería. Sin tipo elegido se deja el tope del CE, que es el mayor de los dos.
   */
  get documentoLargoMaximo(): number {
    return this.esDni ? this.dniLargo : this.ceLargo;
  }

  /** Ayuda del campo, que cambia con el tipo elegido (el largo permitido no es el mismo). */
  get documentoPlaceholder(): string {
    return this.esDni
      ? `Escribe tu DNI (${this.dniLargo} dígitos)`
      : `Escribe tu número de documento (máx. ${this.ceLargo} caracteres)`;
  }

  /**
   * El DNI exige 8 dígitos exactos; el carné de extranjería es alfanumérico, así que basta con
   * que esté lleno y no pase de 12 caracteres.
   */
  get documentoValido(): boolean {
    const valor = (this.model.numeroDocumento ?? '').trim();
    return this.esDni ? /^\d{8}$/.test(valor) : valor.length > 0 && valor.length <= this.ceLargo;
  }

  /**
   * Al cambiar el tipo de documento re-aplica la regla al valor ya escrito: si venía un carné
   * alfanumérico y se pasa a DNI, se queda solo con los primeros 8 dígitos; al revés, se recorta
   * a los 12 caracteres que admite el carné.
   */
  onTipoDocumentoChange(id: number | null): void {
    this.model.tipoDocumentoId = id;
    this.model.numeroDocumento = this.esDni
      ? this.soloDigitos(this.model.numeroDocumento, this.dniLargo)
      : (this.model.numeroDocumento ?? '').slice(0, this.ceLargo);
  }

  /**
   * Filtra lo tecleado en el número de documento: con DNI solo dígitos y máximo 8; con CE se
   * respeta lo alfanumérico pero se corta a 12. El maxlength del input no basta: no ataja el
   * pegado en todos los navegadores ni el valor que quedó de un tipo de documento anterior.
   */
  onNumeroDocumentoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = this.esDni
      ? this.soloDigitos(input.value, this.dniLargo)
      : input.value.slice(0, this.ceLargo);
    if (input.value !== limpio) input.value = limpio;
    this.model.numeroDocumento = limpio;
  }

  /** Filtra lo tecleado en el celular: solo dígitos y máximo 9. */
  onCelularInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = this.soloDigitos(input.value, this.celularLargo);
    if (input.value !== limpio) input.value = limpio;
    this.model.numeroCelular = limpio;
  }

  /** Deja solo dígitos y recorta al largo indicado. */
  private soloDigitos(valor: string | null, largo: number): string {
    return (valor ?? '').replace(/\D/g, '').slice(0, largo);
  }

  // ── Fecha de nacimiento (mayoría de edad) ────────────────────────────────
  /**
   * Última fecha de nacimiento que deja al postulante con 18 años cumplidos HOY, en formato
   * 'YYYY-MM-DD'. Es el `max` del date-picker: todo día posterior corresponde a un menor de edad.
   *
   * El día se recorta al último del mes en vez de dejar que `Date` lo normalice: un 29/02 restado
   * 18 años cae en un año no bisiesto y `new Date(...)` lo correría al 01/03, un día más permisivo
   * que el límite que exige el backend (`DateOnly.AddYears`, que sí recorta).
   */
  get fechaNacimientoMaxima(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear() - this.edadMinima;
    const mes = hoy.getMonth();
    const ultimoDelMes = new Date(anio, mes + 1, 0).getDate();
    const dia = Math.min(hoy.getDate(), ultimoDelMes);
    return `${anio}-${`${mes + 1}`.padStart(2, '0')}-${`${dia}`.padStart(2, '0')}`;
  }

  /**
   * true si la fecha de nacimiento cargada corresponde a un menor de edad. Las fechas son
   * 'YYYY-MM-DD', así que la comparación de texto ya ordena cronológicamente.
   */
  get esMenorDeEdad(): boolean {
    const fecha = this.model.fechaNacimiento;
    return !!fecha && fecha > this.fechaNacimientoMaxima;
  }

  // ── Fechas de la experiencia laboral ─────────────────────────────────────
  /**
   * No se puede haber salido de una empresa antes de haber entrado. El `[min]` del date-picker de
   * la fecha de término ya bloquea elegir un día anterior, pero no toca lo que ya estaba puesto:
   * si el postulante llena el término y después mueve el inicio a una fecha posterior, el término
   * queda inválido en silencio. Por eso al cambiar el inicio se limpia el término desfasado.
   */
  onFechaInicioChange(fecha: string | null): void {
    this.model.fechaInicio = fecha;
    if (this.fechasExperienciaInvertidas) this.model.fechaTermino = null;
  }

  /** true si hay ambas fechas y el término cae antes del inicio (las fechas son 'YYYY-MM-DD'). */
  get fechasExperienciaInvertidas(): boolean {
    const inicio = this.model.fechaInicio;
    const termino = this.model.fechaTermino;
    return !!inicio && !!termino && termino < inicio;
  }

  // ── Validación por paso ──────────────────────────────────────────────────
  private lleno(v: string | null): boolean {
    return !!v && v.trim().length > 0;
  }

  /**
   * Paso 0: sin el consentimiento de protección de datos no hay base legal para pedirle nada más,
   * así que el resto del formulario no se desbloquea. El backend valida lo mismo en el envío.
   */
  get consentimientoDatosValido(): boolean {
    return this.model.consentimientoDatosPersonales === true;
  }

  get datosPersonalesValidos(): boolean {
    const m = this.model;
    return (
      this.lleno(m.nombresCompletos) &&
      !!m.fechaNacimiento &&
      !this.esMenorDeEdad &&
      !!m.estadoCivilId &&
      !!m.tipoDocumentoId &&
      this.documentoValido &&
      !!m.distritoId &&
      this.lleno(m.correoElectronico) &&
      this.lleno(m.numeroCelular) &&
      this.lleno(m.pretensionesSalariales) &&
      !!m.disponibilidadId
    );
  }

  get estudiosValidos(): boolean {
    const m = this.model;
    return this.lleno(m.profesion) && !!m.universidadId && !!m.gradoAcademicoId;
  }

  get experienciaValida(): boolean {
    const m = this.model;
    return (
      this.lleno(m.empresa) &&
      this.lleno(m.areaTrabajo) &&
      this.lleno(m.cargo) &&
      !!m.fechaInicio &&
      !this.fechasExperienciaInvertidas &&
      !!m.motivoCeseId &&
      this.lleno(m.funcionesPrincipales) &&
      this.lleno(m.logros) &&
      this.lleno(m.ingresoBrutoMensual) &&
      this.lleno(m.jefeInmediato) &&
      m.autorizaVerificacionReferencias !== null
    );
  }

  get puedeEnviar(): boolean {
    return (
      this.cvValido &&
      this.model.declaracionVeracidad === true &&
      this.model.confirmacionDocumentos === true
    );
  }

  get pasoActualValido(): boolean {
    switch (this.paso) {
      case 1: return this.consentimientoDatosValido;
      case 2: return this.datosPersonalesValidos;
      case 3: return this.estudiosValidos;
      case 4: return this.experienciaValida;
      case 5: return this.puedeEnviar;
      default: return false;
    }
  }

  // ── Navegación ───────────────────────────────────────────────────────────
  siguiente(): void {
    if (!this.pasoActualValido) {
      this.avisoIncompleto();
      return;
    }
    if (this.paso < this.totalPasos) {
      this.paso++;
      this.scrollTop();
    }
  }

  anterior(): void {
    if (this.paso > 1) {
      this.paso--;
      this.scrollTop();
    }
  }

  private scrollTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private avisoIncompleto(): void {
    // La fecha de nacimiento de un menor de edad sí está "completa": con el mensaje genérico el
    // postulante buscaría un campo vacío que no existe, así que se avisa aparte.
    if (this.paso === 2 && this.esMenorDeEdad) {
      Swal.fire({
        icon: 'warning',
        title: 'Revisa tu fecha de nacimiento',
        text: `Debes tener al menos ${this.edadMinima} años cumplidos para postular.`,
        confirmButtonColor: 'var(--color-abril-primary-dark)',
      });
      return;
    }

    // Las fechas invertidas se avisan aparte: es lo único de esta pantalla que no se resuelve
    // "completando" algo, así que el mensaje genérico dejaría al postulante sin saber qué corregir.
    if (this.paso === 4 && this.fechasExperienciaInvertidas) {
      Swal.fire({
        icon: 'warning',
        title: 'Revisa las fechas',
        text: 'La fecha de término no puede ser anterior a la fecha de inicio en la empresa.',
        confirmButtonColor: 'var(--color-abril-primary-dark)',
      });
      return;
    }

    // El CV no es un campo que se "complete": si falta, el mensaje genérico dejaría al postulante
    // buscando un campo vacío entre las declaraciones.
    if (this.paso === 5 && !this.cvValido) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta tu CV',
        text: 'Adjunta tu CV documentado (PDF, DOC o DOCX) para poder enviar el formulario.',
        confirmButtonColor: 'var(--color-abril-primary-dark)',
      });
      return;
    }

    // Los dos pasos de consentimiento no tienen "campos obligatorios" que completar sino
    // declaraciones que marcar, así que cada uno dice lo suyo.
    if (this.paso === 1 || this.paso === 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Consentimiento requerido',
        text:
          this.paso === 1
            ? 'Debes autorizar el tratamiento de tus datos personales para continuar con el formulario.'
            : 'Debes confirmar la veracidad de la información y que completaste los documentos requeridos.',
        confirmButtonColor: 'var(--color-abril-primary-dark)',
      });
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Faltan datos',
      text: 'Completa los campos obligatorios de esta sección antes de continuar.',
      confirmButtonColor: 'var(--color-abril-primary-dark)',
    });
  }

  enviar(): void {
    // El backend rechaza el envío sin consentimiento: si por lo que sea se llegó hasta acá sin él,
    // se devuelve al paso 0 en vez de mostrar el error del servidor.
    if (!this.consentimientoDatosValido) {
      this.paso = 1;
      this.scrollTop();
      this.avisoIncompleto();
      return;
    }

    if (!this.puedeEnviar) {
      // El aviso del paso 5 ya distingue el CV faltante de las declaraciones sin marcar.
      this.avisoIncompleto();
      return;
    }

    this.enviando = true;
    // App zoneless: forzamos el refresco para reflejar el estado de envío y la pantalla final.
    this.service.guardarPublico(this.token, this.model, this.cv?.file ?? null).subscribe({
      next: () => {
        this.enviando = false;
        this.enviado = true;
        this.cdr.detectChanges();
        this.scrollTop();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'No se pudo enviar',
          text: err.error?.message ?? 'Ocurrió un error al enviar el formulario. Inténtalo nuevamente.',
          confirmButtonColor: 'var(--color-abril-primary-dark)',
        });
      },
    });
  }

  /** Setea un consentimiento booleano (Sí/No). */
  setBool(
    campo:
      | 'consentimientoDatosPersonales'
      | 'autorizaVerificacionReferencias'
      | 'declaracionVeracidad'
      | 'confirmacionDocumentos',
    valor: boolean,
  ): void {
    this.model[campo] = valor;
  }
}
