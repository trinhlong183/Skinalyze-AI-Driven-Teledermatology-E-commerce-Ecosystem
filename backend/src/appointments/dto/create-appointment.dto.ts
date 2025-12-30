import {
  IsUUID,
  IsDateString,
  IsOptional,
  IsString,
  IsEnum,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentType } from '../types/appointment.types';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'Dermatologist being booked for the appointment',
    example: '9c7a8d44-4a3f-4c0a-a1ce-1234567890ab',
  })
  @IsUUID()
  dermatologistId: string;

  @ApiProperty({
    description: 'ISO start time matching the selected availability slot',
    example: '2025-02-15T09:00:00.000Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'ISO end time matching the selected availability slot',
    example: '2025-02-15T09:30:00.000Z',
  })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: 'Type of appointment being scheduled',
    enum: AppointmentType,
    example: AppointmentType.NEW_PROBLEM,
  })
  @IsEnum(AppointmentType)
  appointmentType: AppointmentType;

  /**
   * Bắt buộc phải có nếu 'appointmentType' là 'NEW_PROBLEM'.
   * Đây là ID của 'Skin_Analysis' (lần quét da) mà buổi hẹn này sẽ khám.
   */
  // @ValidateIf(
  //   (object: CreateAppointmentDto) =>
  //     object.appointmentType === AppointmentType.NEW_PROBLEM,
  // )
  @ApiPropertyOptional({
    description:
      'Skin analysis identifier (required when appointmentType is NEW_PROBLEM)',
    example: '6d5f9f12-4ba1-4f6e-a5af-0987654321fe',
  })
  @IsUUID()
  @IsNotEmpty()
  analysisId: string;

  /**
   * Bắt buộc phải có nếu 'appointmentType' là 'FOLLOW_UP'.
   * Đây là ID của 'Treatment_Routine' mà buổi hẹn này sẽ theo dõi.
   */
  @ValidateIf(
    (object: CreateAppointmentDto) =>
      object.appointmentType === AppointmentType.FOLLOW_UP,
  )
  @ApiPropertyOptional({
    description:
      'Treatment routine identifier (required when appointmentType is FOLLOW_UP)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  trackingRoutineId: string;

  @ApiPropertyOptional({
    description: 'Additional note from the customer for the dermatologist',
    example: 'Xin bác sĩ xem giúp kết quả xét nghiệm mới nhất.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
