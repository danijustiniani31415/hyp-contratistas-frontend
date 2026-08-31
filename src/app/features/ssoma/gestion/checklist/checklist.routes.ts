import { Routes } from '@angular/router';

export const CHECKLIST_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/checklist-main/checklist-main').then((m) => m.ChecklistMainComponent),
    data: { titulo: 'CHECKLISTS SSOMA', roles: [] },
  },
];

export default CHECKLIST_ROUTES;
