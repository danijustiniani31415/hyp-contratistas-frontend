import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OptNuevo } from './opt-nuevo';
import { OptService } from '../../services/opt.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { TrabajadorHabService } from '../../../../../../features/habilitacion/services/trabajador-hab.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { Router } from '@angular/router';

describe('OptNuevo - firma canvas (paso 3)', () => {
  let component: OptNuevo;
  let fixture: ComponentFixture<OptNuevo>;

  beforeEach(() => {
    // jsdom no implementa getContext('2d') sin el paquete nativo 'canvas';
    // se mockea para poder probar la lógica de dibujo end-to-end.
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
    }) as any;
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OptNuevo],
      providers: [
        {
          provide: OptService,
          useValue: { getCatalogos: () => of({ pets: [], criterios: [] }) },
        },
        {
          provide: ProjectService,
          useValue: {
            getProjectsPaged: () =>
              of({ page: 1, pageSize: 200, totalRecords: 0, totalPages: 0, data: [] }),
          },
        },
        {
          provide: TrabajadorHabService,
          useValue: {
            getTrabajadores: () =>
              of({ page: 1, pageSize: 9999, totalRecords: 0, totalPages: 0, data: [] }),
          },
        },
        { provide: LoaderService, useValue: { show: () => {}, hide: () => {} } },
        { provide: ErrorService, useValue: { handleError: () => {} } },
        { provide: Router, useValue: { navigate: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OptNuevo);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit -> catálogos cargados (loadingCatalogos = false)
  });

  it('renderiza un <canvas> real (no <img>) para la firma del observador en paso 3', () => {
    component.paso = 3;
    fixture.detectChanges();

    const canvas: HTMLCanvasElement | null =
      fixture.nativeElement.querySelector('canvas#canvasObs, canvas');
    expect(canvas).not.toBeNull();
    expect(canvas!.tagName).toBe('CANVAS');
    expect(canvas!.getAttribute('src')).toBeNull();

    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeNull();
  });

  it('initCanvasObs() obtiene el contexto y dispara markForCheck (fix OnPush)', () => {
    component.paso = 3;
    fixture.detectChanges();

    const cdr = (component as any).cdr;
    const markForCheckSpy = vi.spyOn(cdr, 'markForCheck');

    component.initCanvasObs();

    expect(markForCheckSpy).toHaveBeenCalled();
  });

  it('el flujo siguiente() hacia paso 3 termina llamando initCanvasObs vía setTimeout', () => {
    vi.useFakeTimers();
    const initSpy = vi.spyOn(component, 'initCanvasObs');

    // precondiciones que exige validarPaso() para avanzar paso 1 -> 2 -> 3
    component.proyectoId = 1;
    component.tipoObservacion = 'Planeada';
    component.trabajadores.push({
      trabajador: { id: 1, apellidoNombre: 'Trabajador Test', dni: '12345678', activo: true },
      tipoTrabajador: '',
      tiempoEnObra: '',
      aniosExperiencia: '',
      firmaBase64: '',
    });
    fixture.detectChanges();

    component.siguiente(); // 1 -> 2
    fixture.detectChanges();
    component.siguiente(); // 2 -> 3
    fixture.detectChanges();

    vi.advanceTimersByTime(150);

    expect(component.paso).toBe(3);
    expect(initSpy).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('dibujar con el mouse sobre el canvas traza líneas y guarda la firma', () => {
    component.paso = 3;
    fixture.detectChanges();

    component.initCanvasObs();
    const ctx = (component as any).ctxObs;

    component.canvasObs.nativeElement.toDataURL = vi
      .fn()
      .mockReturnValue('data:image/png;base64,AAAA');

    component.startDrawObs({ offsetX: 5, offsetY: 5 } as MouseEvent);
    component.drawObs({ offsetX: 20, offsetY: 30 } as MouseEvent);
    component.stopDrawObs();

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(5, 5);
    expect(ctx.lineTo).toHaveBeenCalledWith(20, 30);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(component.firmaObsBase64).toBe('AAAA');
  });
});
