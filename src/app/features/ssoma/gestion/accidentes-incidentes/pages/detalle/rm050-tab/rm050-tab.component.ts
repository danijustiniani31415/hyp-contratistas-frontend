import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccidenteIncidenteService } from '../../../accidente-incidente.service';
import { FlashReportDetalleDto } from '../../../accidente-incidente.dtos';
import {
  Rm050Dto,
  GuardarRm050Request,
  GuardarAccionCorrectivaRequest,
  AccionCorrectivaDto,
  GRAVEDADES_ACCIDENTE,
  ESTADOS_ACCION,
} from '../../../accidente-incidente.dtos';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';

@Component({
  selector: 'app-rm050-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './rm050-tab.component.html',
  styleUrl: './rm050-tab.component.css',
})
export class Rm050TabComponent implements OnInit {
  @Input() accidenteId!: number;
  @Input() detalle: FlashReportDetalleDto | null = null;

  loading = true;
  guardando = false;
  accionesVencidas: any[] = [];

  readonly gravedades = GRAVEDADES_ACCIDENTE;
  readonly estadosAccion = ESTADOS_ACCION;
  readonly gravedadesOpts = GRAVEDADES_ACCIDENTE.map((g) => ({ value: g, label: g }));
  readonly estadosAccionOpts = ESTADOS_ACCION.map((e) => ({ value: e, label: e }));
  readonly tipoAccionOpts = [
    { value: 'Correctiva', label: 'Correctiva' },
    { value: 'Preventiva', label: 'Preventiva' },
  ];

  form: GuardarRm050Request = {
    descripcionDetallada: '',
    mecanismo: '',
    agenteCausante: '',
    actosSubestandar: '',
    condicionesSubestandar: '',
    factoresPersonales: '',
    factoresTrabajo: '',
    diasPerdidos: undefined,
    tipoAccidente: '',
    gravedadAccidente: '',
    nroTrabajadoresAfectados: undefined,
    testigos: '',
    elaboradoPorNombre: '',
    elaboradoPorCargo: '',
    elaboradoPorFecha: '',
    aprobadoPorNombre: '',
    aprobadoPorCargo: '',
    accionesCorrectivas: [],
  };

  updatedAt: string | undefined;

  constructor(
    private service: AccidenteIncidenteService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarVencidas();
  }

  cargar(): void {
    this.loading = true;
    this.service.getRm050(this.accidenteId).subscribe({
      next: (rm) => {
        this.rellenarForm(rm);
        this.updatedAt = rm.updatedAt;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // Si no existe aún, pre-llenar desde flash report
        this.preLlenarDesdeFlash();
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private rellenarForm(rm: Rm050Dto): void {
    this.form = {
      descripcionDetallada: rm.descripcionDetallada ?? '',
      mecanismo: rm.mecanismo ?? '',
      agenteCausante: rm.agenteCausante ?? '',
      actosSubestandar: rm.actosSubestandar ?? '',
      condicionesSubestandar: rm.condicionesSubestandar ?? '',
      factoresPersonales: rm.factoresPersonales ?? '',
      factoresTrabajo: rm.factoresTrabajo ?? '',
      diasPerdidos: rm.diasPerdidos,
      tipoAccidente: rm.tipoAccidente ?? '',
      gravedadAccidente: rm.gravedadAccidente ?? '',
      nroTrabajadoresAfectados: rm.nroTrabajadoresAfectados,
      testigos: rm.testigos ?? '',
      elaboradoPorNombre: rm.elaboradoPorNombre ?? this.detalle?.elaboradoPorNombre ?? '',
      elaboradoPorCargo: rm.elaboradoPorCargo ?? this.detalle?.elaboradoPorCargo ?? '',
      elaboradoPorFecha: rm.elaboradoPorFecha ?? '',
      aprobadoPorNombre: rm.aprobadoPorNombre ?? '',
      aprobadoPorCargo: rm.aprobadoPorCargo ?? '',
      accionesCorrectivas: rm.accionesCorrectivas.map((a) => ({
        id: a.id,
        descripcion: a.descripcion,
        tipo: a.tipo ?? 'Correctiva',
        responsableNombre: a.responsableNombre ?? '',
        fechaCompromiso: a.fechaCompromiso ?? '',
        fechaCumplimiento: a.fechaCumplimiento ?? '',
        estado: a.estado,
      })),
    };
  }

  private preLlenarDesdeFlash(): void {
    if (!this.detalle) return;
    this.form.descripcionDetallada = this.detalle.descripcion ?? '';
    this.form.diasPerdidos = this.detalle.descansos?.reduce((s, d) => s + (d.diasDescanso ?? 0), 0) || undefined;
    this.form.elaboradoPorNombre = this.detalle.elaboradoPorNombre ?? '';
    this.form.elaboradoPorCargo = this.detalle.elaboradoPorCargo ?? '';
    this.form.nroTrabajadoresAfectados = 1;
  }

  agregarAccion(): void {
    this.form.accionesCorrectivas.push({
      descripcion: '',
      tipo: 'Correctiva',
      responsableNombre: '',
      fechaCompromiso: '',
      estado: 'Pendiente',
    });
    this.cdr.detectChanges();
  }

  eliminarAccion(i: number): void {
    this.form.accionesCorrectivas.splice(i, 1);
    this.cdr.detectChanges();
  }

  private aFechaValida(v: string | undefined): string | undefined {
    return v && v.trim() ? v : undefined;
  }

  private construirPayload(): GuardarRm050Request {
    return {
      ...this.form,
      elaboradoPorFecha: this.aFechaValida(this.form.elaboradoPorFecha),
      accionesCorrectivas: this.form.accionesCorrectivas.map((a) => ({
        ...a,
        fechaCompromiso: this.aFechaValida(a.fechaCompromiso),
        fechaCumplimiento: this.aFechaValida(a.fechaCumplimiento),
      })),
    };
  }

  guardar(): void {
    this.guardando = true;
    this.cdr.detectChanges();
    this.service.guardarRm050(this.accidenteId, this.construirPayload()).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({ icon: 'success', title: 'Guardado', text: 'Investigación RM-050 guardada.', timer: 1500, showConfirmButton: false });
        this.cargar();
      },
      error: () => {
        this.guardando = false;
        this.cdr.detectChanges();
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la investigación.' });
      },
    });
  }

  cargarVencidas(): void {
    this.service.getAccionesVencidas().subscribe({
      next: (v) => {
        this.accionesVencidas = v.filter((a) => a.accidenteId === this.accidenteId);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  crearLeccion(accion: GuardarAccionCorrectivaRequest): void {
    Swal.fire({
      title: 'Crear lección aprendida',
      html: `<p style="font-size:13px">Se creará una lección aprendida basada en esta acción correctiva:<br><strong>${accion.descripcion}</strong></p>
             <input id="impacto" class="swal2-input" placeholder="Descripción del impacto/aprendizaje">`,
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      preConfirm: () => (document.getElementById('impacto') as HTMLInputElement).value,
    }).then((result) => {
      if (!result.isConfirmed) return;
      const proyectoId = this.detalle?.proyectoId ?? 0;
      this.service
        .crearLeccionDesdeAccion(accion.id!, {
          proyectoId,
          areaId: 1,
          impactDescription: result.value,
        })
        .subscribe({
          next: () =>
            Swal.fire({ icon: 'success', title: 'Lección creada', timer: 1800, showConfirmButton: false }),
          error: () => Swal.fire({ icon: 'error', title: 'Error al crear la lección' }),
        });
    });
  }

  trackByIdx(_: number, __: unknown): number { return _; }
}
