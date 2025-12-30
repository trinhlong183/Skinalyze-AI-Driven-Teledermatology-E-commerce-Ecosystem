import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSessionsService } from './chat-sessions.service';
import { ChatSessionsController } from './chat-sessions.controller';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from '../chat-messages/entities/chat-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatSession, ChatMessage])],
  controllers: [ChatSessionsController],
  providers: [ChatSessionsService],
  exports: [ChatSessionsService],
})
export class ChatSessionsModule {}