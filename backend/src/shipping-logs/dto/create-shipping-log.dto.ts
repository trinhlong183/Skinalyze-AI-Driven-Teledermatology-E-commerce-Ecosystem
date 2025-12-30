import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import {
  ShippingStatus,
  ShippingMethod,
} from '../entities/shipping-log.entity';

export class CreateShippingLogDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: ShippingStatus, default: ShippingStatus.PENDING })
  @IsEnum(ShippingStatus)
  status: ShippingStatus;

  @ApiProperty({ example: 25000, required: false })
  @IsOptional()
  @IsNumber()
  shippingFee?: number;

  @ApiProperty({ example: 'Giao Hàng Nhanh', required: false })
  @IsOptional()
  @IsString()
  carrierName?: string;

  @ApiProperty({ example: 'Ghi chú về đơn hàng', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: 'Khách không nghe máy', required: false })
  @IsOptional()
  @IsString()
  unexpectedCase?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isCodCollected?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isCodTransferred?: boolean;

  @ApiProperty({ example: 500000, required: false })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiProperty({ example: '2025-11-05T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  codCollectDate?: Date;

  @ApiProperty({ example: '2025-11-06T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  codTransferDate?: Date;

  @ApiProperty({ example: '2025-11-10T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: Date;

  @ApiProperty({ example: '2025-11-15T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  returnedDate?: Date;

  @ApiProperty({ example: '2025-11-12T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  deliveredDate?: Date;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  shippingStaffId?: string;

  // ===== GHN INTEGRATION FIELDS =====

  @ApiProperty({
    enum: ShippingMethod,
    default: ShippingMethod.INTERNAL,
    example: 'INTERNAL',
    required: false,
  })
  @IsOptional()
  @IsEnum(ShippingMethod)
  shippingMethod?: ShippingMethod;

  @ApiProperty({
    example: 'GHN123456789',
    description: 'GHN order tracking code',
    required: false,
  })
  @IsOptional()
  @IsString()
  ghnOrderCode?: string;

  @ApiProperty({
    example: 'SORT001',
    description: 'GHN sort code',
    required: false,
  })
  @IsOptional()
  @IsString()
  ghnSortCode?: string;

  @ApiProperty({
    example: 35000,
    description: 'GHN shipping fee',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  ghnShippingFee?: number;

  @ApiProperty({
    example: 'BATCH-20251202-ABC123',
    description: 'Batch delivery code for grouped orders',
    required: false,
  })
  @IsOptional()
  @IsString()
  batchCode?: string;
}
