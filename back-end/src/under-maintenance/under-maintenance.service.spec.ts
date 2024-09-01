import { Test, TestingModule } from '@nestjs/testing';
import { UnderMaintenanceService } from './under-maintenance.service';

describe('UnderMaintenanceService', () => {
  let service: UnderMaintenanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnderMaintenanceService],
    }).compile();

    service = module.get<UnderMaintenanceService>(UnderMaintenanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
