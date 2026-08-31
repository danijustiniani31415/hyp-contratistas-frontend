import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/guards/role.guard';
import { Dashboard } from './dashboard/dashboard';
import { Emos } from './emos/emos';
import { EmosConfiguracionComponent } from './emos/configuracion/emos-configuracion.component';
import { EmoHistorial } from './emos/components/emo-historial/emo-historial';
import { Programaciones } from './programaciones/programaciones';
import { Interconsultas } from './interconsultas/interconsultas';
import { Convalidaciones } from './convalidaciones/convalidaciones';
import { Catalogos } from './catalogos/catalogos';
import { Reportes } from './reportes/reportes';
import { TopicoComponent } from './topico/topico.component';
import { AccidentesComponent } from './accidentes/accidentes.component';
import { DescansosComponent } from './descansos/descansos.component';
import { AsistenteSocialComponent } from './asistente-social/asistente-social.component';
import { MiSaludComponent } from './mi-salud/mi-salud.component';
import { MiSaludConfiguracionComponent } from './mi-salud/configuracion/mi-salud-configuracion.component';
import { PasoSaludListaComponent } from './paso/pages/lista-salud/paso-salud-lista.component';

export const SALUD_OCUPACIONAL_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - DASHBOARD', featureKey: 'ssoma.salud-ocupacional.dashboard' },
  },
  {
    path: 'emos',
    component: Emos,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - EMOs', featureKey: 'ssoma.salud-ocupacional.emos' },
  },
  {
    path: 'emos/configuracion',
    component: EmosConfiguracionComponent,
    canActivate: [roleGuard],
    data: {
      titulo: 'EMOs - CONFIGURACIÓN',
      featureKey: 'ssoma.salud-ocupacional.emos.configuracion',
    },
  },
  {
    path: 'emos/:workerId/historial',
    component: EmoHistorial,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - HISTORIAL EMO', featureKey: 'ssoma.salud-ocupacional.emos' },
  },
  {
    path: 'programaciones',
    component: Programaciones,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - PROGRAMACIONES', featureKey: 'ssoma.salud-ocupacional.programaciones' },
  },
  {
    path: 'interconsultas',
    component: Interconsultas,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - INTERCONSULTAS', featureKey: 'ssoma.salud-ocupacional.interconsultas' },
  },
  {
    path: 'convalidaciones',
    component: Convalidaciones,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - CONVALIDACIONES', featureKey: 'ssoma.salud-ocupacional.convalidaciones' },
  },
  {
    path: 'catalogos',
    component: Catalogos,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - CATÁLOGOS', featureKey: 'ssoma.salud-ocupacional.catalogos' },
  },
  {
    path: 'reportes',
    component: Reportes,
    data: { titulo: 'SALUD OCUPACIONAL - REPORTES' },
  },
  {
    path: 'topico',
    component: TopicoComponent,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - TÓPICO MÉDICO', featureKey: 'ssoma.salud-ocupacional.topico' },
  },
  {
    path: 'accidentes',
    component: AccidentesComponent,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - ACCIDENTES DE TRABAJO', featureKey: 'ssoma.salud-ocupacional.accidentes' },
  },
  {
    path: 'descansos',
    component: DescansosComponent,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - DESCANSOS MÉDICOS', featureKey: 'ssoma.salud-ocupacional.descansos' },
  },
  {
    path: 'asistente-social',
    component: AsistenteSocialComponent,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - ASISTENTE SOCIAL', featureKey: 'ssoma.salud-ocupacional.asistente-social' },
  },
  {
    path: 'paso',
    component: PasoSaludListaComponent,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - PASO', featureKey: 'ssoma.salud-ocupacional.paso' },
  },
  {
    path: 'mi-salud',
    component: MiSaludComponent,
    canActivate: [roleGuard],
    data: { titulo: 'SALUD OCUPACIONAL - MI SALUD', featureKey: 'ssoma.salud-ocupacional.mi-salud' },
  },
  {
    path: 'mi-salud/configuracion',
    component: MiSaludConfiguracionComponent,
    canActivate: [roleGuard],
    data: {
      titulo: 'MI SALUD - CONFIGURACIÓN',
      featureKey: 'ssoma.salud-ocupacional.mi-salud.configuracion',
    },
  },
];
