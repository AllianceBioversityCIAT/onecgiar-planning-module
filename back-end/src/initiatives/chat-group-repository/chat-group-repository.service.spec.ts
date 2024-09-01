import { Test, TestingModule } from '@nestjs/testing';
import { ChatMessageRepositoryService } from './chat-group-repository.service';

describe('ChatGroupRepositoryService', () => {
  let service: ChatMessageRepositoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatMessageRepositoryService],
    }).compile();

    service = module.get<ChatMessageRepositoryService>(ChatMessageRepositoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
