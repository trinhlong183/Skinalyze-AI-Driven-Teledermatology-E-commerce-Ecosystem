import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  ORDER = 'order',
  APPOINTMENT = 'appointment',
  TREATMENT_ROUTINE = 'treatment_routine',
  PRODUCT = 'product',
  SYSTEM = 'system',
  PROMOTION = 'promotion',
  ANYTHING = 'anything',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  notificationId: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string; // Nullable for broadcast notifications

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', nullable: true })
  data: any; // Additional data (orderId, appointmentId, etc.)

  @Column({ type: 'varchar', length: 255, nullable: true })
  actionUrl: string; // URL to navigate when clicked

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string; // Icon or image for notification

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
