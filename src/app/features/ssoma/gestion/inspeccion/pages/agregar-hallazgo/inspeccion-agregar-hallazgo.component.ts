import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { InspeccionService } from '../../inspeccion.service';
import { InspeccionHallazgoRequest } from '../../inspeccion.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { TrabajadorHabService } from '../../../../../../features/habilitacion/services/trabajador-hab.service';
import { WorkerHabilitacionListDto } from '../../../../../../features/habilitacion/dtos/trabajador.model';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inspeccion-agregar-hallazgo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SearchSelect, AbrilModalPanel],
  templateUrl: './inspeccion-agregar-hallazgo.component.html',
  styleUrl: './inspeccion-agregar-hallazgo.component.css',
})
export class InspeccionAgregarHallazgoComponent implements OnInit {
  inspeccionId = 0;
  guardando = false;
  workers: WorkerHabilitacionListDto[] = [];
  responsableId: number | null = null;

  descripcion = '';
  tipo: 'Critico' | 'Mayor' | 'Menor' = 'Mayor';
  area = '';
  responsableNombre = '';
  responsableCargo = '';
  fechaLimite = '';
  accionCorrectiva = '';
  fotosBase64: string[] = [];
  fotosPreview: string[] = [];

  constructor(
    private inspeccionService: InspeccionService,
    private trabajadorHabService: TrabajadorHabService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.inspeccionId = Number(this.route.snapshot.paramMap.get('id'));
    this.trabajadorHabService.getTrabajadores({ pageSize: 9999, soloVerificacion: true }).subscribe({
      next: (res) => {
        this.workers = res.data;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  onResponsableChange(id: number | null): void {
    this.responsableId = id;
    if (!id) {
      this.responsableNombre = '';
    } else {
      const w = this.workers.find((x) => x.workerId === id);
      if (w) this.responsableNombre = w.apellidoNombre;
    }
    this.cdr.markForCheck();
  }

  setTipo(t: 'Critico' | 'Mayor' | 'Menor'): void {
    this.tipo = t;
    this.cdr.markForCheck();
  }

  tipoClass(t: string): string {
    if (t === 'Critico') return 'badge-critico';
    if (t === 'Mayor') return 'badge-mayor';
    return 'badge-menor';
  }

  onFotoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;
    for (let i = 0; i < files.length && this.fotosBase64.length < 5; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target!.result as string;
        this.fotosPreview.push(dataUrl);
        this.fotosBase64.push(dataUrl.split(',')[1]);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  quitarFoto(idx: number): void {
    this.fotosBase64.splice(idx, 1);
    this.fotosPreview.splice(idx, 1);
    this.cdr.markForCheck();
  }

  get puedeGuardar(): boolean {
    return this.descripcion.trim().length > 0 && this.fotosBase64.length > 0;
  }

  guardar(): void {
    if (!this.puedeGuardar || this.guardando) return;
    this.guardando = true;
    this.loaderService.show();

    const req: InspeccionHallazgoRequest = {
      descripcion: this.descripcion,
      tipo: this.tipo,
      area: this.area || undefined,
      responsableNombre: this.responsableNombre || undefined,
      responsableCargo: this.responsableCargo || undefined,
      fechaLimite: this.fechaLimite || undefined,
      accionCorrectiva: this.accionCorrectiva || undefined,
      fotosBase64: this.fotosBase64,
    };

    this.inspeccionService.agregarHallazgo(this.inspeccionId, req).subscribe({
      next: () => {
        this.guardando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Hallazgo agregado',
          confirmButtonText: 'Agregar otro',
          showCancelButton: true,
          cancelButtonText: 'Terminar',
        }).then((res) => {
          if (res.isConfirmed) {
            this.descripcion = '';
            this.tipo = 'Mayor';
            this.area = '';
            this.responsableId = null;
            this.responsableNombre = '';
            this.responsableCargo = '';
            this.fechaLimite = '';
            this.accionCorrectiva = '';
            this.fotosBase64 = [];
            this.fotosPreview = [];
            this.cdr.markForCheck();
          } else {
            this.router.navigate(['/ssoma/gestion/inspeccion', this.inspeccionId]);
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/ssoma/gestion/inspeccion', this.inspeccionId]);
  }
}
