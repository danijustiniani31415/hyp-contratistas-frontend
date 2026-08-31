import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { LoaderService } from '../../../../core/services/loader.service';
import { BirthdayClubService, CumpleaneroDto } from './birthday-club.service';

/** Un día dentro de la grilla del calendario. */
interface DiaCalendario {
  dia: number;
  /** false para los días "relleno" del mes anterior/siguiente (se ven atenuados). */
  delMes: boolean;
  /** Cumpleañeros de ese día (uno por rectángulo). */
  cumpleaneros: CumpleaneroDto[];
}

/** Un mes ya desglosado en semanas (filas de 7 días, lunes a domingo). */
interface MesCalendario {
  nombre: string;
  anio: number;
  semanas: DiaCalendario[][];
}

/**
 * "THE BIRTHDAY CLUB": calendario de cumpleaños del boletín, navegable por trimestre.
 *
 * Al abrir carga el trimestre actual (solo datos, sin fotos) y permite avanzar/retroceder
 * trimestre a trimestre. Cada cumpleañero se pinta como un "rectangulito" bajo el día
 * (intercalando azul/verde); al pasar el mouse aparece un popover con su nombre, puesto y su
 * foto, que se pide a demanda en ese momento (para no traerlas todas de golpe y que la carga
 * del trimestre sea liviana). Trimestres y fotos ya vistos quedan cacheados en el servicio.
 */
@Component({
  selector: 'app-birthday-club',
  standalone: true,
  imports: [],
  templateUrl: './birthday-club.html',
  styleUrl: './birthday-club.css',
})
export class BirthdayClub implements OnInit {
  /** Pide al contenedor cerrar el modal. */
  @Output() cerrar = new EventEmitter<void>();

  readonly diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  private readonly nombresMes = [
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE',
  ];

  /** Trimestre visible (1-4). */
  trimestre = 1;
  /** Año usado para dibujar la grilla (solo importa para el orden de los días). */
  private anio = new Date().getFullYear();

  meses: MesCalendario[] = [];

  /** Cumpleañeros indexados por "MM-DD" del trimestre visible. */
  private porDia = new Map<string, CumpleaneroDto[]>();

  /** Persona cuyo popover se muestra (hover sobre un rectángulo) y su posición en pantalla. */
  hoverPersona: CumpleaneroDto | null = null;
  hoverX = 0;
  hoverY = 0;

  constructor(
    private service: BirthdayClubService,
    private loader: LoaderService,
  ) {}

  ngOnInit(): void {
    const hoy = new Date();
    this.trimestre = Math.floor(hoy.getMonth() / 3) + 1; // 1-4
    this.cargarTrimestre(this.trimestre);
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }

  /** Nombres de los 3 meses del trimestre visible, ej. "ABRIL · MAYO · JUNIO". */
  get etiquetaTrimestre(): string {
    const inicio = (this.trimestre - 1) * 3;
    return [0, 1, 2].map((o) => this.nombresMes[inicio + o]).join(' · ');
  }

  trimestreAnterior(): void {
    this.cambiarTrimestre(this.trimestre === 1 ? 4 : this.trimestre - 1);
  }

  trimestreSiguiente(): void {
    this.cambiarTrimestre(this.trimestre === 4 ? 1 : this.trimestre + 1);
  }

  private cambiarTrimestre(t: number): void {
    if (t === this.trimestre && this.meses.length) return;
    this.trimestre = t;
    this.hoverPersona = null;
    this.cargarTrimestre(t);
  }

  private cargarTrimestre(t: number): void {
    this.loader.show();
    this.service.getTrimestre(t).subscribe({
      next: (resp) => {
        this.indexar(resp.cumpleaneros ?? []);
        this.meses = this.construirTrimestre(t);
        this.loader.hide();
      },
      error: () => {
        // Sin datos: se muestra el calendario vacío igualmente.
        this.porDia.clear();
        this.meses = this.construirTrimestre(t);
        this.loader.hide();
      },
    });
  }

  private indexar(lista: CumpleaneroDto[]): void {
    this.porDia.clear();
    for (const c of lista) {
      const clave = `${String(c.mes).padStart(2, '0')}-${String(c.dia).padStart(2, '0')}`;
      const arr = this.porDia.get(clave);
      if (arr) arr.push(c);
      else this.porDia.set(clave, [c]);
    }
  }

  // ── Popover ──────────────────────────────────────────────────────────────

  mostrarPopover(persona: CumpleaneroDto, event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.hoverX = rect.left + rect.width / 2;
    this.hoverY = rect.top;
    this.hoverPersona = persona;
    this.cargarFoto(persona);
  }

  /**
   * Trae la foto de la persona la primera vez que se hace hover y la deja guardada en su DTO.
   * `fotoBase64 === undefined` = aún no pedida; una vez resuelta (string o null) no se vuelve a
   * pedir. El servicio además cachea por correo, así que un hover repetido no pega al backend.
   */
  private cargarFoto(persona: CumpleaneroDto): void {
    if (persona.fotoBase64 !== undefined) return;
    this.service.getFoto(persona.email).subscribe({
      next: (foto) => (persona.fotoBase64 = foto),
      error: () => (persona.fotoBase64 = null),
    });
  }

  ocultarPopover(): void {
    this.hoverPersona = null;
  }

  /** Iniciales para el avatar cuando no hay foto. */
  iniciales(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  }

  // ── Construcción del calendario ────────────────────────────────────────────

  /** Construye los 3 meses del trimestre indicado (1-4). */
  private construirTrimestre(trimestre: number): MesCalendario[] {
    const mesInicio = (trimestre - 1) * 3; // 0, 3, 6 o 9
    return [0, 1, 2].map((offset) => this.construirMes(this.anio, mesInicio + offset));
  }

  /** Desglosa un mes en semanas lunes-a-domingo, con relleno de los meses vecinos. */
  private construirMes(anio: number, mes: number): MesCalendario {
    const primerDia = new Date(anio, mes, 1);
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    const diasMesPrevio = new Date(anio, mes, 0).getDate();

    // getDay(): 0=domingo..6=sábado → lo paso a 0=lunes..6=domingo.
    const offsetInicio = (primerDia.getDay() + 6) % 7;

    const celdas: DiaCalendario[] = [];

    // Relleno inicial con los últimos días del mes anterior.
    for (let i = offsetInicio - 1; i >= 0; i--) {
      celdas.push({ dia: diasMesPrevio - i, delMes: false, cumpleaneros: [] });
    }

    // Días reales del mes.
    for (let d = 1; d <= diasEnMes; d++) {
      celdas.push({ dia: d, delMes: true, cumpleaneros: this.cumpleanerosDe(mes, d) });
    }

    // Relleno final hasta completar la última semana.
    let diaSiguiente = 1;
    while (celdas.length % 7 !== 0) {
      celdas.push({ dia: diaSiguiente++, delMes: false, cumpleaneros: [] });
    }

    // Partir en filas de 7.
    const semanas: DiaCalendario[][] = [];
    for (let i = 0; i < celdas.length; i += 7) {
      semanas.push(celdas.slice(i, i + 7));
    }

    return { nombre: this.nombresMes[mes], anio, semanas };
  }

  /** Cumpleañeros de un día (mes 0-based, día 1-based) según el índice "MM-DD". */
  private cumpleanerosDe(mes: number, dia: number): CumpleaneroDto[] {
    const clave = `${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return this.porDia.get(clave) ?? [];
  }
}
