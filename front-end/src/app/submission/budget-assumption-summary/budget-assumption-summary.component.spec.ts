import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetAssumptionSummaryComponent } from './budget-assumption-summary.component';

describe('BudgetAssumptionSummaryComponent', () => {
  let component: BudgetAssumptionSummaryComponent;
  let fixture: ComponentFixture<BudgetAssumptionSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BudgetAssumptionSummaryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BudgetAssumptionSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
