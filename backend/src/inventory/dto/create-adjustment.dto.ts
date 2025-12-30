import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { AdjustmentType } from '../entities/inventory-adjustment.entity';

export class CreateAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsEnum(AdjustmentType)
  adjustmentType: AdjustmentType;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  requestedBy: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  originalPrice?: number;
}
