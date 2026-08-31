import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReniecPersonDTO } from "../dtos/person/personRENIEC.model";
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PersonService {

  private readonly apiUrl = `${environment.apiUrl}api/v1/person`;

  constructor(private http: HttpClient) {}

  getPersonRENIEC(documentNumber: string): Observable<ReniecPersonDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ReniecPersonDTO>(`${this.apiUrl}/reniec/${documentNumber}`, { headers: { Authorization: `Bearer ${token}` } });
  }
}