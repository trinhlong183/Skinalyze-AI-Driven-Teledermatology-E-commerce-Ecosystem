import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMyPatientsDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên hoặc số điện thoại' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mỗi trang', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export class PatientListItemDto {
  customerId: string;
  userId: string;
  fullName: string;
  photoUrl: string;
  phone: string;
  age: number | null;
  gender: boolean; // true: Male, false: Female

  lastAppointment: {
    appointmentId: string;
    date: Date;
    status: string;
    type: string;
  } | null;

  nextAppointment: {
    appointmentId: string;
    date: Date;
    status: string;
    type: string;
    isToday: boolean;
  } | null;
}
