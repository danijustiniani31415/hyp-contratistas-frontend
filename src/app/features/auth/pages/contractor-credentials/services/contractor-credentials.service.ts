import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  ContractorCredentialsCreateDTO,
  ContractorTokenValidationDTO,
} from '../dtos/contractor-credentials.dto';

@Injectable({ providedIn: 'root' })
export class ContractorCredentialsService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/auth/contractor-credentials`;

  constructor(private http: HttpClient) {}

  validateToken(token: string): Observable<ContractorTokenValidationDTO> {
    return this.http.get<ContractorTokenValidationDTO>(`${this.apiUrl}/validate?token=${token}`);
  }

  create(dto: ContractorCredentialsCreateDTO): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.apiUrl, dto);
  }
}
