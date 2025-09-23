import { Test, TestingModule } from '@nestjs/testing';
import { AnaplanService } from './anaplan.service';

describe('AnaplanService', () => {
  let service: AnaplanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnaplanService],
    }).compile();

    service = module.get<AnaplanService>(AnaplanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
