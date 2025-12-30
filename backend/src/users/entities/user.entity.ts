import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ChatSession } from '../../chat-sessions/entities/chat-session.entity';
import { Review } from '../../reviews/entities/review.entity';

export enum UserRole {
  CUSTOMER = 'customer',
  DERMATOLOGIST = 'dermatologist',
  STAFF = 'staff',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  userId: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  fullName: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'date', nullable: true })
  dob: string;

  @Column({ type: 'text', nullable: true })
  photoUrl: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  gender: boolean; // true: Male, false : Female

  @Column('json', { nullable: true })
  allergies: string[];

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;
  // Relationship: One user has many addresses
  @OneToMany('Address', 'user')
  addresses: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  @Exclude() // 🔒 Không trả về token verification
  emailVerificationToken: string;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude() // 🔒 Không trả về expiry token
  emailVerificationTokenExpiry: Date;

  @OneToMany(() => ChatSession, (chatSession) => chatSession.user)
  chatSessions: ChatSession[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];
}
