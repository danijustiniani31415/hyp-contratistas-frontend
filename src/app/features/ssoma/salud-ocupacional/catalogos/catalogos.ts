import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { CatalogoClinicas } from './components/catalogo-clinicas/catalogo-clinicas';
import { CatalogoMedicos } from './components/catalogo-medicos/catalogo-medicos';
import { CatalogoEmoTipos } from './components/catalogo-emo-tipos/catalogo-emo-tipos';
import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';

type CatalogoTab = 'clinicas' | 'medicos' | 'emo-tipos';

@Component({
  selector: 'app-salud-catalogos',
  standalone: true,
  imports: [CommonModule, CatalogoClinicas, CatalogoMedicos, CatalogoEmoTipos, AbrilPageHeaderComponent],
  templateUrl: './catalogos.html',
  styleUrl: './catalogos.css',
})
export class Catalogos {
  readonly tabs = SSOMA_TABS;
  anioActual = new Date().getFullYear();
  activeTab: CatalogoTab = 'clinicas';

  setTab(tab: CatalogoTab): void {
    this.activeTab = tab;
  }
}
