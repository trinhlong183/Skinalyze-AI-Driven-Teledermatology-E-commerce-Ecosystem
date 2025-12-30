import { Test, TestingModule } from '@nestjs/testing';
import { ChatSessionsController } from './chat-sessions.controller';
import { ChatSessionsService } from './chat-sessions.service';

describe('ChatSessionsController', () => {
  let controller: ChatSessionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatSessionsController],
      providers: [ChatSessionsService],
    }).compile();

    controller = module.get<ChatSessionsController>(ChatSessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
