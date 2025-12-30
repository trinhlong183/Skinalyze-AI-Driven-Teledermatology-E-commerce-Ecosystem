import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RoutineStatus } from '../entities/treatment-routine.entity';

export class GetTreatmentRoutineDto {
  @ApiPropertyOptional({
    description: 'Filter routines by dermatologist id',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  dermatologistId?: string;

  @ApiPropertyOptional({
    description: 'Filter routines by customer id',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter routines by status',
    enum: RoutineStatus,
  })
  @IsOptional()
  @IsEnum(RoutineStatus)
  status?: RoutineStatus;
}
