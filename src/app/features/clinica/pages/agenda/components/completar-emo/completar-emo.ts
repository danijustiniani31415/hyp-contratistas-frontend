import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../../../../shared/components/date-picker/date-picker';
import { EmoService } from '../../../../../ssoma/salud-ocupacional/services/emo.service';
import { EmoCreateDto, InterconsultaInlineCreateDto, EmoRestriccionCreateDto } from '../../../../../ssoma/salud-ocupacional/dtos/emo.model';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from '../../../../../ssoma/salud-ocupacional/services/http-base';
import { ClinicaProgramacionService } from '../../../../services/clinica-programacion.service';
import { ProgramacionClinicaDto } from '../../../../dtos/clinica.model';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { hoyIsoLocal } from '../../../../../../shared/utils/fecha-local.util';

@Component({
  selector: 'app-completar-emo',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, DatePicker],
  templateUrl: './completar-emo.html',
  styleUrls: ['./completar-emo.css'],
})
export class CompletarEmo implements OnChanges {
  @Input() open = false;
  @Input() programacion: ProgramacionClinicaDto | null = null;
  @Input() interconsultaId?: number;
  @Output() closed = new EventEmitter<void>();
  @Output() completado = new EventEmitter<void>();

  aptitud = '';
  fechaEmo = '';
  notas = '';
  lecturaRealizada = false;
  fechaLectura = '';
  /** true = no la sube la clínica: la lee después el médico de Abril Grupo Inmobiliario. */
  requiereLecturaAbril = false;
  saving = false;

  get hoy(): string { return hoyIsoLocal(); }

  archivoAptitud: File | null = null;
  archivoEmo: File | null = null;
  archivoLectura: File | null = null;

  restricciones: { descripcionLibre: string }[] = [];
  nuevaRestriccion = '';

  icEspecialidad = '';
  icDiagnostico = '';
  icRequiereSeguimiento = false;

  readonly aptitudes = ['Apto', 'Apto con Restricciones', 'No Apto', 'Observado'];

  /**
   * Las mismas aptitudes en el formato que consume `app-search-select`. El orden es semántico
   * (de la mejor a la peor), no alfabético: por eso el combo va con `[sortAlpha]="false"`.
   */
  readonly aptitudOptions = this.aptitudes.map((a) => ({ id: a, nombre: a }));

  get requiereRestriccion(): boolean { return this.aptitud === 'Apto con Restricciones'; }
  get requiereDocumentos(): boolean { return this.aptitud === 'Apto' || this.aptitud === 'Apto con Restricciones'; }

  /**
   * Solo «Observado» exige interconsulta: esa aptitud significa literalmente que falta derivar al
   * postulante para saber su resultado real, así que sin especialidad el registro no dice nada.
   *
   * «No Apto» NO la exige. Es un veredicto cerrado —el trabajador queda bloqueado en habilitación
   * y, si venía de un proceso de selección, ese proceso se detiene—, así que pedir una derivación
   * para poder guardarlo solo trababa el registro de un resultado que ya estaba decidido.
   */
  get requiereInterconsulta(): boolean { return this.aptitud === 'Observado'; }

  get canSubmit(): boolean {
    if (!this.aptitud || !this.fechaEmo || !this.programacion || this.saving) return false;
    if (this.requiereDocumentos && (!this.archivoAptitud || !this.archivoEmo)) return false;
    if (this.lecturaRealizada && (!this.fechaLectura || !this.archivoLectura)) return false;
    if (this.requiereRestriccion && this.restricciones.length === 0) return false;
    if (this.requiereInterconsulta && !this.icEspecialidad.trim()) return false;
    return true;
  }

  constructor(
    private http: HttpClient,
    private emoSvc: EmoService,
    private progSvc: ClinicaProgramacionService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) this.reset();
  }

  reset(): void {
    this.aptitud = '';
    this.fechaEmo = '';
    this.notas = '';
    this.lecturaRealizada = false;
    this.fechaLectura = '';
    this.requiereLecturaAbril = false;
    this.restricciones = [];
    this.nuevaRestriccion = '';
    this.icEspecialidad = '';
    this.icDiagnostico = '';
    this.icRequiereSeguimiento = false;
    this.saving = false;
    this.archivoAptitud = null;
    this.archivoEmo = null;
    this.archivoLectura = null;
  }

  agregarRestriccion(): void {
    const txt = this.nuevaRestriccion.trim();
    if (!txt) return;
    this.restricciones.push({ descripcionLibre: txt });
    this.nuevaRestriccion = '';
  }

  quitarRestriccion(i: number): void { this.restricciones.splice(i, 1); }

  onLecturaChange(): void {
    if (this.lecturaRealizada) {
      this.requiereLecturaAbril = false;
      if (!this.fechaLectura) this.fechaLectura = hoyIsoLocal();
    }
  }

  onRequiereLecturaAbrilChange(): void {
    if (this.requiereLecturaAbril) {
      this.lecturaRealizada = false;
      this.fechaLectura = '';
      this.archivoLectura = null;
    }
  }

  onArchivoAptitud(event: Event): void {
    this.archivoAptitud = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  onArchivoEmo(event: Event): void {
    this.archivoEmo = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  onArchivoLectura(event: Event): void {
    this.archivoLectura = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  close(): void { this.closed.emit(); }

  /** Sube Aptitud/EMO Completo y espera a que AMBAS terminen antes de dar por completado el flujo. */
  private subirDocumentos(emoId: number): Observable<unknown> {
    const url = `${SALUD_OCUPACIONAL_BASE}/emos/${emoId}/documentos`;
    const headers = buildAuthHeaders();
    const requests: Observable<unknown>[] = [];

    if (this.archivoAptitud) {
      const fd = new FormData();
      fd.append('file', this.archivoAptitud);
      fd.append('tipo', 'Aptitud');
      requests.push(this.http.post(url, fd, { headers }));
    }
    if (this.archivoEmo) {
      const fd = new FormData();
      fd.append('file', this.archivoEmo);
      fd.append('tipo', 'EMO');
      requests.push(this.http.post(url, fd, { headers }));
    }

    return requests.length ? forkJoin(requests) : of(null);
  }

  submit(): void {
    if (!this.canSubmit || !this.programacion) return;
    this.saving = true;
    this.loaderService.show();

    const restriccionesPayload: EmoRestriccionCreateDto[] = this.restricciones.map(r => ({
      descripcionLibre: r.descripcionLibre,
      vigente: true,
    }));

    let interconsultaInline: InterconsultaInlineCreateDto | undefined;
    if (this.requiereInterconsulta) {
      interconsultaInline = {
        especialidad: this.icEspecialidad.trim(),
        diagnostico: this.icDiagnostico.trim() || undefined,
        requiereSeguimiento: this.icRequiereSeguimiento,
      };
    }

    const emoDto: EmoCreateDto = {
      workerId: this.programacion.workerId,
      tipoEmoId: this.programacion.tipoEmoId ?? 0,
      empresaOrigenId: this.programacion.empresaId ?? undefined,
      fechaEmo: this.fechaEmo,
      aptitud: this.aptitud,
      requiereInterconsulta: this.requiereInterconsulta,
      notas: this.notas || undefined,
      fechaLectura: this.lecturaRealizada ? (this.fechaLectura || undefined) : undefined,
      requiereLecturaAbril: this.requiereLecturaAbril,
      examenes: [],
      restricciones: restriccionesPayload,
      interconsultaInline,
    };

    console.log('[CompletarEmo] payload:', { ...emoDto, archivoLectura: this.archivoLectura?.name });

    this.emoSvc.createEmo(emoDto, this.archivoLectura).subscribe({
      next: (res) => {
        const emoId = res.id;
        if (this.interconsultaId != null) {
          // Contexto interconsultas: no hay programación real, omitir accionClinica
          this.subirDocumentos(emoId).subscribe({
            next: () => {
              this.saving = false;
              this.loaderService.hide();
              this.completado.emit();
            },
            error: (err) => {
              this.saving = false;
              this.loaderService.hide();
              this.errorService.handleError(err);
            },
          });
        } else {
          // Contexto agenda: flujo original con accionClinica
          this.progSvc.accionClinica(this.programacion!.id, {
            id: this.programacion!.id,
            accion: 'Completar',
            emoResultadoId: emoId,
          }).subscribe({
            next: () => {
              this.subirDocumentos(emoId).subscribe({
                next: () => {
                  this.saving = false;
                  this.loaderService.hide();
                  this.completado.emit();
                },
                error: (err) => {
                  this.saving = false;
                  this.loaderService.hide();
                  this.errorService.handleError(err);
                },
              });
            },
            error: (err) => { this.saving = false; this.loaderService.hide(); this.errorService.handleError(err); },
          });
        }
      },
      error: (err) => { this.saving = false; this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }
}
