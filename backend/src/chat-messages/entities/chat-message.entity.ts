import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatSession } from '../../chat-sessions/entities/chat-session.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  messageId: string;

  @Column()
  chatId: string;

  @Column({ type: 'enum', enum: ['user', 'ai'] })
  sender: string;

  @Column('text')
  messageContent: string;

  @Column({ type: 'varchar', nullable: true }) 
  imageUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ChatSession, (chatSession) => chatSession.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  chatSession: ChatSession;
}