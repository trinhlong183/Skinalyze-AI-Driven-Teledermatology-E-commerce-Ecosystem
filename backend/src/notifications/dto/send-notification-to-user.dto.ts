import {
  IsUUID,
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationPriority,
} from '../entities/notification.entity';

export class SendNotificationToUserDto {
  @ApiProperty({
    description: 'User ID to send notification to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.ANYTHING,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase())
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'Special Promotion',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Get 20% off on all products this weekend!',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Additional data (JSON)',
    example: { promoCode: 'WEEKEND20', discount: 20 },
    required: false,
  })
  @IsObject()
  @IsOptional()
  data?: any;

  @ApiProperty({
    description: 'Action URL (navigate when clicked)',
    example: '/promotions/weekend-sale',
    required: false,
  })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiProperty({
    description: 'Image URL',
    example: 'https://example.com/promo-banner.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Priority level',
    enum: NotificationPriority,
    example: NotificationPriority.MEDIUM,
    required: false,
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase())
  priority?: NotificationPriority;
}
