import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, shareReplay, tap } from 'rxjs';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from './http-base';
import {
  ClinicaEmailCreateDto,
  ClinicaEmailDto,
  ClinicaSimpleDto,
  ClinicaUpsertDto,
  EmoTipoDto,
  EmoTipoUpsertDto,
  EmpresaSimpleDto,
  EmpresaCreateDto,
  SunatContributorDTO,
  ExamenTipoDto,
  MedicoSimpleDto,
  MedicoUpsertDto,
  RestriccionTipoDto,
  AgenteRiesgoDto,
} from '../dtos/catalogos.model';

@Injectable({ providedIn: 'root' })
export class CatalogosSaludService {
  private readonly apiUrl = `${SALUD_OCUPACIONAL_BASE}/catalogos`;

  private clinicas$?: Observable<ClinicaSimpleDto[]>;
  private medicos$?: Observable<MedicoSimpleDto[]>;
  private emoTipos$?: Observable<EmoTipoDto[]>;
  private examenTipos$?: Observable<ExamenTipoDto[]>;
  private restriccionTipos$?: Observable<RestriccionTipoDto[]>;
  private agentesRiesgo$?: Observable<AgenteRiesgoDto[]>;
  private empresas$?: Observable<EmpresaSimpleDto[]>;

  constructor(private http: HttpClient) {}

  getClinicas(): Observable<ClinicaSimpleDto[]> {
    this.clinicas$ ??= this.http
      .get<ClinicaSimpleDto[]>(`${this.apiUrl}/clinicas`, { headers: buildAuthHeaders() })
      .pipe(shareReplay(1));
    return this.clinicas$;
  }

  getMedicos(): Observable<MedicoSimpleDto[]> {
    this.medicos$ ??= this.http
      .get<MedicoSimpleDto[]>(`${this.apiUrl}/medicos`, { headers: buildAuthHeaders() })
      .pipe(shareReplay(1));
    return this.medicos$;
  }

  getEmoTipos(): Observable<EmoTipoDto[]> {
    this.emoTipos$ ??= this.http
      .get<EmoTipoDto[]>(`${this.apiUrl}/emo-tipos`, { headers: buildAuthHeaders() })
      .pipe(shareReplay(1));
    return this.emoTipos$;
  }

  getExamenTipos(): Observable<ExamenTipoDto[]> {
    this.examenTipos$ ??= this.http
      .get<ExamenTipoDto[]>(`${this.apiUrl}/examen-tipos`, { headers: buildAuthHeaders() })
      .pipe(shareReplay(1));
    return this.examenTipos$;
  }

  getRestriccionTipos(): Observable<RestriccionTipoDto[]> {
    this.restriccionTipos$ ??= this.http
      .get<RestriccionTipoDto[]>(`${this.apiUrl}/restriccion-tipos`, {
        headers: buildAuthHeaders(),
      })
      .pipe(shareReplay(1));
    return this.restriccionTipos$;
  }

  getAgentesRiesgo(): Observable<AgenteRiesgoDto[]> {
    this.agentesRiesgo$ ??= this.http
      .get<AgenteRiesgoDto[]>(`${this.apiUrl}/agentes-riesgo`, { headers: buildAuthHeaders() })
      .pipe(shareReplay(1));
    return this.agentesRiesgo$;
  }

  getEmpresas(): Observable<EmpresaSimpleDto[]> {
    this.empresas$ ??= this.http
      .get<EmpresaSimpleDto[]>(`${this.apiUrl}/empresas`, { headers: buildAuthHeaders() })
      .pipe(
        shareReplay(1),
        catchError((err) => { this.empresas$ = undefined; throw err; }),
      );
    return this.empresas$;
  }

  /** Consulta RUC a SUNAT para el alta de una razón social. */
  getEmpresaByRuc(ruc: string): Observable<SunatContributorDTO> {
    return this.http.get<SunatContributorDTO>(`${this.apiUrl}/empresas/ruc/${ruc}`, {
      headers: buildAuthHeaders(),
    });
  }

  /** Crea una razón social (contribuyente). */
  createEmpresa(dto: EmpresaCreateDto): Observable<EmpresaSimpleDto> {
    return this.http.post<EmpresaSimpleDto>(`${this.apiUrl}/empresas`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  invalidateCache(): void {
    this.clinicas$ = undefined;
    this.medicos$ = undefined;
    this.emoTipos$ = undefined;
    this.examenTipos$ = undefined;
    this.restriccionTipos$ = undefined;
    this.empresas$ = undefined;
  }

  // ===== Admin (no cache) =====

  listClinicas(): Observable<ClinicaSimpleDto[]> {
    return this.http.get<ClinicaSimpleDto[]>(`${this.apiUrl}/clinicas`, {
      headers: buildAuthHeaders(),
    });
  }

  createClinica(dto: ClinicaUpsertDto): Observable<ClinicaSimpleDto> {
    return this.http
      .post<ClinicaSimpleDto>(`${this.apiUrl}/clinicas`, dto, { headers: buildAuthHeaders() })
      .pipe(tap(() => (this.clinicas$ = undefined)));
  }

  updateClinica(id: number, dto: ClinicaUpsertDto): Observable<ClinicaSimpleDto> {
    return this.http
      .put<ClinicaSimpleDto>(`${this.apiUrl}/clinicas/${id}`, dto, { headers: buildAuthHeaders() })
      .pipe(tap(() => (this.clinicas$ = undefined)));
  }

  getClinicaEmails(clinicaId: number): Observable<ClinicaEmailDto[]> {
    return this.http.get<ClinicaEmailDto[]>(`${this.apiUrl}/clinicas/${clinicaId}/emails`, {
      headers: buildAuthHeaders(),
    });
  }

  createClinicaEmail(clinicaId: number, dto: ClinicaEmailCreateDto): Observable<ClinicaEmailDto> {
    return this.http.post<ClinicaEmailDto>(`${this.apiUrl}/clinicas/${clinicaId}/emails`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  deleteClinicaEmail(clinicaId: number, emailId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/clinicas/${clinicaId}/emails/${emailId}`, {
      headers: buildAuthHeaders(),
    });
  }

  listMedicos(): Observable<MedicoSimpleDto[]> {
    return this.http.get<MedicoSimpleDto[]>(`${this.apiUrl}/medicos`, {
      headers: buildAuthHeaders(),
    });
  }

  createMedico(dto: MedicoUpsertDto): Observable<MedicoSimpleDto> {
    return this.http
      .post<MedicoSimpleDto>(`${this.apiUrl}/medicos`, dto, { headers: buildAuthHeaders() })
      .pipe(tap(() => (this.medicos$ = undefined)));
  }

  updateMedico(id: number, dto: MedicoUpsertDto): Observable<MedicoSimpleDto> {
    return this.http
      .put<MedicoSimpleDto>(`${this.apiUrl}/medicos/${id}`, dto, { headers: buildAuthHeaders() })
      .pipe(tap(() => (this.medicos$ = undefined)));
  }

  /** El propio médico define su PIN de firma (nunca se transmite ni se guarda en texto
   * plano fuera de esta llamada). */
  setPinFirma(medicoId: number, pin: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/medicos/${medicoId}/pin-firma`,
      { pin },
      { headers: buildAuthHeaders() },
    );
  }

  /** SSO-FO-149 — Autorización de firma electrónica del médico, para imprimir, firmar
   * a mano y volver a subir escaneada como evidencia. */
  descargarAutorizacionFirmaPdf(medicoId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/medicos/${medicoId}/autorizacion-firma/pdf`, {
      headers: buildAuthHeaders(),
      responseType: 'blob',
    });
  }

  /** Sube la firma digital (imagen, idealmente PNG sin fondo) que se imprime en el
   * SSO-FO-149 junto al recuadro de firma manuscrita para comparar. */
  subirFirmaDigital(medicoId: number, file: Blob, fileName: string): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file, fileName);
    return this.http.post<{ url: string }>(
      `${this.apiUrl}/medicos/${medicoId}/firma-digital`,
      form,
      { headers: buildAuthHeaders() },
    );
  }

  /** Sube el SSO-FO-149 ya firmado a mano y escaneado — requisito previo (junto con la
   * firma digital) para poder configurar el PIN de firma. */
  subirAutorizacionFirmada(medicoId: number, file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<{ url: string }>(
      `${this.apiUrl}/medicos/${medicoId}/autorizacion-firma/documento`,
      form,
      { headers: buildAuthHeaders() },
    );
  }

  listEmoTipos(): Observable<EmoTipoDto[]> {
    return this.http.get<EmoTipoDto[]>(`${this.apiUrl}/emo-tipos`, {
      headers: buildAuthHeaders(),
    });
  }

  createEmoTipo(dto: EmoTipoUpsertDto): Observable<EmoTipoDto> {
    return this.http
      .post<EmoTipoDto>(`${this.apiUrl}/emo-tipos`, dto, { headers: buildAuthHeaders() })
      .pipe(tap(() => (this.emoTipos$ = undefined)));
  }

  updateEmoTipo(id: number, dto: EmoTipoUpsertDto): Observable<EmoTipoDto> {
    return this.http
      .put<EmoTipoDto>(`${this.apiUrl}/emo-tipos/${id}`, dto, { headers: buildAuthHeaders() })
      .pipe(tap(() => (this.emoTipos$ = undefined)));
  }

  solicitarActivacionClinica(email: string): Observable<void> {
    return this.http.post<void>(
      `${SALUD_OCUPACIONAL_BASE}/auth/solicitar-activacion`,
      { email },
      { headers: buildAuthHeaders() },
    );
  }

  crearClinicaUsuario(clinicaId: number, nombre: string, email: string): Observable<any> {
    return this.http.post<any>(
      `${SALUD_OCUPACIONAL_BASE}/catalogos/clinicas/${clinicaId}/usuarios`,
      { nombre, email },
      { headers: buildAuthHeaders() },
    );
  }
}
