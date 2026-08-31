import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarMobile } from './sidebar-mobile';

describe('SidebarMobile', () => {
  let component: SidebarMobile;
  let fixture: ComponentFixture<SidebarMobile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarMobile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarMobile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
