import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../../shared/components/search-select/search-select';
import { WorkItemCategoryService } from '../../../services/work-item-category.service';
import {
  WorkItemCategoryEditDto,
  WorkItemCategoryClauseUpsertDto,
  WorkItemCategoryAnexo3ClauseUpsertDto,
  WorkItemCategoryAnexo4ClauseUpsertDto,
} from '../../../dtos/work-item-category-edit.dto';
import {
  WorkItemCategoryClauseDto,
  WorkItemCategoryAnexo3ClauseDto,
  WorkItemCategoryAnexo4ClauseDto,
  WorkSpecialtyOptionDto,
} from '../../../dtos/work-item-category.dto';
import { LoaderService } from '../../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

/** Secciones mayores: una por tipo de contrato */
type MajorSection = 'suministro' | 'instalacion' | 'suministroInstalacion';
/** Mini-secciones dentro de Suministro */
type SuministroSub = 'clausulas' | 'anexo3' | 'anexo4';

/** Modalidad de contrato por sección (FK a contract_modality) */
const MODALITY_BY_SECTION: Record<MajorSection, number> = {
  suministroInstalacion: 1,
  suministro: 2,
  instalacion: 3,
};

@Component({
  selector: 'app-work-item-category-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './edit.html',
})
export class WorkItemCategoryEdit implements OnInit {
  @Input() dto: WorkItemCategoryEditDto = {
    workItemCategoryId: 0,
    workItemCategoryDescription: '',
    workSpecialtyId: null,
    active: true,
    clauses: [],
    anexo3Clauses: [],
    anexo4Clauses: [],
  };

  /** Especialidades disponibles para el desplegable. */
  specialties: WorkSpecialtyOptionDto[] = [];
  /** Cláusulas 9.x/7.x ya guardadas (con flags por tipo de contrato) */
  @Input() existingClauses: WorkItemCategoryClauseDto[] = [];
  /** Cláusulas Anexo 3 ya guardadas (solo suministro) */
  @Input() existingAnexo3Clauses: WorkItemCategoryAnexo3ClauseDto[] = [];
  /** Cláusulas Anexo 4 ya guardadas (solo suministro) */
  @Input() existingAnexo4Clauses: WorkItemCategoryAnexo4ClauseDto[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  /** Sección mayor visible (tipo de contrato) */
  activeSection: MajorSection = 'suministro';
  /** Mini-sección visible dentro de Suministro */
  suministroSub: SuministroSub = 'clausulas';

  /** Opciones del desplegable de Estado */
  estadoOptions = [
    { value: true, label: 'ACTIVO' },
    { value: false, label: 'INACTIVO' },
  ];

  /**
   * Cláusulas 9.x/7.x — lista maestra. Cada cláusula pertenece a UNA modalidad de
   * contrato (contractModalityId) y es independiente: editarla no afecta a otras modalidades.
   */
  clauses: WorkItemCategoryClauseUpsertDto[] = [];
  // Indexado por MajorSection; tipado laxo porque el contexto de ng-template llega como `any`
  newClauseText: { [key: string]: string } = {
    suministro: '',
    instalacion: '',
    suministroInstalacion: '',
  };

  /** Cláusulas Anexo 3 — copia de trabajo (solo suministro) */
  anexo3Clauses: WorkItemCategoryAnexo3ClauseUpsertDto[] = [];
  newAnexo3ClauseText = '';

  /** Cláusulas Anexo 4 — copia de trabajo (solo suministro) */
  anexo4Clauses: WorkItemCategoryAnexo4ClauseUpsertDto[] = [];
  newAnexo4ClauseText = '';

  constructor(
    private service: WorkItemCategoryService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getSpecialties().subscribe({
      next: (res) => {
        this.specialties = res;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
    this.clauses = this.existingClauses.map((c) => ({
      workItemCategoryClauseId: c.workItemCategoryClauseId,
      clauseText: c.clauseText,
      sortOrder: c.sortOrder,
      contractModalityId: c.contractModalityId,
    }));
    this.anexo3Clauses = this.existingAnexo3Clauses.map((c) => ({
      workItemCategoryAnexo3ClauseId: c.workItemCategoryAnexo3ClauseId,
      clauseText: c.clauseText,
      sortOrder: c.sortOrder,
    }));
    this.anexo4Clauses = this.existingAnexo4Clauses.map((c) => ({
      workItemCategoryAnexo4ClauseId: c.workItemCategoryAnexo4ClauseId,
      clauseText: c.clauseText,
      sortOrder: c.sortOrder,
    }));
  }

  setSection(section: MajorSection): void {
    this.activeSection = section;
  }

  setSuministroSub(sub: SuministroSub): void {
    this.suministroSub = sub;
  }

  // ── Cláusulas 9.x/7.x por modalidad de contrato ─────────────────────
  clausesFor(section: MajorSection): WorkItemCategoryClauseUpsertDto[] {
    const modalityId = MODALITY_BY_SECTION[section];
    return this.clauses.filter((c) => c.contractModalityId === modalityId);
  }

  addClause(section: MajorSection): void {
    const text = this.newClauseText[section].trim();
    if (!text) return;
    this.clauses.push({
      clauseText: text,
      sortOrder: this.clauses.length,
      contractModalityId: MODALITY_BY_SECTION[section],
    });
    this.newClauseText[section] = '';
  }

  removeClause(section: MajorSection, clause: WorkItemCategoryClauseUpsertDto): void {
    const idx = this.clauses.indexOf(clause);
    if (idx >= 0) this.clauses.splice(idx, 1);
    this.recalcSortOrder(this.clauses);
  }

  moveClauseUp(section: MajorSection, index: number): void {
    if (index === 0) return;
    this.swapInMaster(this.clausesFor(section)[index - 1], this.clausesFor(section)[index]);
  }

  moveClauseDown(section: MajorSection, index: number): void {
    const visible = this.clausesFor(section);
    if (index === visible.length - 1) return;
    this.swapInMaster(visible[index], visible[index + 1]);
  }

  /** Intercambia la posición de dos cláusulas dentro de la lista maestra y recalcula el orden */
  private swapInMaster(a: WorkItemCategoryClauseUpsertDto, b: WorkItemCategoryClauseUpsertDto): void {
    const ia = this.clauses.indexOf(a);
    const ib = this.clauses.indexOf(b);
    if (ia < 0 || ib < 0) return;
    [this.clauses[ia], this.clauses[ib]] = [this.clauses[ib], this.clauses[ia]];
    this.recalcSortOrder(this.clauses);
  }

  // ── Cláusulas Anexo 3 (solo Suministro) ──────────────────────────────
  addAnexo3Clause(): void {
    const text = this.newAnexo3ClauseText.trim();
    if (!text) return;
    this.anexo3Clauses.push({ clauseText: text, sortOrder: this.anexo3Clauses.length });
    this.newAnexo3ClauseText = '';
  }

  removeAnexo3Clause(index: number): void {
    this.anexo3Clauses.splice(index, 1);
    this.recalcSortOrder(this.anexo3Clauses);
  }

  moveAnexo3ClauseUp(index: number): void {
    if (index === 0) return;
    [this.anexo3Clauses[index - 1], this.anexo3Clauses[index]] = [
      this.anexo3Clauses[index],
      this.anexo3Clauses[index - 1],
    ];
    this.recalcSortOrder(this.anexo3Clauses);
  }

  moveAnexo3ClauseDown(index: number): void {
    if (index === this.anexo3Clauses.length - 1) return;
    [this.anexo3Clauses[index], this.anexo3Clauses[index + 1]] = [
      this.anexo3Clauses[index + 1],
      this.anexo3Clauses[index],
    ];
    this.recalcSortOrder(this.anexo3Clauses);
  }

  // ── Cláusulas Anexo 4 (solo Suministro) ──────────────────────────────
  addAnexo4Clause(): void {
    const text = this.newAnexo4ClauseText.trim();
    if (!text) return;
    this.anexo4Clauses.push({ clauseText: text, sortOrder: this.anexo4Clauses.length });
    this.newAnexo4ClauseText = '';
  }

  removeAnexo4Clause(index: number): void {
    this.anexo4Clauses.splice(index, 1);
    this.recalcSortOrder(this.anexo4Clauses);
  }

  moveAnexo4ClauseUp(index: number): void {
    if (index === 0) return;
    [this.anexo4Clauses[index - 1], this.anexo4Clauses[index]] = [
      this.anexo4Clauses[index],
      this.anexo4Clauses[index - 1],
    ];
    this.recalcSortOrder(this.anexo4Clauses);
  }

  moveAnexo4ClauseDown(index: number): void {
    if (index === this.anexo4Clauses.length - 1) return;
    [this.anexo4Clauses[index], this.anexo4Clauses[index + 1]] = [
      this.anexo4Clauses[index + 1],
      this.anexo4Clauses[index],
    ];
    this.recalcSortOrder(this.anexo4Clauses);
  }

  private recalcSortOrder(list: { sortOrder: number }[]): void {
    list.forEach((c, i) => (c.sortOrder = i));
  }

  save(): void {
    if (!this.dto.workItemCategoryDescription.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa una descripción.' });
      return;
    }
    if (!this.dto.workSpecialtyId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Selecciona la especialidad.' });
      return;
    }

    // Agregar texto pendiente de cualquiera de las secciones si el usuario olvidó pulsar "Agregar"
    (Object.keys(this.newClauseText) as MajorSection[]).forEach((s) => {
      if (this.newClauseText[s].trim()) this.addClause(s);
    });
    if (this.newAnexo3ClauseText.trim()) this.addAnexo3Clause();
    if (this.newAnexo4ClauseText.trim()) this.addAnexo4Clause();

    this.dto.clauses = this.clauses;
    this.dto.anexo3Clauses = this.anexo3Clauses;
    this.dto.anexo4Clauses = this.anexo4Clauses;

    this.loaderService.show();
    this.service.edit(this.dto).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Registro actualizado exitosamente', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
