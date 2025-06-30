import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CenterValidateComponent } from './center-validate.component';

describe('CenterValidateComponent', () => {
  let component: CenterValidateComponent;
  let fixture: ComponentFixture<CenterValidateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CenterValidateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CenterValidateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
