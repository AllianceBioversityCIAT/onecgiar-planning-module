import { Test, TestingModule } from '@nestjs/testing';
import { BudgetAssumptionsService } from './budget-assumptions.service';

describe('BudgetAssumptionsService', () => {
  let service: BudgetAssumptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BudgetAssumptionsService],
    }).compile();

    service = module.get<BudgetAssumptionsService>(BudgetAssumptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
