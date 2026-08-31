import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { LessonReminderPagedDTO, ToggleLessonReminderResultDTO } from '../dtos/lessonReminder.model';
import { LessonReminderCreateDTO } from '../dtos/lessonReminderCreate.model';
import { LessonReminderCreateDataDTO } from '../dtos/lessonReminderCreateData.model';
import {
  ProjectStaffReminderConfigItemDTO,
  ToggleProjectStaffReminderResultDTO,
} from '../dtos/projectStaffReminder.model';
import { JefeReminderConfigItemDTO, ToggleJefeReminderResultDTO } from '../dtos/jefeReminder.model';
import {
  WorkerRevisorItemDTO,
  WorkerRevisorOptionDTO,
  WorkerRevisorUpdateDTO,
  ToggleAutoApproveLessonResultDTO,
} from '../dtos/workerRevisor.model';

@Injectable({ providedIn: 'root' })
export class LessonReminderService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/lesson-reminder`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getPaged(
    page: number,
    pageSize: number = 10,
    subarea?: string | null,
    workerId?: number | null,
    includeWorkers: boolean = false,
  ): Observable<LessonReminderPagedDTO> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (subarea) params = params.set('subarea', subarea);
    if (workerId) params = params.set('workerId', workerId.toString());
    if (includeWorkers) params = params.set('includeWorkers', 'true');
    return this.http.get<LessonReminderPagedDTO>(`${this.apiUrl}/paged`, {
      params,
      headers: this.authHeaders(),
    });
  }

  getCreateData(): Observable<LessonReminderCreateDataDTO> {
    return this.http.get<LessonReminderCreateDataDTO>(`${this.apiUrl}/create-data`, {
      headers: this.authHeaders(),
    });
  }

  create(dto: LessonReminderCreateDTO): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.authHeaders() });
  }

  updateProject(userProjectId: number, projectId: number): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(
      `${this.apiUrl}/${userProjectId}/project`,
      { projectId },
      { headers: this.authHeaders() },
    );
  }

  delete(userProjectId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${userProjectId}`, {
      headers: this.authHeaders(),
    });
  }

  toggleActive(userProjectId: number): Observable<ToggleLessonReminderResultDTO> {
    return this.http.put<ToggleLessonReminderResultDTO>(
      `${this.apiUrl}/${userProjectId}/toggle`,
      {},
      { headers: this.authHeaders() },
    );
  }

  // Filtro de project_staff_reminder (toggle por proyecto con staff_email)
  getProjectStaff(): Observable<ProjectStaffReminderConfigItemDTO[]> {
    return this.http.get<ProjectStaffReminderConfigItemDTO[]>(`${this.apiUrl}/project-staff`, {
      headers: this.authHeaders(),
    });
  }

  toggleProjectStaff(projectId: number): Observable<ToggleProjectStaffReminderResultDTO> {
    return this.http.put<ToggleProjectStaffReminderResultDTO>(
      `${this.apiUrl}/project-staff/toggle/${projectId}`,
      {},
      { headers: this.authHeaders() },
    );
  }

  // Jefaturas (lesson_jefe_reminder) — recordatorio del 4.º día
  getJefes(): Observable<JefeReminderConfigItemDTO[]> {
    return this.http.get<JefeReminderConfigItemDTO[]>(`${this.apiUrl}/jefe`, {
      headers: this.authHeaders(),
    });
  }

  toggleJefe(workerId: number): Observable<ToggleJefeReminderResultDTO> {
    return this.http.put<ToggleJefeReminderResultDTO>(
      `${this.apiUrl}/jefe/toggle/${workerId}`,
      {},
      { headers: this.authHeaders() },
    );
  }

  // Revisor de Trabajadores (workers.worker_lesson_jefe_id)
  getWorkerRevisores(): Observable<WorkerRevisorItemDTO[]> {
    return this.http.get<WorkerRevisorItemDTO[]>(`${this.apiUrl}/worker-revisor`, {
      headers: this.authHeaders(),
    });
  }

  getWorkerRevisorOptions(): Observable<WorkerRevisorOptionDTO[]> {
    return this.http.get<WorkerRevisorOptionDTO[]>(`${this.apiUrl}/worker-revisor/options`, {
      headers: this.authHeaders(),
    });
  }

  updateWorkerRevisor(workerId: number, dto: WorkerRevisorUpdateDTO): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}/worker-revisor/${workerId}`, dto, {
      headers: this.authHeaders(),
    });
  }

  toggleAutoApproveLesson(workerId: number): Observable<ToggleAutoApproveLessonResultDTO> {
    return this.http.put<ToggleAutoApproveLessonResultDTO>(
      `${this.apiUrl}/worker-revisor/${workerId}/auto-approve`,
      {},
      { headers: this.authHeaders() },
    );
  }
}
