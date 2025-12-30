import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class MarkAsReadDto {
  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'Array of notification IDs to mark as read',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds: string[];
}
