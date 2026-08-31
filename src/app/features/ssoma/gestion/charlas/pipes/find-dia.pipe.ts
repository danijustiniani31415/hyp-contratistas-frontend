import { Pipe, PipeTransform } from '@angular/core';
import { DashPersonaAsistDia } from '../dtos/charlas.dtos';

@Pipe({ name: 'findDia', standalone: true, pure: true })
export class FindDiaPipe implements PipeTransform {
  transform(dias: DashPersonaAsistDia[], numDia: number): DashPersonaAsistDia | undefined {
    return dias.find(d => d.numDia === numDia);
  }
}
