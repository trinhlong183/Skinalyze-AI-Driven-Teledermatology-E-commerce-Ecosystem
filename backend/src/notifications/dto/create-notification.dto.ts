import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
  IsObject,
} from 'class-validator';
import {
  NotificationType,
  NotificationPriority,
} from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.ORDER })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({ example: 'New Order Received' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Your order #12345 has been confirmed' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    example: { orderId: '123', amount: 500000 },
    required: false,
  })
  @IsObject()
  @IsOptional()
  data?: any;

  @ApiProperty({ example: '/orders/123', required: false })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiProperty({
    example: 'https://example.com/icon.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    enum: NotificationPriority,
    example: NotificationPriority.MEDIUM,
    required: false,
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;
}
