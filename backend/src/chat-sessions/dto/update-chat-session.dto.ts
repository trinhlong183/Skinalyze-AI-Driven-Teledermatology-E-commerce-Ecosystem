import { PartialType } from '@nestjs/swagger';
import { CreateChatSessionDto } from './create-chat-session.dto';

export class UpdateChatSessionDto extends PartialType(CreateChatSessionDto) {}