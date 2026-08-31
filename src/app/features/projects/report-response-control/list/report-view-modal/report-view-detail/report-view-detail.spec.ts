import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportViewDetail } from './report-view-detail';

describe('ReportViewDetail', () => {
  let component: ReportViewDetail;
  let fixture: ComponentFixture<ReportViewDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportViewDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportViewDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
