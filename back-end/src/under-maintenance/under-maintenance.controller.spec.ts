import { Test, TestingModule } from '@nestjs/testing';
import { UnderMaintenanceController } from './under-maintenance.controller';

describe('UnderMaintenanceController', () => {
  let controller: UnderMaintenanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnderMaintenanceController],
    }).compile();

    controller = module.get<UnderMaintenanceController>(UnderMaintenanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
