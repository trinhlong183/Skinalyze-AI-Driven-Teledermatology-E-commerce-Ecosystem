import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../types/appointment.types';
import { Appointment } from '../entities/appointment.entity';
import { Transform } from 'class-transformer';

export class FindAppointmentsDto {
  @ApiPropertyOptional({
    description: 'Filter appointments by customer ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter appointments by dermatologist ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  dermatologistId?: string;

  @ApiPropertyOptional({
    description:
      'Filter appointments by status. Can be repeated (e.g., status=A&status=B) or comma-separated (if using custom transformer).',
    enum: AppointmentStatus,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    // If is string (1 value), wrap it in an array
    if (typeof value === 'string') {
      return [value];
    }
    // If already an array (multiple values), keep as is
    return value as string[];
  })
  @IsEnum(AppointmentStatus, { each: true })
  status?: AppointmentStatus[];
}
// Omit loại bỏ các thuộc tính không cần thiết từ Appointment (nếu có)
// & thêm thuộc tính mới
export type AppointmentDetailDto = Omit<Appointment, never> & {
  statusMessage: string | null;
};
