import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RoleSimpleDTO } from '../dtos/role/RoleSimpleDTO.model';
import { environment } from '../../../environments/environment';
 
@Injectable({
  providedIn: 'root'
})
export class RoleService {
 
  private readonly apiUrl = `${environment.apiUrl}api/v1/role`;
 
  constructor(private http: HttpClient) {}
 
  getRoles(): Observable<RoleSimpleDTO[]> {
    const token = localStorage.getItem('access_token');
    return this.http.get<RoleSimpleDTO[]>(this.apiUrl, { headers: { Authorization: `Bearer ${token}` } });
  }
}