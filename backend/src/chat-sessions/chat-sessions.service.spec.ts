import { Test, TestingModule } from '@nestjs/testing';
import { ChatSessionsService } from './chat-sessions.service';

describe('ChatSessionsService', () => {
  let service: ChatSessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatSessionsService],
    }).compile();

    service = module.get<ChatSessionsService>(ChatSessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
