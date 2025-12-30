import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteBatchSlotsDto {
  @ApiProperty({
    description: 'List of slot IDs to cancel',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one slot ID is required' })
  @IsUUID('4', { each: true, message: 'Each slot ID must be a valid UUID' })
  slotIds: string[];
}
