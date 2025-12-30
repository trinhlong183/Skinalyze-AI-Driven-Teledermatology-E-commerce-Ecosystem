import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from '../chat-messages/entities/chat-message.entity';

@Injectable()
export class ChatSessionsService {
  constructor(
    @InjectRepository(ChatSession)
    private chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
  ) {}

  async create(createChatSessionDto: CreateChatSessionDto): Promise<ChatSession> {
    // Create chat session with default title
    const chatSession = this.chatSessionRepository.create({
      ...createChatSessionDto,
      title: createChatSessionDto.title || 'New chat',
    });
    const savedSession = await this.chatSessionRepository.save(chatSession);

    // Create fixed greeting message
    const greetingMessage = "Greeting, I'm Skinalyze AI, how can i help you today?";

    // Save AI greeting message
    const aiMessage = this.chatMessageRepository.create({
      chatId: savedSession.chatId,
      sender: 'ai',
      messageContent: greetingMessage,
    });
    await this.chatMessageRepository.save(aiMessage);

    // Return session with the greeting message
    return await this.findOne(savedSession.chatId);
  }

  async findAllByUser(userId: string): Promise<ChatSession[]> {
    return await this.chatSessionRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      relations: ['messages'],
    });
  }

  async findOne(chatId: string): Promise<ChatSession> {
    const chatSession = await this.chatSessionRepository.findOne({
      where: { chatId },
      relations: ['messages'],
    });

    if (!chatSession) {
      throw new NotFoundException(`Chat session with ID ${chatId} not found`);
    }

    // Sort messages by creation time
    if (chatSession.messages) {
      chatSession.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    return chatSession;
  }

  async update(chatId: string, updateChatSessionDto: UpdateChatSessionDto): Promise<ChatSession> {
    const chatSession = await this.findOne(chatId);
    Object.assign(chatSession, updateChatSessionDto);
    return await this.chatSessionRepository.save(chatSession);
  }

  async remove(chatId: string): Promise<void> {
    const chatSession = await this.findOne(chatId);
    await this.chatSessionRepository.remove(chatSession);
  }

  async updateTitleFromMessage(chatId: string, firstMessage: string): Promise<void> {
    const chatSession = await this.chatSessionRepository.findOne({
      where: { chatId },
    });

    if (chatSession && chatSession.title === 'New chat') {
      // Generate title from first message (max 50 characters)
      const newTitle = firstMessage.length > 50 
        ? firstMessage.substring(0, 47) + '...' 
        : firstMessage;
      
      chatSession.title = newTitle;
      await this.chatSessionRepository.save(chatSession);
    }
  }
}