import { IsString, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMeetDto {
  @ApiProperty({
    description: 'Meeting title/summary',
    example: 'Tư vấn da liễu với BS. Nguyễn Văn A',
  })
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiProperty({
    description: 'Start time in ISO 8601 format',
    example: '2025-11-15T10:00:00+07:00',
  })
  @IsDateString()
  @IsNotEmpty()
  startTimeISO: string;

  @ApiProperty({
    description: 'End time in ISO 8601 format',
    example: '2025-11-15T10:30:00+07:00',
  })
  @IsDateString()
  @IsNotEmpty()
  endTimeISO: string;
}
