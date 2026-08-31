import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { DocumentViewer } from '../../../../../../shared/components/document-viewer/document-viewer';
import { ProgramacionCreate } from '../../../programaciones/components/programacion-create/programacion-create';
import { ConvalidacionService } from '../../../services/convalidacion.service';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import { EmpresaSimpleDto, MedicoSimpleDto } from '../../../dtos/catalogos.model';
import { ConvalidacionCreateDto, ConvalidacionListDto, ConvalidacionResultado } from '../../../dtos/convalidacion.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { declaracionRiesgo } from '../../../shared/riesgo-puesto.utils';
import { FirmaElectronicaService } from '../../../shared/firma-electronica.service';

@Component({
  selector: 'app-convalidacion-review',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SearchSelect, DocumentViewer, ProgramacionCreate],
  templateUrl: './convalidacion-review.html',
  styleUrl: './convalidacion-review.css',
})
export class ConvalidacionReview implements OnChanges {
  @Input() open = false;
  @Input() item: ConvalidacionListDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  medicos: MedicoSimpleDto[] = [];
  empresas: EmpresaSimpleDto[] = [];

  resultado: ConvalidacionResultado = 'Pendiente';
  fechaVencimiento = '';
  medicoId: number | null = null;
  empresaDestinoId: number | null = null;
  notas = '';
  saving = false;

  visorUrl = '';
  visorNombre = '';

  showProgramarEmo = false;

  readonly resultadoOptions = [
    { id: 'Pendiente', nombre: 'Pendiente' },
    { id: 'Aprobada', nombre: 'Aprobada' },
    { id: 'Aprobada con Observaciones', nombre: 'Aprobada con Observaciones' },
    { id: 'Rechazada', nombre: 'Rechazada' },
  ];

  constructor(
    private service: ConvalidacionService,
    private catalogos: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private firmaElectronica: FirmaElectronicaService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.item) {
      this.resultado = (this.item.resultado as ConvalidacionResultado) ?? 'Pendiente';
      this.fechaVencimiento = this.item.fechaVencimiento || this.item.emoFechaVencimiento || '';
      this.medicoId = null;
      this.empresaDestinoId = this.item.empresaDestinoId ?? null;
      this.notas = this.item.notas ?? '';
      this.saving = false;
      if (!this.medicos.length) {
        this.catalogos.getMedicos().subscribe((res) => {
          // Solo médicos internos de Abril (sin clínica externa asociada) pueden
          // firmar convalidaciones — los de clínicas contratadas no aplican acá.
          this.medicos = res.filter((m) => !m.clinicaId);
          this.cdr.detectChanges();
        });
      }
      if (!this.empresas.length) {
        this.catalogos.getEmpresas().subscribe((res) => {
          this.empresas = res;
          this.cdr.detectChanges();
        });
      }
    }
  }

  get fechaVencimientoRequerida(): boolean {
    return this.resultado === 'Aprobada' || this.resultado === 'Aprobada con Observaciones';
  }

  /** Ya calculado por el backend a partir del historial de vinculación del trabajador —
   * ver ConvalidacionRepository.ResolverPuestoOrigenAsync/ResolverPuestoDestinoAsync. Acá
   * solo se muestra, no se edita. */
  get cambioRiesgoCritico(): boolean {
    return !!this.item?.cambioRiesgo;
  }

  get declaracionRiesgoTexto(): string {
    if (!this.item) return '';
    return declaracionRiesgo(this.item.obraOficinaStaffOrigenId, this.item.obraOficinaStaffDestinoId);
  }

  get canSubmit(): boolean {
    if (this.saving) return false;
    if (this.cambioRiesgoCritico && this.resultado !== 'Rechazada') return false;
    if (this.fechaVencimientoRequerida && !this.fechaVencimiento) return false;
    if (!this.empresaDestinoId) return false;
    return true;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit || !this.item) return;

    const payload: Record<string, unknown> = {
      fechaConvalidacion: this.item.fechaConvalidacion,
      empresaDestinoId: this.empresaDestinoId ?? undefined,
      medicoId: this.medicoId ?? undefined,
      resultado: this.resultado,
      fechaVencimiento: this.fechaVencimiento || undefined,
      notas: this.notas || undefined,
      // Puesto/clasificación origen y destino ya NO se mandan desde acá — el backend los
      // resuelve solo (historial de vinculación para origen, vinculación vigente para
      // destino) y conserva lo ya guardado si esta convalidación ya los tenía.
    };

    if (this.resultado !== 'Pendiente') {
      const medicoNombre = this.medicos.find((m) => m.id === this.medicoId)?.apellidoNombre
        ?? this.item.medico ?? 'el médico';
      const firma = await this.firmaElectronica.solicitarFirma(medicoNombre);
      if (!firma) return;
      payload['pinFirma'] = firma.pinFirma;
      payload['microsoftAccessToken'] = firma.microsoftAccessToken;
    }

    this.saving = true;
    this.loaderService.show();
    this.service.updateConvalidacion(this.item.id, payload as Partial<ConvalidacionCreateDto>).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Convalidación actualizada',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Aprovecha la revisión para regularizar documentos pendientes del trabajador
   * (EMO o interconsulta) sin tener que buscarlo de nuevo en otra pantalla. Cierra
   * el círculo del caso crítico: si el cambio de puesto exige un EMO nuevo, se
   * programa aquí mismo, precargado con el trabajador y la empresa destino. */
  abrirProgramarEmo(): void {
    this.showProgramarEmo = true;
  }

  onProgramacionSaved(): void {
    this.showProgramarEmo = false;
    Swal.fire({
      icon: 'success',
      title: 'EMO programado',
      text: 'Se notificará a la clínica y al trabajador según el flujo habitual de programaciones.',
      timer: 2000,
      showConfirmButton: false,
    });
  }

  onProgramacionClosed(): void {
    this.showProgramarEmo = false;
  }

  irARegistrarInterconsulta(): void {
    this.close();
    this.router.navigate(['/ssoma/salud-ocupacional/interconsultas']);
  }

  verDocumento(url: string | undefined | null, nombre: string): void {
    if (!url) return;
    this.visorUrl = url;
    this.visorNombre = nombre;
  }

  onVisorClosed(): void {
    this.visorUrl = '';
    this.visorNombre = '';
  }

  close(): void {
    this.closed.emit();
  }
}
