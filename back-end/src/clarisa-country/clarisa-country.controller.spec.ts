import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaCountryController } from './clarisa-country.controller';

describe('ClarisaCountryController', () => {
  let controller: ClarisaCountryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaCountryController],
    }).compile();

    controller = module.get<ClarisaCountryController>(ClarisaCountryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
