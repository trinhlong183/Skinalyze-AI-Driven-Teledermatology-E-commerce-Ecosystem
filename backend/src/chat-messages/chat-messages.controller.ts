import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatMessagesService } from './chat-messages.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

@ApiTags('Chat Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat-messages')
export class ChatMessagesController {
  constructor(private readonly chatMessagesService: ChatMessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message (Text + Optional Image) in a chat session' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request (Invalid file or missing content)' })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createChatMessageDto: CreateChatMessageDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    // 1. Validation: Ensure either text OR image exists
    // The DTO allows optional text, but we can't have BOTH missing.
    if (!createChatMessageDto.messageContent && !image) {
      throw new BadRequestException('Message must contain either text or an image');
    }

    // 2. Default Text Logic:
    // If user sends ONLY an image, default the text to a standard prompt.
    // This ensures the AI service always receives a valid string prompt.
    if (!createChatMessageDto.messageContent && image) {
      createChatMessageDto.messageContent = 'Analyze this image';
    }

    // 3. File Validation
    if (image) {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedMimeTypes.includes(image.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
        );
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (image.size > maxSize) {
        throw new BadRequestException('File size must not exceed 5MB');
      }
    }

    return await this.chatMessagesService.createUserMessage(
      createChatMessageDto,
      image,
    );
  }

  @Post('analyze-image/:chatId')
  @ApiOperation({ summary: 'Upload and analyze skin image (Legacy/Standalone)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Image analyzed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid image file' })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  @UseInterceptors(FileInterceptor('image'))
  async analyzeImage(
    @Param('chatId') chatId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('additionalText') additionalText?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG and WebP images are allowed',
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    return await this.chatMessagesService.analyzeImage(
      chatId,
      file,
      additionalText,
    );
  }

  @Get('chat/:chatId')
  @ApiOperation({ summary: 'Get all messages in a chat session' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async findAllByChatSession(@Param('chatId') chatId: string) {
    return await this.chatMessagesService.findAllByChatSession(chatId);
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async remove(@Param('messageId') messageId: string) {
    await this.chatMessagesService.remove(messageId);
    return { message: 'Message deleted successfully' };
  }
}