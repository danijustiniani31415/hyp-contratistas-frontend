import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IvtControl } from './ivt-control';

describe('IvtControl', () => {
  let component: IvtControl;
  let fixture: ComponentFixture<IvtControl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IvtControl]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IvtControl);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
