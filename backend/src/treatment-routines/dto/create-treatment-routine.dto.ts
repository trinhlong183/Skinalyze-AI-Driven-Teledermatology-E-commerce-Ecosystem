import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { RoutineStatus } from '../entities/treatment-routine.entity';

export class CreateTreatmentRoutineDto {
  @ApiProperty({ example: 'Morning Routine for redness reduction' })
  @IsString()
  @IsNotEmpty()
  routineName: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  dermatologistId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  originalAnalysisId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440003',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  createdFromAppointmentId?: string;

  @ApiProperty({
    enum: RoutineStatus,
    required: false,
    description: 'Optional override for routine status',
  })
  @IsOptional()
  @IsEnum(RoutineStatus)
  status?: RoutineStatus;
}
