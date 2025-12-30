import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsArray,
  IsString,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  aiUsageAmount?: number;

  @ApiProperty({ example: [], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pastDermatologicalHistory?: string[];
}
