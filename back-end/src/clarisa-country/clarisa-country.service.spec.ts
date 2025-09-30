import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaCountryService } from './clarisa-country.service';

describe('ClarisaCountryService', () => {
  let service: ClarisaCountryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaCountryService],
    }).compile();

    service = module.get<ClarisaCountryService>(ClarisaCountryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
