import { Test, TestingModule } from '@nestjs/testing';
import { AnaplanController } from './anaplan.controller';

describe('AnaplanController', () => {
  let controller: AnaplanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnaplanController],
    }).compile();

    controller = module.get<AnaplanController>(AnaplanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
