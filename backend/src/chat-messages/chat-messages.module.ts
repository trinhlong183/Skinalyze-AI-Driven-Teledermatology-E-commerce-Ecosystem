import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessagesService } from './chat-messages.service';
import { ChatMessagesController } from './chat-messages.controller';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from '../chat-sessions/entities/chat-session.entity';
import { ChatSessionsModule } from '../chat-sessions/chat-sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, ChatSession]),
    ChatSessionsModule,
  ],
  controllers: [ChatMessagesController],
  providers: [ChatMessagesService],
  exports: [ChatMessagesService],
})
export class ChatMessagesModule {}