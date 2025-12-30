import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from '../chat-sessions/entities/chat-session.entity';
import { ChatSessionsService } from '../chat-sessions/chat-sessions.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

interface ConversationHistory {
  role: 'user' | 'ai';
  content: string;
}

interface ChatResponse {
  answer: string;
  response_time: number;
  timestamp: string;
}

interface ImageAnalysisResponse {
  skin_analysis: string;
  product_recommendation: string;
  severity_warning: string | null;
  response_time: number;
  timestamp: string;
}

@Injectable()
export class ChatMessagesService {
  private axiosInstance: AxiosInstance;
  private aiServiceUrl: string;

  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatSession)
    private chatSessionRepository: Repository<ChatSession>,
    private chatSessionsService: ChatSessionsService,
    private configService: ConfigService,
    private cloudinaryService: CloudinaryService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
    
    if (!this.aiServiceUrl) {
      throw new Error('AI_SERVICE_URL is not set in environment variables');
    }

    // Initialize axios instance with a longer timeout for AI processing (VLM)
    this.axiosInstance = axios.create({
      baseURL: this.aiServiceUrl,
      timeout: 60000, // 60 seconds timeout
    });
  }

  async createUserMessage(
    createChatMessageDto: CreateChatMessageDto,
    imageFile?: Express.Multer.File,
  ): Promise<{ userMessage: ChatMessage; aiMessage: ChatMessage }> {
    const { chatId } = createChatMessageDto;
    // Handle optional text safely
    const messageContent = createChatMessageDto.messageContent || '';

    // 1. Verify chat session exists
    const chatSession = await this.chatSessionRepository.findOne({
      where: { chatId },
      relations: ['messages'],
      order: { messages: { createdAt: 'ASC' } }
    });

    if (!chatSession) {
      throw new NotFoundException(`Chat session with ID ${chatId} not found`);
    }

    // 2. Upload to Cloudinary (if image exists)
    let savedImageUrl: string | null = null;

    if (imageFile) {
      try {
        // Upload to a 'chat-images' folder in your Cloudinary bucket
        const uploadResult = await this.cloudinaryService.uploadImage(imageFile, 'chat-images');
        savedImageUrl = uploadResult.secure_url;
      } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new BadRequestException('Failed to upload image');
      }
    }

    // 3. Save User Message (Store full Cloudinary URL)
    const userMessage = this.chatMessageRepository.create({
      chatId,
      sender: 'user',
      messageContent: messageContent,
      imageUrl: savedImageUrl, 
    });
    await this.chatMessageRepository.save(userMessage);

    // 4. Update Chat Title (if this is the first user message)
    const userMessagesCount = chatSession.messages.filter(m => m.sender === 'user').length;
    // Only update title if there is actual text content
    if (userMessagesCount === 0 && messageContent) {
      await this.chatSessionsService.updateTitleFromMessage(
        chatId,
        messageContent,
      );
    }

    // 5. Call AI Service
    // We pass the raw buffer to the AI for processing, but the DB has the Cloudinary URL
    const aiResponse = await this.getAIResponse(
      messageContent,
      chatSession.messages,
      imageFile,
    );

    // 6. Save AI Message
    const aiMessage = this.chatMessageRepository.create({
      chatId,
      sender: 'ai',
      messageContent: aiResponse,
      imageUrl: null,
    });
    await this.chatMessageRepository.save(aiMessage);

    return { userMessage, aiMessage };
  }

  private async getAIResponse(
    userMessage: string,
    previousMessages: ChatMessage[],
    imageFile?: Express.Multer.File,
  ): Promise<string> {
    try {
      const formData = new FormData();

      // A. Append Question
      const promptToSend = userMessage.trim() === '' ? 'Analyze this image' : userMessage;
      formData.append('question', promptToSend);

      // B. Append History
      const greetingMessage = "Greeting, I'm Skinalyze AI, how can i help you today?";
      const conversationHistory: ConversationHistory[] = previousMessages
        .filter((msg) => msg.messageContent !== greetingMessage)
        .map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'ai',
          content: msg.messageContent,
        }));

      formData.append('conversation_history', JSON.stringify(conversationHistory));

      // C. Append Image Buffer for AI Analysis (if exists)
      if (imageFile) {
        formData.append('image', imageFile.buffer, {
          filename: imageFile.originalname,
          contentType: imageFile.mimetype,
        });
      }

      // Call FastAPI /chat endpoint
      const response = await this.axiosInstance.post<ChatResponse>('/chat', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data.answer;
    } catch (error) {
      console.error('AI Service error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('AI Service response error:', error.response.data);
          throw new BadRequestException(
            `AI Service error: ${error.response.data.detail || 'Unknown error'}`,
          );
        } else if (error.request) {
          console.error('No response from AI Service');
          throw new BadRequestException(
            'AI Service is not responding. Please try again later.',
          );
        }
      }
      
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }

  // --- Legacy / Standalone Analysis Method ---
  async analyzeImage(
    chatId: string,
    imageFile: Express.Multer.File,
    additionalText?: string,
  ): Promise<{ userMessage: ChatMessage; aiMessage: ChatMessage }> {
    const chatSession = await this.chatSessionRepository.findOne({
      where: { chatId },
    });

    if (!chatSession) {
      throw new NotFoundException(`Chat session with ID ${chatId} not found`);
    }

    // Upload to Cloudinary
    let savedImageUrl: string | null = null;
    try {
        const uploadResult = await this.cloudinaryService.uploadImage(imageFile, 'chat-images');
        savedImageUrl = uploadResult.secure_url;
    } catch (e) {
        console.error('Failed to upload analysis image to Cloudinary', e);
        // We continue processing with AI even if upload fails (optional decision)
        // But typically you'd want to throw here if storage is critical
    }

    try {
      const formData = new FormData();
      formData.append('image', imageFile.buffer, {
        filename: imageFile.originalname,
        contentType: imageFile.mimetype,
      });

      if (additionalText) {
        formData.append('additional_text', additionalText);
      }

      const response = await this.axiosInstance.post<ImageAnalysisResponse>(
        '/analyze-image',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        },
      );

      // Save user message
      const userMessage = this.chatMessageRepository.create({
        chatId,
        sender: 'user',
        messageContent: additionalText || '[Uploaded an image for analysis]',
        imageUrl: savedImageUrl,
      });
      await this.chatMessageRepository.save(userMessage);

      // Format AI response
      let aiResponseText = '';
      if (response.data.skin_analysis) {
        aiResponseText += `**Phân tích da:**\n${response.data.skin_analysis}\n\n`;
      }
      if (response.data.product_recommendation) {
        aiResponseText += `**Gợi ý sản phẩm:**\n${response.data.product_recommendation}\n\n`;
      }
      if (response.data.severity_warning) {
        aiResponseText += `⚠️ **Cảnh báo:**\n${response.data.severity_warning}`;
      }

      // Save AI message
      const aiMessage = this.chatMessageRepository.create({
        chatId,
        sender: 'ai',
        messageContent: aiResponseText.trim(),
        imageUrl: null,
      });
      await this.chatMessageRepository.save(aiMessage);

      return { userMessage, aiMessage };
    } catch (error) {
      console.error('Image analysis error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new BadRequestException(
            `Image analysis error: ${error.response.data.detail || 'Unknown error'}`,
          );
        } else if (error.request) {
          throw new BadRequestException(
            'AI Service is not responding. Please try again later.',
          );
        }
      }
      
      throw new BadRequestException(
        'Failed to analyze image. Please try again.',
      );
    }
  }

  async findAllByChatSession(chatId: string): Promise<ChatMessage[]> {
    return await this.chatMessageRepository.find({
      where: { chatId },
      order: { createdAt: 'ASC' },
    });
  }

  async remove(messageId: string): Promise<void> {
    const message = await this.chatMessageRepository.findOne({
      where: { messageId },
    });
    
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Note: We do NOT automatically delete from Cloudinary here to prevent accidental data loss.
    // If you want to enable this, use: await this.cloudinaryService.deleteImage(publicId);
    // You would need to extract the publicId from the secure_url first.
    
    await this.chatMessageRepository.remove(message);
  }
}