import { TestBed } from '@angular/core/testing';

import { BudgetAssumptionsService } from './budget-assumptions.service';

describe('BudgetAssumptionsService', () => {
  let service: BudgetAssumptionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BudgetAssumptionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
