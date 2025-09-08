import { Test, TestingModule } from '@nestjs/testing';
import { BudgetAssumptionsController } from './budget-assumptions.controller';

describe('BudgetAssumptionsController', () => {
  let controller: BudgetAssumptionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetAssumptionsController],
    }).compile();

    controller = module.get<BudgetAssumptionsController>(BudgetAssumptionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
