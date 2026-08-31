import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserCreate } from './create';

describe('UserCreate', () => {
  let component: UserCreate;
  let fixture: ComponentFixture<UserCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(UserCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
