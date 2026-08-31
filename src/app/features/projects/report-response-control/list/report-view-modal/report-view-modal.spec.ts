import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportViewModal } from './report-view-modal';

describe('ReportViewModal', () => {
  let component: ReportViewModal;
  let fixture: ComponentFixture<ReportViewModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportViewModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportViewModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
