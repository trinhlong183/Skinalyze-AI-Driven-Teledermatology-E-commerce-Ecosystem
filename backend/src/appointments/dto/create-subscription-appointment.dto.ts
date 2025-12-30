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

export class CreateSubscriptionAppointmentDto {
  @ApiProperty({
    description: 'Dermatologist assigned to this subscription session',
    example: '9c7a8d44-4a3f-4c0a-a1ce-1234567890ab',
  })
  @IsUUID()
  dermatologistId: string;

  @ApiProperty({
    description: 'ISO start time selected from the dermatologist availability',
    example: '2025-03-01T13:00:00.000Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'ISO end time that matches the reserved slot duration',
    example: '2025-03-01T13:30:00.000Z',
  })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: 'Type of appointment for the subscription session',
    enum: AppointmentType,
    example: AppointmentType.FOLLOW_UP,
  })
  @IsEnum(AppointmentType)
  appointmentType: AppointmentType;

  // @ValidateIf(
  //   (object: CreateSubscriptionAppointmentDto) =>
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

  @ValidateIf(
    (object: CreateSubscriptionAppointmentDto) =>
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
    description: 'Optional note from customer for this session',
    example: 'Vui lòng kiểm tra lại vùng da quanh mắt.',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Identifier of the active customer subscription to consume',
    example: 'd5d0d1c8-5bf9-4f5d-9c3c-1f8bd0e5a321',
  })
  @IsUUID()
  @IsNotEmpty()
  customerSubscriptionId: string;
}
