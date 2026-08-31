import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RespondReportModal } from './respond-report-modal';

describe('RespondReportModal', () => {
  let component: RespondReportModal;
  let fixture: ComponentFixture<RespondReportModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RespondReportModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RespondReportModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
