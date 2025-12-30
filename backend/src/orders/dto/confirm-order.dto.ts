import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShippingMethod } from '../../shipping-logs/entities/shipping-log.entity';

export class ConfirmOrderDto {
  @ApiProperty({
    description: 'ID of staff/admin who is processing the order',
    example: 'staff-uuid-123',
  })
  @IsString()
  processedBy: string;

  @ApiProperty({
    description: 'Optional note when confirming order',
    example: 'Đã kiểm tra hàng, sẵn sàng giao',
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({
    description:
      'Shipping method: INTERNAL (staff delivery), GHN (third-party), BATCH (combine orders)',
    example: 'INTERNAL',
    enum: ShippingMethod,
    default: ShippingMethod.INTERNAL,
    required: false,
  })
  @IsEnum(ShippingMethod)
  @IsOptional()
  shippingMethod?: ShippingMethod;
}
