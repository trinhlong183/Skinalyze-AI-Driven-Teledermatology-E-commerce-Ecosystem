import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TerminationReason } from '../types/appointment.types';

export class InterruptAppointmentDto {
  @IsEnum(TerminationReason)
  @ApiProperty({
    description: 'Lý do gián đoạn',
    enum: [
      TerminationReason.CUSTOMER_ISSUE,
      TerminationReason.DOCTOR_ISSUE,
      TerminationReason.PLATFORM_ISSUE,
    ],
  })
  reason: TerminationReason;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiProperty({
    description: 'Mô tả chi tiết (Optional)',
    required: false,
  })
  terminationNote?: string;
}
