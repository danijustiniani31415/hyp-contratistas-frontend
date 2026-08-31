import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserCreateDTO } from '../dtos/user/userCreate.model';
import { UserUpdateDTO } from '../dtos/user/userUpdate.model';
import { PagedResponseDTO } from '../dtos/api/pagedResponse.model';
import { UserDTO } from '../dtos/user/user.model';
import { environment } from '../../../environments/environment';

function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/user`;

  constructor(private http: HttpClient) {}

  getUserPaged(page: number): Observable<PagedResponseDTO<UserDTO>> {
    return this.http.get<PagedResponseDTO<UserDTO>>(`${this.apiUrl}/paged?page=${page}`, {
      headers: buildAuthHeaders(),
    });
  }

  createUser(dto: UserCreateDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto, { headers: buildAuthHeaders() });
  }

  updateUser(id: number, dto: UserUpdateDTO): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  toggleUser(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle`, {}, { headers: buildAuthHeaders() });
  }
}
