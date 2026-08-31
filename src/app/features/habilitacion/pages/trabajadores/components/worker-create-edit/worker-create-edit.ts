import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../../../../shared/components/date-picker/date-picker';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { Roles } from '../../../../../../core/constants/roles';
import { ProjectService } from '../../../../../../core/services/project.service';
import { WorkerService } from '../../../../../ssoma/salud-ocupacional/services/worker.service';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';
import { EmpresaContratistaService } from '../../../../services/empresa-contratista.service';
import { TrabajadorRestringidoService } from '../../../../services/trabajador-restringido.service';
import { CatalogosHabService } from '../../../../services/catalogos-hab.service';
import { PersonService } from '../../../../../../core/services/person.service';
import { WorkerUpsertDto } from '../../../../../ssoma/salud-ocupacional/dtos/emo.model';
import { WorkerHabilitacionListDto } from '../../../../dtos/trabajador.model';
import { EmpresaContratistaListDto } from '../../../../dtos/empresa.model';
import {
  AreaArbolNodoDto,
  AreaArbolRevisorDto,
  JefeCandidatoDto,
  ObraOficinaStaffDto,
} from '../../../../dtos/catalogos.model';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';

/** Un nivel de la cascada de áreas: los hermanos disponibles y el nodo elegido en ese nivel. */
interface AreaLevel {
  options: AreaArbolNodoDto[];
  /** areaScopeId elegido, o null si el nivel está vacío. */
  selected: number | null;
}

interface WorkerFormModel {
  tipoDocumento: 'DNI' | 'CE';
  apellidoNombre: string;
  dni: string;
  celular: string;
  /**
   * FK a `categoria`. NO se guarda: es solo el filtro que acota el desplegable de puestos y
   * muestra a qué categoría pertenece el que se eligió.
   */
  categoriaId: number | null;
  /**
   * FK a `puesto`: el único campo que se guarda de los dos. Es el nombre que se muestra y,
   * a la vez, el camino a la categoría (todo puesto pertenece a una).
   */
  puestoId: number | null;
  /**
   * Nodo del árbol de áreas (workers.area_scope_id): el único dato de área que captura el
   * formulario. Los campos legacy area/subarea/jefatura los deriva el backend a partir de él.
   */
  areaScopeId: number | null;
  /**
   * area/subarea/jefatura legacy tal como vinieron del backend. No son editables: solo se
   * reenvían intactos cuando el formulario no gestiona el área (obreros y contratistas), para
   * no borrar lo que ya estaba guardado. Ver `gestionaArea`.
   */
  area: string;
  subarea: string;
  contrataCasa: string;
  /** FK a workers_obra_oficina_staff (lo que se guarda). */
  obraOficinaStaffId: number | null;
  /** Nombre del catálogo; solo lo usa el propio formulario para decidir qué campos mostrar. */
  obraOficina: string;
  jefatura: string;
  /**
   * true = el trabajador tiene un jefe elegido a mano, que se sobrepone al revisor de su área.
   * Es lo que prende el checkbox "Jefe personalizado" y convierte el campo de solo lectura en
   * un desplegable.
   */
  jefePersonalizado: boolean;
  /** Jefe elegido a mano (workers.id). Solo cuenta cuando `jefePersonalizado` es true. */
  jefePersonalizadoWorkerId: number | null;
  sctr: boolean;
  habilitadoObra: boolean;
  notas: string;
  empresaId: number | null;
  proyectoId: number | null;
  emailCorporativo: string;
  emailPersonal: string;
  fechaIngreso: string;
  condicionMedica: string;
  fechaNacimiento: string;
  /**
   * Checkbox "Mostrar en el boletín" (person.mostrar_en_boletin): si su cumpleaños sale en el
   * calendario del boletín. Arranca en true — quien no quiera figurar se desmarca a mano.
   */
  mostrarEnBoletin: boolean;
  sexo: string;
  aniosExperiencia: number | null;
}

@Component({
  selector: 'app-worker-create-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, DatePicker],
  templateUrl: './worker-create-edit.html',
  styleUrl: './worker-create-edit.css',
})
export class WorkerCreateEdit implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() worker: WorkerHabilitacionListDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() buscarWorker = new EventEmitter<string>();

  model: WorkerFormModel = this.emptyModel();
  saving = false;
  loadingDetalle = false;
  verificandoDni = false;
  dniRestringido = false;
  dniVerificado = false;

  /** Verificación del correo corporativo contra el directorio de Abril (ver onEmailCorporativoBlur). */
  verificandoEmail = false;
  emailError = '';
  emailVerificadoNombre = '';
  /**
   * Correo con el que se abrió la edición. Se acepta sin verificar, igual que hace el backend:
   * hay fichas antiguas con correos que hoy no pasarían la validación y no deben bloquear la
   * corrección de otros campos.
   */
  private emailOriginal = '';
  /** Último correo verificado con éxito, para no repetir la consulta en cada blur. */
  private emailVerificado = '';
  /**
   * Si la ficha ya traía algún correo al abrirla. Solo se exige "al menos un correo" cuando lo
   * tenía: hay miles de fichas legadas sin ninguno y no deben quedar imposibles de editar, pero
   * tampoco se puede borrar el último correo de las que sí lo tienen (misma regla que el backend).
   */
  private teniaAlgunCorreo = false;
  /**
   * Lo mismo que `teniaAlgunCorreo` pero solo del personal, que es el correo que Obra sigue
   * exigiendo aunque ahora también capture el corporativo (ver `faltaCorreo`).
   */
  private teniaEmailPersonal = false;

  empresas: EmpresaContratistaListDto[] = [];
  proyectos: ProjectGetDTO[] = [];
  categorias: { id: number; nombre: string }[] = [];
  /** Catálogo completo de puestos; el desplegable muestra `puestosFiltrados`. */
  puestos: { id: number; nombre: string; categoriaId: number | null }[] = [];
  empresaContratistaNombre = '';

  /**
   * Desplegables en cascada del árbol de áreas (uno por nivel), mismo patrón que
   * Configuración → Trabajadores. Se guarda el último nodo elegido, sin obligar a llegar a una hoja.
   */
  areaLevels: AreaLevel[] = [];
  /** Nodos del árbol tal como los devuelve el backend (planos, con revisor ya resuelto). */
  private areaNodos: AreaArbolNodoDto[] = [];
  private areaPorId = new Map<number, AreaArbolNodoDto>();
  /** areaScopeParentId → hijos. La clave null son las raíces (gerencias). */
  private areaHijos = new Map<number | null, AreaArbolNodoDto[]>();
  cargandoAreas = false;

  /**
   * Acento de los componentes compartidos (app-search-select / app-date-picker) del formulario:
   * el teal estándar de la app, para que combos y fechas se lean como un solo control.
   */
  readonly accentColor = 'var(--color-abril-standard)';

  /**
   * Catálogos fijos de los desplegables. Todos van con `[sortAlpha]="false"` en el template
   * porque su orden es semántico, no alfabético.
   * En las etiquetas se evita el TODO MAYÚSCULAS: `app-search-select` lo reformatea a
   * "Nombre Propio" (así "DNI" se vería como "Dni").
   */
  /**
   * Obra / Staff / Oficina Central. Ya no es una lista hardcodeada: viene del catálogo
   * workers_obra_oficina_staff, que es también el que define la columna
   * workers.obra_oficina_staff_id (antes esto se deducía del último nodo del árbol de
   * áreas, de tipo "Área Obra_Oficina", eliminado).
   */
  obraOficinaOpciones: ObraOficinaStaffDto[] = [];

  /**
   * Trabajadores con correo corporativo @abril.pe: las opciones del desplegable que reemplaza al
   * campo de solo lectura cuando se marca "Jefe personalizado". Reemplaza a la pantalla
   * Configuración → Revisores de Trabajadores, retirada.
   */
  jefes: JefeCandidatoDto[] = [];

  /**
   * Nombre y correo del jefe personalizado tal como vinieron en el detalle. Se guardan aparte
   * porque el catálogo puede no incluirlo (trabajador retirado) y llega en cualquier orden
   * respecto del detalle: sin esto el desplegable se vería vacío en ese caso.
   */
  private jefeGuardadoNombre: string | null = null;
  private jefeGuardadoEmail: string | null = null;

  /**
   * Persona de la ficha que se está editando (`workers.person_id`), del detalle. Con ella se
   * descarta al propio trabajador de los candidatos a jefe: la misma persona puede tener varias
   * fichas en `workers` (reingreso), así que comparar solo `workerId` dejaría pasar el caso.
   */
  private workerPersonId: number | null = null;

  readonly tipoDocumentoOpciones = [
    { value: 'DNI', label: 'DNI — Documento de identidad' },
    { value: 'CE', label: 'CE — Carné de Extranjería' },
  ];

  readonly sexoOpciones = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' },
  ];

  /** Contratistas: sin "Falta" (a ese estado solo lo pone el personal de casa). */
  readonly condicionMedicaContratistaOpciones = [
    { value: 'Apto', label: 'Apto' },
    { value: 'Apto con restricciones', label: 'Apto con restricciones' },
  ];

  readonly condicionMedicaCasaOpciones = [
    { value: 'Apto', label: 'Apto' },
    { value: 'Apto con restricciones', label: 'Apto con restricciones' },
    { value: 'Falta', label: 'Falta' },
  ];

  private destroy$ = new Subject<void>();
  private loadToken = 0;

  constructor(
    private workerService: WorkerService,
    private trabajadorHabService: TrabajadorHabService,
    private restringidoService: TrabajadorRestringidoService,
    private personService: PersonService,
    private catalogosHabService: CatalogosHabService,
    private projectService: ProjectService,
    private empresaContratistaService: EmpresaContratistaService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.resetAndLoad();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get esContratista(): boolean {
    return this.authService.isContratista();
  }

  get title(): string {
    return this.mode === 'create' ? 'Nuevo trabajador' : 'Editar trabajador';
  }

  /** En edición, solo Administrador de Obra puede corregir un DNI/CE mal digitado. */
  get dniReadonly(): boolean {
    return this.mode === 'edit' && !this.authService.hasRole(Roles.ADMINISTRADOR_DE_OBRA);
  }

  /**
   * Si el desplegable de clasificación (Obra / Staff / Oficina Central) se puede tocar.
   *
   * En edición solo se puede ASIGNAR la que falta, no cambiar una ya asignada: cambiarla es
   * exclusivo de "Cambiar obra / puesto de trabajo", el único camino que resetea el certificado
   * de aptitud, deja auditoría y bloquea la subida de riesgo Oficina Central → Staff/Obra (el
   * backend aplica la misma regla, ver WorkerSearchRepository.Update). Sin esto, las fichas con
   * la clasificación vacía quedaban sin salida: el formulario decide qué campos mostrar a partir
   * de ella, así que sin clasificación no ofrecía ni área ni jefe.
   *
   * Se mira el trabajador que abrió el modal, no el modelo: así la respuesta no cambia según el
   * orden en que lleguen el detalle y el catálogo, ni cuando el usuario limpia el desplegable.
   */
  get clasificacionEditable(): boolean {
    if (this.mode === 'create') return true;
    return !this.worker?.obraOficinaStaffId && !this.worker?.obraOficina;
  }

  /** Todo trabajador debe quedar con al menos un correo: el corporativo o el personal. */
  get tieneAlgunCorreo(): boolean {
    return !!this.model.emailCorporativo.trim() || !!this.model.emailPersonal.trim();
  }

  /**
   * True cuando falta el correo y en este contexto sí es exigible (ver teniaAlgunCorreo).
   *
   * En Obra la regla es más estricta: el corporativo es un dato opcional que se suma, no un
   * reemplazo del personal, que sigue siendo el obligatorio. Igual que con `teniaAlgunCorreo`,
   * al editar solo se exige si la ficha ya lo traía: hay fichas legadas sin correo personal que
   * no deben quedar imposibles de editar.
   */
  get faltaCorreo(): boolean {
    if (this.esObrero) {
      if (this.model.emailPersonal.trim()) return false;
      return this.mode === 'create' || this.teniaEmailPersonal;
    }
    if (this.tieneAlgunCorreo) return false;
    return this.mode === 'create' || this.teniaAlgunCorreo;
  }

  get canSubmit(): boolean {
    const base =
      !this.saving &&
      !this.verificandoDni &&
      !this.dniRestringido &&
      !this.verificandoEmail &&
      !this.emailError &&
      !this.faltaCorreo &&
      !this.faltaJefePersonalizado &&
      !!this.model.apellidoNombre.trim() &&
      (this.mode === 'edit' || !!this.model.dni.trim());

    // En edición se permite guardar cambios parciales: muchos trabajadores
    // legados tienen campos obligatorios de alta (email, celular, años de
    // experiencia, etc.) incompletos, y no deben bloquear correcciones puntuales
    // como Área/Subárea. La validación completa de obligatorios solo aplica al crear.
    if (this.mode === 'edit') {
      return base;
    }

    if (this.esContratista) {
      return (
        base &&
        !!this.model.proyectoId &&
        this.model.puestoId != null &&
        !!this.model.condicionMedica.trim() &&
        !!this.model.fechaIngreso.trim() &&
        this.model.aniosExperiencia !== null &&
        this.model.aniosExperiencia !== undefined
      );
    }

    const baseCasa =
      base &&
      !!this.model.obraOficina &&
      !!this.model.fechaNacimiento.trim() &&
      !!this.model.condicionMedica.trim() &&
      !!this.model.empresaId &&
      this.model.aniosExperiencia !== null &&
      this.model.aniosExperiencia !== undefined;

    // El corporativo ya no es obligatorio por sí solo: basta con que haya alguno de los dos
    // correos (lo cubre `faltaCorreo` dentro de `base`).
    if (this.esStaffOOficina) {
      return baseCasa && !!this.model.celular.trim() && !!this.model.areaScopeId;
    }

    return baseCasa;
  }

  get mostrarProyecto(): boolean {
    return !this.esContratista && this.model.contrataCasa === 'Casa';
  }

  get sctrEditable(): boolean {
    return this.model.obraOficina === 'Oficina Central';
  }

  get esCasa(): boolean {
    return this.model.contrataCasa === 'Casa';
  }

  get esObrero(): boolean {
    return this.esCasa && this.model.obraOficina === 'Obra';
  }

  get esStaffOOficina(): boolean {
    return this.esCasa && (this.model.obraOficina === 'Staff' || this.model.obraOficina === 'Oficina Central');
  }

  get esOficinaCentral(): boolean {
    return this.model.obraOficina === 'Oficina Central';
  }

  /**
   * True cuando el formulario muestra (y por tanto es dueño de) los desplegables de área. En Obra
   * y en contratistas no se capturan, así que ahí el área guardada se reenvía intacta en vez de
   * mandar nulls que la borrarían.
   */
  get gestionaArea(): boolean {
    return this.esStaffOOficina;
  }

  /**
   * True cuando el formulario muestra (y por tanto es dueño de) el jefe del trabajador. Lo
   * gestionan las tres clasificaciones de personal de casa, con dos presentaciones distintas:
   * Staff/Oficina Central detrás del checkbox "Jefe personalizado" (el campo muestra por defecto
   * el revisor que sugiere su área), y Obra como un desplegable opcional suelto — un obrero no
   * tiene área en el árbol, así que no hay revisor de área que sugerirle y sin jefe elegido cae
   * al fallback de GTH. En contratistas no se captura y el backend deja intacto lo guardado.
   */
  get gestionaJefe(): boolean {
    return this.esStaffOOficina || this.esObrero;
  }

  /**
   * True cuando el formulario muestra el campo "Email corporativo". En Staff/Oficina Central es
   * el correo principal del trabajador; en Obra es un dato opcional que se suma al personal (hay
   * obreros con cuenta del tenant: capataces, maestros de obra). En contratistas no se captura.
   */
  get gestionaEmailCorporativo(): boolean {
    return this.esStaffOOficina || this.esObrero;
  }

  private emptyModel(): WorkerFormModel {
    return {
      tipoDocumento: 'DNI' as const,
      apellidoNombre: '',
      dni: '',
      celular: '',
      categoriaId: null,
      puestoId: null,
      areaScopeId: null,
      area: '',
      subarea: '',
      contrataCasa: '',
      obraOficinaStaffId: null,
      obraOficina: '',
      jefatura: '',
      jefePersonalizado: false,
      jefePersonalizadoWorkerId: null,
      sctr: true,
      habilitadoObra: false,
      notas: '',
      empresaId: null,
      proyectoId: null,
      emailCorporativo: '',
      emailPersonal: '',
      fechaIngreso: '',
      condicionMedica: '',
      fechaNacimiento: '',
      mostrarEnBoletin: true,
      sexo: '',
      aniosExperiencia: null,
    };
  }

  private resetAndLoad(): void {
    this.saving = false;
    this.loadingDetalle = false;
    this.verificandoDni = false;
    this.dniRestringido = false;
    this.dniVerificado = false;
    this.resetEstadoEmail();
    this.emailOriginal = '';
    this.teniaAlgunCorreo = false;
    this.teniaEmailPersonal = false;
    this.empresaContratistaNombre = '';
    this.jefeGuardadoNombre = null;
    this.jefeGuardadoEmail = null;
    this.workerPersonId = null;

    // Token de carga: si el usuario cambia de trabajador antes de que responda
    // esta petición, la respuesta llega "vieja" y no debe pisar el formulario
    // del trabajador que se está editando ahora.
    const loadToken = ++this.loadToken;

    if (this.mode === 'edit' && this.worker) {
      this.model = {
        ...this.emptyModel(),
        tipoDocumento: /^\d{8}$/.test(this.worker.dni ?? '') ? 'DNI' : 'CE',
        apellidoNombre: this.worker.apellidoNombre ?? '',
        dni: this.worker.dni ?? '',
        contrataCasa: this.worker.contrataCasa ?? '',
        obraOficinaStaffId: this.worker.obraOficinaStaffId ?? null,
        obraOficina: this.worker.obraOficina ?? '',
        empresaId: this.worker.empresaId ?? null,
        proyectoId: this.worker.proyectoActualId ?? null,
      };
      this.loadingDetalle = true;
      this.trabajadorHabService.getWorker(this.worker.workerId).subscribe({
        next: (det) => {
          if (loadToken !== this.loadToken) return;
          this.workerPersonId = det.personId ?? null;
          this.model.celular = det.celular ?? '';
          this.model.sctr = det.sctr ?? true;
          this.model.areaScopeId = det.areaScopeId ?? null;
          this.model.area = det.area ?? '';
          this.model.subarea = det.subarea ?? '';
          this.model.jefatura = det.jefatura ?? '';
          this.model.emailCorporativo = det.emailCorporativo ?? '';
          this.model.emailPersonal = det.emailPersonal ?? '';
          this.emailOriginal = this.model.emailCorporativo.trim().toLowerCase();
          this.teniaAlgunCorreo = this.tieneAlgunCorreo;
          this.teniaEmailPersonal = !!this.model.emailPersonal.trim();
          this.model.fechaIngreso = det.fechaIngreso ?? '';
          this.model.condicionMedica = det.condicionMedica ?? '';
          this.model.fechaNacimiento = det.fechaNacimiento ? det.fechaNacimiento.substring(0, 10) : '';
          // Ausente (ficha vieja, respuesta sin el campo) se trata como marcado: es el default
          // de la columna y lo que hacía el boletín antes de que el checkbox existiera.
          this.model.mostrarEnBoletin = det.mostrarEnBoletin ?? true;
          this.model.sexo = det.sexo ?? '';
          this.model.categoriaId = det.categoriaId ?? null;
          this.model.puestoId = det.puestoId ?? null;
          this.model.aniosExperiencia = det.aniosExperiencia ?? null;
          // Si ya tiene un jefe elegido a mano, el checkbox abre marcado con ese jefe: es el
          // que manda de verdad, no el revisor del área que muestra el campo por defecto.
          this.model.jefePersonalizadoWorkerId = det.jefePersonalizadoWorkerId ?? null;
          this.model.jefePersonalizado = this.model.jefePersonalizadoWorkerId != null;
          this.jefeGuardadoNombre = det.jefePersonalizadoNombre ?? null;
          this.jefeGuardadoEmail = det.jefePersonalizadoEmail ?? null;
          // El jefe puede no estar en el catálogo (p. ej. retirado): se agrega para que el
          // desplegable muestre su nombre en vez de quedarse vacío.
          this.asegurarJefeGuardadoEnOpciones();
          this.loadingDetalle = false;
          // El árbol puede haber llegado antes que el detalle: en ese caso hay que rearmar la
          // cascada ahora que ya se sabe en qué nodo está el trabajador.
          this.initAreaLevels();
          this.cdr.detectChanges();
        },
        error: () => {
          if (loadToken !== this.loadToken) return;
          this.loadingDetalle = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      this.model = this.emptyModel();
      if (!this.esContratista) {
        this.model.contrataCasa = 'Casa';
      }
    }

    // Cascada de áreas para el modelo ya reseteado. Si el árbol todavía no llegó queda solo el
    // nivel raíz vacío (mostrando "Cargando…") y se vuelve a armar cuando llega, igual que cuando
    // llega el detalle del trabajador con su nodo asignado.
    this.initAreaLevels();

    if (this.esContratista) {
      const empresaId = this.authService.getEmpresaId();
      console.log('[worker-create-edit] esContratista=true, empresaId=', empresaId);
      if (empresaId) {
        this.empresaContratistaService.getEmpresa(empresaId).subscribe({
          next: (emp) => {
            console.log('[worker-create-edit] getEmpresa OK:', emp);
            this.empresaContratistaNombre = emp?.razonSocial ?? '';
            this.cdr.detectChanges();
          },
          error: (err) => { console.error('[worker-create-edit] getEmpresa ERROR:', err); },
        });
        this.empresaContratistaService.getProyectos(empresaId).subscribe({
          next: (data) => {
            this.proyectos = data;
            if (!data.length) {
              Swal.fire({
                icon: 'warning',
                title: 'Sin proyectos afiliados',
                text: 'Tu empresa no tiene proyectos afiliados. Debes tener al menos un proyecto activo para poder registrar trabajadores.',
                confirmButtonColor: '#64BC04',
              }).then(() => this.close());
            }
            this.cdr.detectChanges();
          },
          error: () => {},
        });
      }
    } else {
      this.loadCatalogos();
    }

    this.catalogosHabService.getObraOficinaStaff().subscribe({
      next: (data) => {
        this.obraOficinaOpciones = data;
        // Si el detalle llegó antes que el catálogo, se resincroniza el id a partir del nombre.
        if (!this.model.obraOficinaStaffId && this.model.obraOficina) {
          this.model.obraOficinaStaffId =
            data.find((o) => o.name === this.model.obraOficina)?.obraOficinaStaffId ?? null;
        }
        this.cdr.detectChanges();
      },
      error: () => {},
    });
    this.catalogosHabService.getCategorias().subscribe({
      next: (data) => { this.categorias = data; this.cdr.detectChanges(); },
      error: () => {},
    });
    this.catalogosHabService.getPuestos().subscribe({
      next: (data) => { this.puestos = data; this.cdr.detectChanges(); },
      error: () => {},
    });
    this.catalogosHabService.getJefes().subscribe({
      next: (data) => {
        // El orden lo pone `app-search-select` (sortAlpha por defecto); acá basta con la lista.
        this.jefes = data;
        // El detalle pudo llegar antes que el catálogo y traer un jefe que no está en él.
        this.asegurarJefeGuardadoEnOpciones();
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  /**
   * Garantiza que el jefe guardado aparezca entre las opciones aunque el catálogo no lo traiga
   * (trabajador retirado, persona dada de baja): sin esto el desplegable se vería vacío y
   * parecería que el trabajador nunca tuvo jefe personalizado.
   */
  private asegurarJefeGuardadoEnOpciones(): void {
    const workerId = this.model.jefePersonalizadoWorkerId;
    if (workerId == null) return;
    if (this.jefes.some((j) => j.workerId === workerId)) return;
    this.jefes = [
      ...this.jefes,
      { workerId, fullName: this.jefeGuardadoNombre, email: this.jefeGuardadoEmail },
    ];
  }

  private loadCatalogos(): void {
    this.empresaContratistaService
      .getEmpresas({ soloContratistas: false, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.empresas = res.data ?? [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.empresas = [];
        },
      });

    this.projectService
      .getProjectsPaged({ page: 1, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.proyectos = res.data ?? [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.proyectos = [];
        },
      });

    this.cargandoAreas = true;
    this.catalogosHabService
      .getAreaArbol()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.setAreaArbol(data);
          this.cargandoAreas = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.cargandoAreas = false;
        },
      });
  }

  // ── Árbol de áreas ───────────────────────────────────────────────────

  /** Indexa el árbol plano que devuelve el backend y arma la cascada inicial. */
  private setAreaArbol(nodos: AreaArbolNodoDto[]): void {
    this.areaNodos = nodos ?? [];
    this.areaPorId = new Map(this.areaNodos.map((n) => [n.areaScopeId, n]));
    this.areaHijos = new Map();
    for (const nodo of this.areaNodos) {
      const key = nodo.areaScopeParentId ?? null;
      const hermanos = this.areaHijos.get(key);
      if (hermanos) hermanos.push(nodo);
      else this.areaHijos.set(key, [nodo]);
    }
    this.initAreaLevels();
  }

  private hijosDe(areaScopeId: number | null): AreaArbolNodoDto[] {
    return this.areaHijos.get(areaScopeId) ?? [];
  }

  /** Camino raíz → nodo, o null si el nodo no existe en el árbol vivo. */
  private caminoHasta(areaScopeId: number): AreaArbolNodoDto[] | null {
    const camino: AreaArbolNodoDto[] = [];
    const visitados = new Set<number>();
    let actual = this.areaPorId.get(areaScopeId);
    while (actual && !visitados.has(actual.areaScopeId)) {
      visitados.add(actual.areaScopeId);
      camino.unshift(actual);
      actual = actual.areaScopeParentId != null
        ? this.areaPorId.get(actual.areaScopeParentId)
        : undefined;
    }
    return camino.length ? camino : null;
  }

  /**
   * Un desplegable por cada nivel del camino hasta el nodo asignado, más uno vacío con los hijos
   * del último nodo (si tiene) para poder profundizar. No obliga a llegar a una hoja: se guarda
   * el nodo más profundo que se haya elegido.
   */
  private initAreaLevels(): void {
    // Siempre queda al menos el nivel raíz, aunque el árbol no haya llegado todavía: así el campo
    // de Área no aparece de golpe a mitad de la carga (muestra "Cargando…" y se llena solo).
    const camino = this.model.areaScopeId ? this.caminoHasta(this.model.areaScopeId) : null;
    this.areaLevels = [
      { options: this.hijosDe(null), selected: camino?.[0]?.areaScopeId ?? null },
    ];
    if (!camino) return;

    for (let i = 0; i < camino.length; i++) {
      const hijos = this.hijosDe(camino[i].areaScopeId);
      if (!hijos.length) continue;
      const siguiente = camino[i + 1] ?? null;
      this.areaLevels.push({ options: hijos, selected: siguiente?.areaScopeId ?? null });
    }
  }

  /**
   * Al elegir un nodo se descartan los niveles más profundos y, si el nodo tiene hijos, se agrega
   * un desplegable vacío para el siguiente nivel (opcional).
   */
  onAreaLevelChange(index: number, value: number | null): void {
    const level = this.areaLevels[index];
    level.selected = value ?? null;
    this.areaLevels = this.areaLevels.slice(0, index + 1);
    if (value != null) {
      const hijos = this.hijosDe(value);
      if (hijos.length) this.areaLevels.push({ options: hijos, selected: null });
    }
    this.model.areaScopeId = this.areaScopeIdElegido;
  }

  /** Nodo más profundo elegido en la cascada (lo que se guarda en workers.area_scope_id). */
  get areaScopeIdElegido(): number | null {
    for (let i = this.areaLevels.length - 1; i >= 0; i--) {
      if (this.areaLevels[i].selected != null) return this.areaLevels[i].selected;
    }
    return null;
  }

  /** Nodo elegido, para leer su equivalencia legacy y su revisor. */
  private get areaNodoElegido(): AreaArbolNodoDto | null {
    const id = this.areaScopeIdElegido;
    return id != null ? this.areaPorId.get(id) ?? null : null;
  }

  /** Ruta legible de la selección (ej. "Gerencia de Proyectos › Unidad de Proyectos"). */
  get areaPathLabel(): string {
    const nombres: string[] = [];
    for (const level of this.areaLevels) {
      if (level.selected == null) break;
      const nodo = level.options.find((o) => o.areaScopeId === level.selected);
      if (!nodo) break;
      nombres.push(nodo.areaItemName);
    }
    return nombres.join(' › ');
  }

  /** Área/subárea legacy a las que va a caer el nodo elegido (las deriva el backend al guardar). */
  get areaLegacyLabel(): string {
    const nodo = this.areaNodoElegido;
    if (!nodo?.subarea) return '';
    return nodo.area ? `${nodo.area} / ${nodo.subarea}` : nodo.subarea;
  }

  /**
   * Revisor que le tocaría al trabajador por su área, según Configuración → Revisores de Áreas.
   * Si el área está configurada para filtrar por proyecto, mandan los revisores del proyecto
   * elegido en el formulario.
   *
   * El backend manda los candidatos ya ordenados (los del nodo, después los de sus áreas
   * superiores y al final el área de GTH); acá solo se descarta al propio trabajador. Eso importa
   * porque los jefes de área son el revisor de su propia área: sin descartarlo, abrir la ficha del
   * jefe de SSOMA lo mostraba como su propio jefe. Al descartarlo queda el siguiente candidato,
   * normalmente el revisor de la gerencia de la que cuelga su área.
   */
  get revisorNombre(): string {
    return this.revisorDelArea?.nombre ?? '';
  }

  get revisorEmail(): string {
    return this.revisorDelArea?.email ?? '';
  }

  private get revisorDelArea(): AreaArbolRevisorDto | null {
    return this.candidatosDelArea.find((r) => !this.esElPropioTrabajador(r)) ?? null;
  }

  /** Candidatos del nodo elegido: los del proyecto si el área filtra por proyecto, o los del área. */
  private get candidatosDelArea(): AreaArbolRevisorDto[] {
    const nodo = this.areaNodoElegido;
    if (!nodo) return [];
    const porProyecto =
      this.model.proyectoId != null
        ? nodo.revisoresPorProyecto?.find((r) => r.proyectoId === this.model.proyectoId)
        : undefined;
    return porProyecto?.revisores ?? nodo.revisores ?? [];
  }

  /**
   * true cuando el trabajador es el revisor configurado de su propia área y por eso el campo
   * muestra al siguiente. Se avisa en el formulario para que no se lea como un error de
   * configuración de Revisores de Áreas.
   */
  get esRevisorDeSuPropiaArea(): boolean {
    const candidatos = this.candidatosDelArea;
    return candidatos.length > 0 && this.esElPropioTrabajador(candidatos[0]);
  }

  /**
   * Nadie puede ser su propio jefe. Se compara por persona además de por ficha porque un
   * reingreso deja varias filas en `workers` para la misma persona y el revisor puede estar
   * configurado en cualquiera de ellas (misma regla que aplica el backend al notificar).
   */
  private esElPropioTrabajador(candidato: {
    workerId?: number | null;
    personId?: number | null;
  }): boolean {
    if (this.mode !== 'edit' || !this.worker) return false;
    if (candidato.workerId != null && candidato.workerId === this.worker.workerId) return true;
    return (
      candidato.personId != null &&
      this.workerPersonId != null &&
      candidato.personId === this.workerPersonId
    );
  }

  // ── Jefe personalizado ───────────────────────────────────────────────
  //
  // Reemplaza a la pantalla Configuración → Revisores de Trabajadores. El campo muestra por
  // defecto el revisor que sugiere el área; al marcar el checkbox se convierte en un
  // desplegable y lo que se elija ahí se sobrepone a ese revisor en todo el sistema (correos
  // de EMO, aprobación de salidas, recordatorios).

  /** Opciones del desplegable, sin el propio trabajador: nadie puede ser su propio jefe. */
  get jefesDisponibles(): JefeCandidatoDto[] {
    if (this.mode !== 'edit' || !this.worker) return this.jefes;
    return this.jefes.filter((j) => !this.esElPropioTrabajador(j));
  }

  /**
   * Checkbox marcado pero sin elegir a nadie: no se puede guardar en ese estado a medias. Solo
   * aplica a Staff/Oficina Central, que son las que tienen checkbox; en Obra el desplegable es
   * opcional y dejarlo vacío es una respuesta válida (el trabajador cae al fallback).
   */
  get faltaJefePersonalizado(): boolean {
    return (
      this.gestionaArea &&
      this.model.jefePersonalizado &&
      this.model.jefePersonalizadoWorkerId == null
    );
  }

  /**
   * Jefe que se manda al backend. En Staff/Oficina Central manda el checkbox: desmarcado se
   * manda null y el trabajador vuelve a depender del revisor de su área. En Obra el desplegable
   * ES el campo, así que se manda tal cual y vacío significa lo mismo. Fuera de esas
   * clasificaciones no se manda nada porque `gestionaJefe` es false.
   */
  private get jefePersonalizadoAEnviar(): number | null {
    if (this.esObrero) return this.model.jefePersonalizadoWorkerId;
    return this.model.jefePersonalizado ? this.model.jefePersonalizadoWorkerId : null;
  }

  private get jefeSeleccionado(): JefeCandidatoDto | null {
    const id = this.model.jefePersonalizadoWorkerId;
    return id != null ? this.jefes.find((j) => j.workerId === id) ?? null : null;
  }

  get jefeSeleccionadoNombre(): string {
    return this.jefeSeleccionado?.fullName ?? '';
  }

  get jefeSeleccionadoEmail(): string {
    return this.jefeSeleccionado?.email ?? '';
  }

  /** Nombre a mostrar bajo el campo: el jefe elegido a mano o, si no hay, el del área. */
  get jefeEfectivoNombre(): string {
    return this.model.jefePersonalizado ? this.jefeSeleccionadoNombre : this.revisorNombre;
  }

  get jefeEfectivoEmail(): string {
    return this.model.jefePersonalizado ? this.jefeSeleccionadoEmail : this.revisorEmail;
  }

  onJefePersonalizadoToggle(activo: boolean): void {
    this.model.jefePersonalizado = activo;
    // Al desmarcar se limpia la elección: el trabajador vuelve a depender del revisor de su
    // área y guardar en ese estado da de baja el jefe personalizado que tuviera.
    if (!activo) this.model.jefePersonalizadoWorkerId = null;
  }

  onJefePersonalizadoChange(workerId: number | null): void {
    this.model.jefePersonalizadoWorkerId = workerId;
  }

  // Los desplegables emiten `null` al limpiarse; los campos del modelo son strings, así que
  // todos los handlers normalizan a '' antes de asignar (varios getters hacen .trim() encima).

  /**
   * La categoría no se guarda en el trabajador: es un filtro para acotar el desplegable de
   * puestos, que es el campo que sí se guarda (y de donde el sistema lee la categoría).
   * Al cambiarla se descarta el puesto elegido si ya no pertenece a ella.
   */
  onCategoriaChange(categoriaId: number | null): void {
    this.model.categoriaId = categoriaId;
    const puesto = this.puestos.find((p) => p.id === this.model.puestoId);
    if (puesto && puesto.categoriaId !== categoriaId) this.model.puestoId = null;
  }

  /**
   * Elegir un puesto fija la categoría, siempre: el puesto es el único campo que se guarda
   * y la categoría del trabajador es la de su puesto. El desplegable de categoría es solo
   * un filtro para encontrar el puesto, así que se sincroniza con lo elegido para que no
   * muestre una categoría que ya no es la del trabajador.
   */
  onPuestoChange(puestoId: number | null): void {
    this.model.puestoId = puestoId;
    const puesto = this.puestos.find((p) => p.id === puestoId);
    if (puesto) this.model.categoriaId = puesto.categoriaId;
  }

  /**
   * Puestos que se ofrecen: solo los de la categoría elegida. Sin categoría elegida se
   * muestran todos (no hay con qué filtrar todavía).
   *
   * Todo puesto pertenece a exactamente una categoría (la columna es NOT NULL), así que el
   * filtro es exacto: no hay puestos "sin categoría" que decidir si entran o no.
   */
  get puestosFiltrados(): { id: number; nombre: string; categoriaId: number | null }[] {
    if (this.model.categoriaId == null) return this.puestos;
    return this.puestos.filter(
      (p) =>
        p.categoriaId === this.model.categoriaId ||
        // El puesto ya guardado siempre se ofrece, aunque pertenezca a otra categoría o a
        // ninguna: si no, el desplegable (bloqueado en edición) mostraría el placeholder
        // en vez del puesto real de la ficha.
        p.id === this.model.puestoId,
    );
  }

  onObraOficinaSelect(valor: number | null): void {
    this.model.obraOficinaStaffId = valor;
    // El nombre se conserva en el modelo porque el resto del formulario decide qué campos
    // mostrar a partir de él (esObrero / esStaffOOficina / esOficinaCentral).
    this.model.obraOficina =
      this.obraOficinaOpciones.find((o) => o.obraOficinaStaffId === valor)?.name ?? '';
    this.onObraOficinaChange();
  }

  onTipoDocumentoSelect(valor: string | null): void {
    this.model.tipoDocumento = valor === 'CE' ? 'CE' : 'DNI';
    this.onTipoDocumentoChange();
  }

  onObraOficinaChange(): void {
    if (this.model.obraOficina !== 'Oficina Central') {
      this.model.sctr = true;
    }
    // Cambiar de Obra/Staff/Oficina cambia si el formulario gestiona el área o no, así que la
    // selección anterior se descarta y la cascada vuelve a empezar.
    this.model.areaScopeId = null;
    this.initAreaLevels();
    // El jefe elegido se conserva, pero cada clasificación lo muestra distinto (checkbox en
    // Staff/Oficina, desplegable suelto en Obra): se sincroniza el checkbox con lo que haya
    // elegido para que al pasar a Staff/Oficina el jefe no quede guardado pero invisible.
    this.model.jefePersonalizado = this.model.jefePersonalizadoWorkerId != null;
    // Cambiar de clasificación cambia con qué reglas se valida el corporativo (en Obra solo se
    // exige tenant/unicidad si es del dominio de Abril), así que la verificación anterior deja
    // de ser válida y se rehace.
    this.resetEstadoEmail();
    if (this.gestionaEmailCorporativo) this.onEmailCorporativoBlur();
  }

  private resetEstadoEmail(): void {
    this.verificandoEmail = false;
    this.emailError = '';
    this.emailVerificadoNombre = '';
    this.emailVerificado = '';
  }

  /**
   * Verifica el correo corporativo contra el directorio de Abril (tenant de Microsoft) y contra
   * los correos ya asignados a otros trabajadores. No aplica a contratistas, que no capturan
   * corporativo.
   *
   * El flag `corporativo` que se manda es la clasificación real (true solo en Staff/Oficina
   * Central), la misma que usa el backend al guardar: así en Obra un correo @abril.pe se sigue
   * verificando contra el tenant y por unicidad, pero uno de otro dominio se acepta igual que al
   * guardar, en vez de marcarlo en rojo por algo que el backend sí dejaría pasar.
   */
  onEmailCorporativoBlur(): void {
    if (!this.gestionaEmailCorporativo) {
      this.resetEstadoEmail();
      return;
    }

    const email = this.model.emailCorporativo.trim().toLowerCase();
    if (!email || email === this.emailVerificado || email === this.emailOriginal) return;

    this.emailError = '';
    this.emailVerificadoNombre = '';
    this.verificandoEmail = true;

    this.workerService
      .validarEmailCorporativo(
        email,
        this.mode === 'edit' ? this.worker?.workerId : null,
        this.esStaffOOficina,
      )
      .subscribe({
        next: (res) => {
          this.verificandoEmail = false;
          if (res.valido) {
            // Se guarda el correo canónico del directorio (así coincide con el del login SSO).
            if (res.email) this.model.emailCorporativo = res.email;
            this.emailVerificado = this.model.emailCorporativo.trim().toLowerCase();
            this.emailVerificadoNombre = res.nombreEnTenant ?? '';
          } else {
            this.emailError = res.mensaje ?? 'El correo corporativo no es válido.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          // Sin verificación no se bloquea el formulario: el backend vuelve a validar al guardar.
          this.verificandoEmail = false;
          this.cdr.detectChanges();
        },
      });
  }

  onTipoDocumentoChange(): void {
    this.model.dni = '';
    this.model.apellidoNombre = '';
    this.dniVerificado = false;
    this.dniRestringido = false;
  }

  onDniBlur(): void {
    if (this.mode !== 'create') return;

    const dni = this.model.dni.trim();
    this.dniRestringido = false;
    this.dniVerificado = false;

    const esDni = this.model.tipoDocumento === 'DNI';
    const formatoValido = esDni ? /^\d{8}$/.test(dni) : /^[A-Za-z0-9]{6,12}$/.test(dni);

    if (!formatoValido) {
      if (dni.length > 0) {
        const msg = esDni
          ? 'El DNI debe tener exactamente 8 dígitos numéricos.'
          : 'El CE debe tener entre 6 y 12 caracteres alfanuméricos sin espacios.';
        Swal.fire({
          icon: 'warning',
          title: 'Documento inválido',
          text: msg,
          confirmButtonColor: '#64BC04',
        });
        this.model.dni = '';
        this.cdr.detectChanges();
      }
      return;
    }

    this.verificandoDni = true;
    if (esDni) {
      this.personService.getPersonRENIEC(dni).subscribe({
        next: (persona) => {
          if (persona?.full_name) {
            this.model.apellidoNombre = persona.full_name;
            this.dniVerificado = true;
            this.cdr.detectChanges();
          }
          this.verificarRestringido(dni);
        },
        error: () => {
          this.verificarRestringido(dni);
        },
      });
    } else {
      this.verificarRestringido(dni);
    }
  }

  private verificarRestringido(dni: string): void {
    this.restringidoService.verificarDni(dni).subscribe({
      next: (restringido) => {
        if (restringido) {
          this.verificandoDni = false;
          this.dniRestringido = true;
          this.model.dni = '';
          this.model.apellidoNombre = '';
          this.dniVerificado = false;
          Swal.fire({
            icon: 'error',
            title: 'Acceso restringido',
            text: 'No se puede ingresar o reingresar al trabajador. Comuníquese con el área de Administración o SSOMA.',
            confirmButtonColor: '#64BC04',
          });
          this.cdr.detectChanges();
        } else {
          this.verificarExistenciaEnBd(dni);
        }
      },
      error: () => {
        this.verificandoDni = false;
        this.cdr.detectChanges();
      },
    });
  }

  private verificarExistenciaEnBd(dni: string): void {
    this.trabajadorHabService
      .getTrabajadores({ search: dni, pageSize: 50, page: 1, soloVerificacion: true })
      .subscribe({
        next: (res) => {
          const data = res.data ?? [];

          if (!data || data.length === 0) {
            this.verificandoDni = false;
            this.cdr.detectChanges();
            return;
          }

          // El DNI puede tener una ficha por cada empresa donde estuvo/está vinculado.
          // Solo se bloquea el alta si ese DNI está ACTIVO en alguna de ellas; si todas
          // están retiradas, se permite registrarlo como trabajador nuevo (otra empresa).
          const empresaActual = this.esContratista
            ? this.authService.getEmpresaId()
            : this.model.empresaId;

          const activos = data.filter((w) => w.estadoWorker === 'ACTIVO');
          const activoMismaEmpresa = activos.find(
            (w) => empresaActual != null && w.empresaId === empresaActual,
          );
          const retiradoMismaEmpresa = data.find(
            (w) => w.estadoWorker !== 'ACTIVO' && empresaActual != null && w.empresaId === empresaActual,
          );

          let debeBloquear = false;
          let puedeIrABuscar = false;
          let mensajeHtml = '';
          let worker = activos[0] ?? data[0];

          if (activoMismaEmpresa) {
            debeBloquear = true;
            puedeIrABuscar = true;
            worker = activoMismaEmpresa;
            mensajeHtml = `<b>${worker.apellidoNombre}</b> ya está activo en el sistema.<br><br>Búscalo en la lista para gestionarlo.`;
          } else if (activos.length > 0) {
            debeBloquear = true;
            worker = activos[0];
            mensajeHtml = `<b>${worker.apellidoNombre}</b> ya está activo en otra empresa y no puede ser registrado.<br><br>Esa empresa debe darlo de baja primero.`;
          } else if (retiradoMismaEmpresa) {
            debeBloquear = true;
            puedeIrABuscar = true;
            worker = retiradoMismaEmpresa;
            mensajeHtml = `<b>${worker.apellidoNombre}</b> ya estuvo registrado en tu empresa.<br><br>Búscalo en la lista para reingresarlo.`;
          }
          // Si solo hay fichas retiradas en otras empresas (ninguna activa), no se bloquea:
          // se permite registrarlo como trabajador nuevo.

          if (debeBloquear) {
            this.model.dni = '';
            this.model.apellidoNombre = '';
            this.dniVerificado = false;
          }

          this.verificandoDni = false;
          this.cdr.detectChanges();

          if (debeBloquear) {
            Swal.fire({
              icon: 'info',
              title: 'Trabajador ya registrado',
              html: mensajeHtml,
              showCancelButton: puedeIrABuscar,
              confirmButtonText: puedeIrABuscar ? 'Ir a buscarlo' : 'Entendido',
              cancelButtonText: 'Cerrar',
              confirmButtonColor: '#64BC04',
              cancelButtonColor: '#6b7280',
            }).then((result) => {
              if (result.isConfirmed && puedeIrABuscar) {
                this.buscarWorker.emit(dni);
              }
            });
          }
        },
        error: () => {
          this.verificandoDni = false;
          this.cdr.detectChanges();
        },
      });
  }

  /** Al reescribir el correo se limpia el resultado de la verificación anterior. */
  onEmailCorporativoInput(): void {
    this.emailError = '';
    this.emailVerificadoNombre = '';
  }

  submit(): void {
    if (!this.model.apellidoNombre.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo obligatorio',
        text: 'El nombre es obligatorio.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    if (this.emailError) {
      Swal.fire({
        icon: 'error',
        title: 'Correo corporativo no válido',
        text: this.emailError,
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    if (this.faltaCorreo) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta el correo',
        text: this.esStaffOOficina
          ? 'Registra al menos un correo: el corporativo o el personal.'
          : 'El correo personal es obligatorio.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    if (this.faltaJefePersonalizado) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta el jefe personalizado',
        text: 'Elige al jefe o desmarca la casilla para usar el revisor del área.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    if (!this.canSubmit) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Completa todos los campos obligatorios antes de guardar.',
      });
      return;
    }

    const n = (v: string | null | undefined): string | null => (v ?? '').trim() || null;

    const payload: WorkerUpsertDto = {
      apellidoNombre: this.model.apellidoNombre.trim(),
      dni: this.model.dni?.trim() || undefined,
      tipoDocumento: this.model.tipoDocumento,
      celular: n(this.model.celular),
      emailCorporativo: n(this.model.emailCorporativo),
      emailPersonal: n(this.model.emailPersonal),
      fechaIngreso: n(this.model.fechaIngreso) || undefined,
      condicionMedica: n(this.model.condicionMedica),
      // La categoría no se manda: el backend la lee del puesto.
      puestoId: this.model.puestoId ?? undefined,
      // El área se manda como nodo del árbol y el backend deriva de ahí area/subarea/jefatura.
      // Cuando el formulario sí gestiona el área se mandan los tres en null para que manden los
      // derivados (y para que limpiar el desplegable realmente limpie el área); cuando no la
      // gestiona se reenvían intactos para no borrar lo que ya estaba guardado.
      areaScopeId: this.model.areaScopeId,
      area: this.gestionaArea ? null : n(this.model.area),
      subarea: this.gestionaArea ? null : n(this.model.subarea),
      contrataCasa: this.esContratista ? 'Contratista' : n(this.model.contrataCasa),
      obraOficinaStaffId: this.model.obraOficinaStaffId,
      jefatura: this.gestionaArea ? null : n(this.model.jefatura),
      // El jefe solo se manda cuando el formulario muestra el campo (las tres clasificaciones de
      // personal de casa); en contratistas el backend no toca lo que ya estuviera guardado.
      gestionaJefe: this.gestionaJefe,
      jefePersonalizadoWorkerId: this.jefePersonalizadoAEnviar,
      sctr: !!this.model.sctr,
      habilitadoObra: false,
      notas: n(this.model.notas),
      empresaId: this.esContratista ? this.authService.getEmpresaId() : (this.model.empresaId ?? null),
      proyectoId: this.model.proyectoId ?? null,
      fechaNacimiento: this.esContratista ? undefined : (n(this.model.fechaNacimiento) || undefined),
      // Va junto con la fecha de nacimiento: el checkbox solo se muestra donde se captura la
      // fecha, así que en contratistas se omite y el backend no toca lo guardado.
      mostrarEnBoletin: this.esContratista ? undefined : this.model.mostrarEnBoletin,
      sexo: n(this.model.sexo),
      aniosExperiencia: this.model.aniosExperiencia ?? undefined,
    };

    this.saving = true;
    this.loaderService.show();

    const req$ =
      this.mode === 'edit' && this.worker
        ? this.workerService.updateWorker(this.worker.workerId, payload)
        : this.workerService.createWorker(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: this.mode === 'create' ? 'Trabajador creado' : 'Trabajador actualizado',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
