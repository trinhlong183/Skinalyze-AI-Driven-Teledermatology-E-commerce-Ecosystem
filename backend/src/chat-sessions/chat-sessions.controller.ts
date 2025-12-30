import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatSessionsService } from './chat-sessions.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('chat-sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat-sessions')
export class ChatSessionsController {
  constructor(private readonly chatSessionsService: ChatSessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat session' })
  @ApiResponse({ status: 201, description: 'Chat session created successfully' })
  create(@Body() createChatSessionDto: CreateChatSessionDto) {
    return this.chatSessionsService.create(createChatSessionDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all chat sessions for a user' })
  @ApiResponse({ status: 200, description: 'Chat sessions retrieved successfully' })
  findAllByUser(@Param('userId') userId: string) {
    return this.chatSessionsService.findAllByUser(userId);
  }

  @Get(':chatId')
  @ApiOperation({ summary: 'Get a specific chat session with messages' })
  @ApiResponse({ status: 200, description: 'Chat session retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  findOne(@Param('chatId') chatId: string) {
    return this.chatSessionsService.findOne(chatId);
  }

  @Patch(':chatId')
  @ApiOperation({ summary: 'Update a chat session' })
  @ApiResponse({ status: 200, description: 'Chat session updated successfully' })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  update(@Param('chatId') chatId: string, @Body() updateChatSessionDto: UpdateChatSessionDto) {
    return this.chatSessionsService.update(chatId, updateChatSessionDto);
  }

  @Delete(':chatId')
  @ApiOperation({ summary: 'Delete a chat session and all its messages' })
  @ApiResponse({ status: 200, description: 'Chat session deleted successfully' })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  async remove(@Param('chatId') chatId: string) {
    await this.chatSessionsService.remove(chatId);
    return { message: 'Chat session deleted successfully' };
  }
}