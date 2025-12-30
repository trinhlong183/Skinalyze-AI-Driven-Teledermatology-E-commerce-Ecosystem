import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatMessageDto {
  @ApiProperty({ description: 'Chat session ID', example: 'chat-123' })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({ description: 'Message content', example: 'Does this product look good for my skin?', required: false })
  @IsString()
  @IsNotEmpty()
  messageContent?: string;

  @ApiProperty({ 
    type: 'string', 
    format: 'binary', 
    required: false, 
    description: 'Optional image for VLM analysis' 
  })
  @IsOptional()
  image?: any; 
}