import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AccidenteIncidenteService } from '../../accidente-incidente.service';
import {
  CrearFlashReportRequest,
  DescansoRequest,
  FlashReportInicializarDto,
  FlashProyectoDto,
  CatalogoItemDto,
  ContratistaCatalogoDto,
  TrabajadorCatalogoDto,
  ProyectoContratistaDto,
  TrabajadorAfectadoRequest,
  NIVELES_CONSECUENCIA,
  TURNOS,
  TIPOS_CONTACTO,
  NIVELES_CONSECUENCIA_INCIDENTE,
  AREAS_ORIGEN,
} from '../../accidente-incidente.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { WorkerSearchService } from '../../../../salud-ocupacional/services/worker-search.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-accidente-crear-editar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SearchSelect, AbrilModalPanel],
  templateUrl: './accidente-crear-editar.component.html',
  styleUrl: './accidente-crear-editar.component.css',
})
export class AccidenteCrearEditarComponent implements OnInit {
  modoEditar = false;
  id?: number;
  guardando = false;
  cargando = true;
  yaEnviado = false;

  init?: FlashReportInicializarDto;

  // listas para selects
  proyectos: FlashProyectoDto[] = [];
  tipos: CatalogoItemDto[] = [];
  etapas: CatalogoItemDto[] = [];
  partes: CatalogoItemDto[] = [];
  empresasAbril: CatalogoItemDto[] = [];
  partidas: CatalogoItemDto[] = [];
  contratistas: ContratistaCatalogoDto[] = [];
  trabajadores: TrabajadorCatalogoDto[] = [];
  proyectoContratistas: ProyectoContratistaDto[] = [];

  // estado local (no va al form)
  jefeInmediatoWorkerId?: number;
  elaboradoPorWorkerId?: number;
  sinTrabajadorAfectado = false;

  // "Elaborado por" — fijo, resuelto del usuario logueado (solo al crear; no aplica en edición)
  resolviendoObservador = true;
  sinWorkerVinculado = false;

  // Correo del elaborador: por defecto el del trabajador logueado; se puede
  // sobrescribir manualmente activando el checkbox (siempre debe ser @abril.pe).
  emailTrabajadorLogueado?: string;
  usarOtroCorreo = false;

  // @abril.pe sin espacios, tildes ni símbolos raros.
  private readonly correoAbrilRegex = /^[a-z0-9._-]+@abril\.pe$/;

  trabajadorNuevo: TrabajadorAfectadoRequest = { trabajadorNombre: '' };

  readonly nivelesConsecuencia = NIVELES_CONSECUENCIA;
  readonly nivelesOpciones = [1, 2, 3, 4, 5, 6];
  readonly turnos = TURNOS;
  readonly tiposContacto = TIPOS_CONTACTO;
  readonly areasOrigen = AREAS_ORIGEN;

  // Tipo de empresa: 'abril' | 'contratista'
  tipoEmpresa: 'abril' | 'contratista' = 'abril';

  // Fotos preview
  foto1Preview: string | null = null;
  foto2Preview: string | null = null;

  form: CrearFlashReportRequest = {
    proyectoId: 0,
    tipoId: 0,
    areaOrigen: 'Produccion',
    fecha: new Date().toISOString().substring(0, 10),
    hora: '',
    lugarExacto: '',
    descripcion: '',
    danioProcesFlag: false,
    descansos: [],
    trabajadores: [],
  };

  errores: Record<string, string> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: AccidenteIncidenteService,
    private workerSearchService: WorkerSearchService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private location: Location,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEditar = true;
      this.id = Number(idParam);
    }

    this.loaderService.show();
    this.service.inicializar().subscribe({
      next: (init) => {
        this.init = init;
        this.proyectos = init.proyectos;
        this.tipos = init.tipos;
        this.etapas = init.etapasProyecto;
        this.partes = init.partesAfectadas;
        this.empresasAbril = init.empresasAbril;
        this.partidas = init.partidas;
        this.contratistas = init.contratistas;
        this.trabajadores = init.trabajadores;
        this.proyectoContratistas = init.proyectoContratistas ?? [];

        if (this.modoEditar) {
          this.resolviendoObservador = false;
          this.cargarDetalle();
        } else {
          this.cargando = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          this.resolverElaboradoPorActual();
        }
      },
      // Si falla la inicialización hay que apagar también resolviendoObservador: si no, el
      // formulario se queda con el esqueleto de carga puesto para siempre y sin mostrar error.
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.cargando = false;
        this.resolviendoObservador = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  cargarDetalle(): void {
    this.service.getDetalle(this.id!).subscribe({
      next: (res) => {
        this.tipoEmpresa = res.empresaAbrilId ? 'abril' : 'contratista';
        this.yaEnviado = res.enviado;
        this.form = {
          proyectoId: res.proyectoId,
          tipoId: res.tipoId,
          areaOrigen: res.areaOrigen ?? 'Produccion',
          fecha: res.fecha.substring(0, 10),
          hora: res.hora ?? '',
          lugarExacto: res.lugarExacto,
          descripcion: res.descripcion,
          empresaAbrilId: res.empresaAbrilId,
          contributorId: res.contributorId,
          jefeInmediatoNombre: res.jefeInmediatoNombre,
          etapaProyectoId: res.etapaProyectoId,
          partidaId: res.partidaId,
          workerId: res.workerId,
          trabajadorNombre: res.trabajadorNombre,
          puestoTrabajo: res.puestoTrabajo,
          edad: res.edad,
          aniosExperiencia: res.aniosExperiencia,
          celularTrabajador: res.celularTrabajador,
          parteAfectadaId: res.parteAfectadaId,
          turno: res.turno,
          tipoContacto: res.tipoContacto,
          danioProcesFlag: res.danioProcesFlag ?? false,
          atencionMedica: res.atencionMedica,
          centroAtencion: res.centroAtencion,
          danoProceso: res.danoProceso,
          consecuenciaRealPersonal: res.consecuenciaRealPersonal,
          consecuenciaPotencialPersonal: res.consecuenciaPotencialPersonal,
          accionesInmediatas: res.accionesInmediatas,
          elaboradoPorNombre: res.elaboradoPorNombre,
          elaboradoPorCargo: res.elaboradoPorCargo,
          elaboradoPorEmail: res.elaboradoPorEmail,
          elaboradoPorTelefono: res.elaboradoPorTelefono,
          descansos: res.descansos.map((d) => ({
            fechaInicio: d.fechaInicio.substring(0, 10),
            fechaFin: d.fechaFin.substring(0, 10),
            observacion: d.observacion,
          })),
          trabajadores: [],
        };
        const primerTrabajador = (res.trabajadores ?? [])[0];
        this.trabajadorNuevo = primerTrabajador
          ? {
              workerId: primerTrabajador.workerId,
              trabajadorNombre: primerTrabajador.trabajadorNombre,
              puestoTrabajo: primerTrabajador.puestoTrabajo,
              edad: primerTrabajador.edad,
              aniosExperiencia: primerTrabajador.aniosExperiencia,
              celularTrabajador: primerTrabajador.celularTrabajador,
              parteAfectadaId: primerTrabajador.parteAfectadaId,
            }
          : { trabajadorNombre: '' };
        this.sinTrabajadorAfectado = !primerTrabajador;
        if (res.urlFoto1) this.cargarBlobFoto(1);
        if (res.urlFoto2) this.cargarBlobFoto(2);
        this.cargando = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.cargando = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Fotos ──────────────────────────────────────────────────────────────────

  private cargarBlobFoto(slot: 1 | 2): void {
    const token = localStorage.getItem('access_token');
    const url = this.service.getFotoUrl(this.id!, slot);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        if (slot === 1) this.foto1Preview = blobUrl;
        else this.foto2Preview = blobUrl;
        this.cdr.detectChanges();
      })
      .catch(() => this.cdr.detectChanges());
  }

  onFotoSelect(event: Event, slot: 1 | 2): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      if (slot === 1) {
        this.form.foto1Base64 = b64;
        this.foto1Preview = b64;
      } else {
        this.form.foto2Base64 = b64;
        this.foto2Preview = b64;
      }
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  quitarFoto(slot: 1 | 2): void {
    if (slot === 1) { this.form.foto1Base64 = undefined; this.foto1Preview = null; }
    else { this.form.foto2Base64 = undefined; this.foto2Preview = null; }
    this.cdr.detectChanges();
  }

  // ── Descansos ──────────────────────────────────────────────────────────────

  agregarDescanso(): void {
    this.form.descansos.push({ fechaInicio: '', fechaFin: '' });
    this.cdr.detectChanges();
  }

  quitarDescanso(i: number): void {
    this.form.descansos.splice(i, 1);
    this.cdr.detectChanges();
  }

  // ── Proyecto change ────────────────────────────────────────────────────────

  onProyectoChange(id: number): void {
    this.form.proyectoId = id;
    this.form.empresaAbrilId = undefined;
    this.form.contributorId = undefined;
    this.jefeInmediatoWorkerId = undefined;
    this.form.jefeInmediatoNombre = undefined;
    this.cdr.detectChanges();
  }

  // ── Empresa change ─────────────────────────────────────────────────────────

  onEmpresaChange(): void {
    this.jefeInmediatoWorkerId = undefined;
    this.form.jefeInmediatoNombre = undefined;
    this.cdr.detectChanges();
  }

  // ── Jefe inmediato ─────────────────────────────────────────────────────────

  onJefeSelect(id: number | undefined): void {
    this.jefeInmediatoWorkerId = id;
    if (id) {
      const w = this.trabajadores.find((t) => t.id === id);
      this.form.jefeInmediatoNombre = w?.nombreCompleto;
    } else {
      this.form.jefeInmediatoNombre = undefined;
    }
    this.cdr.detectChanges();
  }

  // ── Trabajador autocompletado ──────────────────────────────────────────────

  onTrabajadorSelect(id: number | undefined): void {
    this.trabajadorNuevo.workerId = id;
    if (id) {
      const t = this.trabajadores.find((w) => w.id === id);
      if (t) {
        this.trabajadorNuevo.trabajadorNombre = t.nombreCompleto;
        this.trabajadorNuevo.puestoTrabajo = t.cargo ?? this.trabajadorNuevo.puestoTrabajo;
        this.trabajadorNuevo.edad = t.edad ?? this.trabajadorNuevo.edad;
        this.trabajadorNuevo.aniosExperiencia = t.aniosExperiencia ?? this.trabajadorNuevo.aniosExperiencia;
      }
    }
    this.cdr.detectChanges();
  }

  /**
   * "Elaborado por" ya no es un campo editable: se resuelve siempre desde el trabajador
   * vinculado al usuario logueado (Abril vía Person, contratista vía ss_contratista_usuario).
   * Si no hay vínculo, se bloquea el formulario completo. Solo aplica al crear — en edición
   * el dato ya viene guardado desde el registro original.
   */
  private resolverElaboradoPorActual(): void {
    this.resolviendoObservador = true;
    this.workerSearchService.getMe().subscribe({
      next: (me) => {
        this.sinWorkerVinculado = false;
        this.resolviendoObservador = false;
        this.elaboradoPorWorkerId = me.id;
        this.form.elaboradoPorNombre = me.apellidoNombre;
        this.form.elaboradoPorCargo = me.cargo || me.puesto || '';

        // Correo por defecto: el corporativo del trabajador logueado. Si su ficha no
        // tiene un @abril.pe válido, forzamos el modo manual para que lo escriba.
        const emailMe = (me.emailCorporativo ?? '').trim().toLowerCase();
        if (this.correoAbrilRegex.test(emailMe)) {
          this.emailTrabajadorLogueado = emailMe;
          this.usarOtroCorreo = false;
          this.form.elaboradoPorEmail = emailMe;
        } else {
          this.emailTrabajadorLogueado = undefined;
          this.usarOtroCorreo = true;
          this.form.elaboradoPorEmail = '';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.sinWorkerVinculado = true;
        this.resolviendoObservador = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Al (des)activar "Usar otro correo": si se apaga, vuelve al del trabajador logueado. */
  onToggleOtroCorreo(): void {
    if (!this.usarOtroCorreo) {
      this.form.elaboradoPorEmail = this.emailTrabajadorLogueado ?? '';
      delete this.errores['elaboradoPorEmail'];
    } else {
      this.form.elaboradoPorEmail = '';
    }
    this.cdr.detectChanges();
  }

  // ── Validación y guardado ──────────────────────────────────────────────────

  validar(): boolean {
    this.errores = {};

    // Correo del elaborador: obligatorio y @abril.pe limpio (es el destinatario del reporte).
    const email = (this.form.elaboradoPorEmail ?? '').trim().toLowerCase();
    if (!email) {
      this.errores['elaboradoPorEmail'] = 'El correo del elaborador es obligatorio.';
    } else if (!this.correoAbrilRegex.test(email)) {
      this.errores['elaboradoPorEmail'] =
        'Debe ser un correo @abril.pe válido (sin espacios ni símbolos).';
    } else {
      this.form.elaboradoPorEmail = email; // normalizado
    }

    if (!this.form.proyectoId) this.errores['proyectoId'] = 'Proyecto requerido.';
    if (!this.form.tipoId) this.errores['tipoId'] = 'Tipo requerido.';
    if (!this.form.fecha) this.errores['fecha'] = 'Fecha requerida.';
    if (!this.form.lugarExacto?.trim()) this.errores['lugarExacto'] = 'Lugar exacto requerido.';
    if (!this.form.descripcion?.trim()) this.errores['descripcion'] = 'Descripción requerida.';
    if (!this.form.accionesInmediatas?.trim()) this.errores['accionesInmediatas'] = 'Acciones inmediatas requeridas.';

    const hayTrabajadorCargado = !!this.trabajadorNuevo.trabajadorNombre?.trim();

    // Incidente con primeros auxilios (N2) obliga a registrar al trabajador afectado
    const primerAuxilio = this.esIncidente && this.form.consecuenciaRealPersonal === 2;
    if (primerAuxilio && this.sinTrabajadorAfectado) {
      this.sinTrabajadorAfectado = false; // forzar sección visible
      this.errores['trabajadores'] = 'Con primeros auxilios (N2) debe registrar al trabajador afectado.';
    } else if (!this.sinTrabajadorAfectado && !this.esIncidente && !hayTrabajadorCargado) {
      this.errores['trabajadores'] = 'Debe registrar al trabajador afectado.';
    } else if (!this.sinTrabajadorAfectado && primerAuxilio && !hayTrabajadorCargado) {
      this.errores['trabajadores'] = 'Con primeros auxilios debe registrar al trabajador que recibió atención.';
    }

    return Object.keys(this.errores).length === 0;
  }

  guardar(): void {
    if (this.sinWorkerVinculado) return;
    if (!this.validar()) { this.cdr.detectChanges(); return; }

    // Un único trabajador afectado por Flash Report (SSO-FO-035: un reporte por accidentado)
    this.form.trabajadores =
      !this.sinTrabajadorAfectado && this.trabajadorNuevo.trabajadorNombre?.trim()
        ? [{ ...this.trabajadorNuevo }]
        : [];

    // Limpiar empresa no usada
    if (this.tipoEmpresa === 'abril') this.form.contributorId = undefined;
    else this.form.empresaAbrilId = undefined;

    this.guardando = true;
    this.cdr.detectChanges();
    this.loaderService.show();

    const obs$ = this.modoEditar
      ? this.service.actualizar(this.id!, this.form)
      : this.service.crear(this.form);

    obs$.subscribe({
      next: async (res: any) => {
        this.guardando = false;
        this.loaderService.hide();
        await Swal.fire({
          icon: 'success',
          title: this.modoEditar ? 'Actualizado' : 'Flash Report creado',
          text: res.message ?? 'Operación exitosa.',
          timer: 1800,
          showConfirmButton: false,
        });
        const destId = this.modoEditar ? this.id! : res.id;
        this.router.navigate(['/ssoma/gestion/accidentes-incidentes', destId]);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  cancelar(): void {
    if (this.modoEditar) this.router.navigate(['/ssoma/gestion/accidentes-incidentes', this.id]);
    else this.location.back();
  }

  get tipoCodigo(): string {
    return this.tipos.find((t) => t.id === this.form.tipoId)?.codigo ?? '';
  }

  get esIncidente(): boolean {
    return this.tipoCodigo === 'IN';
  }

  // Consecuencia REAL: incidente solo N1-N2 (sin daño / primeros auxilios)
  get nivelesReal(): number[] {
    return this.esIncidente ? [1, 2] : this.nivelesOpciones;
  }

  // Consecuencia POTENCIAL: siempre todos (lo que PODRÍA haber pasado)
  get nivelesPotencial(): number[] {
    return this.nivelesOpciones;
  }

  get titulo(): string {
    return this.modoEditar ? 'Editar Flash Report' : 'Nuevo Flash Report';
  }

  proyectosOpts() {
    return this.proyectos.map((p) => ({ projectId: p.id, projectDescription: p.nombre }));
  }

  trabajadoresOpts() {
    return this.trabajadores.map((t) => ({ id: t.id, label: `${t.nombreCompleto}${t.cargo ? ' — ' + t.cargo : ''}` }));
  }

  contratistasDelProyecto() {
    if (!this.form.proyectoId) return this.contratistas;
    const ids = new Set(
      this.proyectoContratistas
        .filter((pc) => pc.proyectoId === this.form.proyectoId)
        .map((pc) => pc.contributorId),
    );
    return ids.size ? this.contratistas.filter((c) => ids.has(c.id)) : this.contratistas;
  }

  empresasAbrilDelProyecto() {
    return this.empresasAbril;
  }

  jefeInmediatoOpts() {
    const contributorId = this.tipoEmpresa === 'abril' ? this.form.empresaAbrilId : this.form.contributorId;
    const workers = contributorId
      ? this.trabajadores.filter((w) => w.contributorId === contributorId)
      : this.trabajadores;
    return workers.map((w) => ({ id: w.id, label: `${w.nombreCompleto}${w.cargo ? ' — ' + w.cargo : ''}` }));
  }

  partidasOpts() {
    return this.partidas.map((p) => ({ id: p.id, nombre: p.nombre }));
  }

  turnosOpts() {
    return this.turnos.map((t) => ({ value: t, label: t }));
  }

  readonly tipoContactoOpts = [
    { value: 'Golpe por objeto en movimiento', label: 'Golpe por objeto en movimiento' },
    { value: 'Golpe contra objeto fijo', label: 'Golpe contra objeto fijo' },
    { value: 'Caída al mismo nivel', label: 'Caída al mismo nivel' },
    { value: 'Caída a distinto nivel', label: 'Caída a distinto nivel' },
    { value: 'Atrapamiento entre objetos', label: 'Atrapamiento entre objetos' },
    { value: 'Sobreesfuerzo / esfuerzo ergonómico', label: 'Sobreesfuerzo / esfuerzo ergonómico' },
    { value: 'Contacto con energía eléctrica', label: 'Contacto con energía eléctrica' },
    { value: 'Contacto con sustancia química o caliente', label: 'Contacto con sustancia química o caliente' },
    { value: 'Colisión vehicular', label: 'Colisión vehicular' },
    { value: 'Daño a equipo / maquinaria', label: 'Daño a equipo / maquinaria' },
    { value: 'Daño a material o producto', label: 'Daño a material o producto' },
    { value: 'Daño a infraestructura', label: 'Daño a infraestructura' },
    { value: 'Derrame de sustancias', label: 'Derrame de sustancias' },
    { value: 'Incendio / conato de incendio', label: 'Incendio / conato de incendio' },
    { value: 'Otro', label: 'Otro' },
  ];

  nivelesRealOpts() {
    return this.nivelesReal.map((n) => ({ value: n, label: this.nivelesConsecuencia[n] }));
  }

  nivelesPotencialOpts() {
    return this.nivelesPotencial.map((n) => ({ value: n, label: this.nivelesConsecuencia[n] }));
  }

  readonly atencionMedicaOpts = [
    { value: 'Tópico de obra', label: 'Tópico de obra' },
    { value: 'Tópico de oficina', label: 'Tópico de oficina' },
    { value: 'Clínica', label: 'Clínica' },
    { value: 'Hospital', label: 'Hospital' },
  ];
}
