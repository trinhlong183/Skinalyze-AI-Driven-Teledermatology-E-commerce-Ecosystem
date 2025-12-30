import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReturnReason } from '../entities/return-request.entity';

export class CreateReturnRequestDto {
  @ApiProperty({
    description: 'Order ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Shipping Log ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  shippingLogId: string;

  @ApiProperty({
    description: 'Return reason',
    enum: ReturnReason,
    example: ReturnReason.DAMAGED,
  })
  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @ApiProperty({
    description: 'Detailed reason description',
    example: 'Sản phẩm bị vỡ khi nhận hàng',
    required: false,
  })
  @IsOptional()
  @IsString()
  reasonDetail?: string;

  @ApiProperty({
    description: 'Evidence photos URLs',
    example: [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
    ],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  evidencePhotos?: string[];
}
