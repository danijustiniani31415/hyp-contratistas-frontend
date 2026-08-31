import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportViewImages } from './report-view-images';

describe('ReportViewImages', () => {
  let component: ReportViewImages;
  let fixture: ComponentFixture<ReportViewImages>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportViewImages]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportViewImages);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
