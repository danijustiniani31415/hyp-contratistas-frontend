import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';
import { ReunionAgendaDTO } from '../../dtos/actas-reunion.dto';

interface GrupoTemas {
  workerNombre: string;
  subareaDescripcion: string | null;
  temas: string[];
}

/**
 * Bloque "agenda dinámica" (cargar/editar mis temas + ver los de otros participantes), usado tanto
 * en la página de acceso directo por link de correo (reunion-agenda) como embebido dentro del acta
 * completa (reunion-detail). Antes esta lógica estaba duplicada en ambos componentes — un fix se
 * aplicaba a uno y el otro se quedaba con el bug (pasó con el autoguardado al borrar un tema).
 */
@Component({
  selector: 'app-mis-temas-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-temas-agenda.html',
})
export class MisTemasAgenda implements OnChanges {
  @Input({ required: true }) reunionId!: number;
  @Input({ required: true }) agenda!: ReunionAgendaDTO;

  /** Emite cada vez que se guarda un cambio, por si el padre quiere refrescar algo más. */
  @Output() saved = new EventEmitter<void>();

  misTemasLista: string[] = [];
  nuevoTema = '';
  guardado = false;
  private guardadoTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private service: ActasReunionService,
    private errorService: ErrorService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['agenda'] && this.agenda) {
      this.misTemasLista = this.agenda.items
        .filter((i) => i.workerId === this.agenda.workerIdActual)
        .map((i) => i.descripcion);
    }
  }

  get otrosTemas(): GrupoTemas[] {
    if (!this.agenda) return [];
    const items = this.agenda.items.filter((i) => i.workerId !== this.agenda.workerIdActual);

    const grupos = new Map<number, GrupoTemas>();
    for (const item of items) {
      const grupo = grupos.get(item.workerId);
      if (grupo) {
        grupo.temas.push(item.descripcion);
      } else {
        grupos.set(item.workerId, {
          workerNombre: item.workerNombre,
          subareaDescripcion: item.subareaDescripcion,
          temas: [item.descripcion],
        });
      }
    }
    return Array.from(grupos.values());
  }

  /** Confirma el tema que se está escribiendo (al salir del campo o presionar Enter) y lo agrega a la lista. */
  confirmarNuevoTema(): void {
    const texto = this.nuevoTema.trim();
    if (!texto) return;
    this.misTemasLista.push(texto);
    this.nuevoTema = '';
    this.guardar();
  }

  actualizarTema(index: number, valor: string): void {
    const texto = valor.trim();
    if (!texto) {
      this.removerTema(index);
      return;
    }
    if (texto === this.misTemasLista[index]) return;
    this.misTemasLista[index] = texto;
    this.guardar();
  }

  removerTema(index: number): void {
    this.misTemasLista.splice(index, 1);
    this.guardar();
  }

  /** Guarda la lista completa en segundo plano, sin bloquear la edición ni requerir un botón. */
  private guardar(): void {
    const temas = this.misTemasLista.map((descripcion) => ({ descripcion }));

    this.service.guardarMisTemas(this.reunionId, { temas }).subscribe({
      next: () => {
        this.guardado = true;
        if (this.guardadoTimeout) clearTimeout(this.guardadoTimeout);
        this.guardadoTimeout = setTimeout(() => (this.guardado = false), 2000);
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
