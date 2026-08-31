import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { AdjudicacionFolderDto } from '../dtos/adjudicacion-folder.dto';
import { AdjudicacionFolderCreateDto } from '../dtos/adjudicacion-folder-create.dto';
import { AdjudicacionFolderUpdateDto } from '../dtos/adjudicacion-folder-update.dto';
import { AdjudicacionFolderFilterDto } from '../dtos/adjudicacion-folder-filter.dto';
import { AdjudicacionFolderFormDataDto } from '../dtos/adjudicacion-folder-form-data.dto';
import { FolderBrowseDto, FolderItemDto } from '../dtos/folder-browse.dto';

@Injectable({ providedIn: 'root' })
export class AdjudicacionFolderService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/AdjudicacionFolder`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getPaged(filters: AdjudicacionFolderFilterDto): Observable<PagedResponseDTO<AdjudicacionFolderDto>> {
    let params = new HttpParams().set('page', filters.page.toString());
    if (filters.projectId) params = params.set('projectId', filters.projectId.toString());

    return this.http.get<PagedResponseDTO<AdjudicacionFolderDto>>(`${this.apiUrl}/paged`, {
      headers: this.headers,
      params,
    });
  }

  getFormData(): Observable<AdjudicacionFolderFormDataDto> {
    return this.http.get<AdjudicacionFolderFormDataDto>(`${this.apiUrl}/form-data`, {
      headers: this.headers,
    });
  }

  /** Valida el link (tenant) y devuelve la carpeta resuelta + sus subcarpetas. */
  resolveLink(linkUrl: string): Observable<FolderBrowseDto> {
    return this.http.post<FolderBrowseDto>(`${this.apiUrl}/resolve-link`, { linkUrl }, { headers: this.headers });
  }

  /** Lista las subcarpetas de una carpeta (navegación). */
  getFolders(driveId: string, folderId: string): Observable<FolderItemDto[]> {
    const params = new HttpParams().set('driveId', driveId).set('folderId', folderId);
    return this.http.get<FolderItemDto[]>(`${this.apiUrl}/folders`, { headers: this.headers, params });
  }

  create(dto: AdjudicacionFolderCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  update(dto: AdjudicacionFolderUpdateDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  delete(projectAdjudicacionFolderId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${projectAdjudicacionFolderId}`, {
      headers: this.headers,
    });
  }
}
