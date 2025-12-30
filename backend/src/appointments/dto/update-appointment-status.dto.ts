import { IsEnum } from 'class-validator';
import { AppointmentStatus } from '../types/appointment.types';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAppointmentStatusDto {
  @ApiProperty({
    description: 'New status for the appointment',
    enum: AppointmentStatus,
    example: AppointmentStatus.SCHEDULED,
  })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;
}
