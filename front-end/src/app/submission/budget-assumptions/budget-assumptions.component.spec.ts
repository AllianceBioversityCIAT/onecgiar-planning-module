import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetAssumptionsComponent } from './budget-assumptions.component';

describe('BudgetAssumptionsComponent', () => {
  let component: BudgetAssumptionsComponent;
  let fixture: ComponentFixture<BudgetAssumptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BudgetAssumptionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BudgetAssumptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
