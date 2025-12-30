import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ChatMessage } from '../../chat-messages/entities/chat-message.entity';

@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  chatId: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.chatSessions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  title: string;

  @OneToMany(() => ChatMessage, (message) => message.chatSession, { cascade: true })
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}