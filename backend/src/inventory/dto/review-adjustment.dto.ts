import { IsEnum, IsString, IsOptional } from 'class-validator';
import { AdjustmentStatus } from '../entities/inventory-adjustment.entity';

export class ReviewAdjustmentDto {
  @IsEnum(AdjustmentStatus)
  status: AdjustmentStatus; // APPROVED or REJECTED

  @IsString()
  reviewedBy: string; // Admin user ID

  @IsString()
  @IsOptional()
  rejectionReason?: string; // Required if status is REJECTED
}
