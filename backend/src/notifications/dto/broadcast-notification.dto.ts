import {
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

export class BroadcastNotificationDto {
  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.SYSTEM,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase())
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'System Maintenance',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'System will be under maintenance from 2 AM to 4 AM',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Additional data (JSON)',
    example: {
      maintenanceStart: '2025-10-25T02:00:00Z',
      maintenanceEnd: '2025-10-25T04:00:00Z',
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  data?: any;

  @ApiProperty({
    description: 'Action URL (navigate when clicked)',
    example: '/system/maintenance-info',
    required: false,
  })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiProperty({
    description: 'Image URL',
    example: 'https://example.com/maintenance-icon.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Priority level',
    enum: NotificationPriority,
    example: NotificationPriority.HIGH,
    required: false,
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase())
  priority?: NotificationPriority;
}
