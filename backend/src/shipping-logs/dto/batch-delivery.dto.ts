import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ShippingMethod } from '../entities/shipping-log.entity';

export class CreateBatchDeliveryDto {
  @ApiProperty({
    example: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ],
    description: 'Array of order IDs to combine in one delivery batch',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  orderIds: string[];

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  shippingStaffId: string;

  @ApiProperty({
    example: 'Giao 3 đơn cùng địa chỉ vào buổi chiều',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AssignGhnOrderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ example: 'GHN12345678' })
  @IsString()
  ghnOrderCode: string;

  @ApiProperty({ example: '1444-C', required: false })
  @IsOptional()
  @IsString()
  ghnSortCode?: string;

  @ApiProperty({ example: 35000, required: false })
  @IsOptional()
  ghnShippingFee?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  ghnTrackingData?: any;
}

export class UpdateBatchOrderDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Order ID to update status',
  })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    example: 'DELIVERED',
    description: 'New status for this order',
    enum: ['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
  })
  @IsEnum(['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'])
  status: string;

  @ApiProperty({
    example: 'Đã giao thành công cho khách hàng',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    example: 'Khách không ở nhà',
    description: 'Required when status is FAILED',
    required: false,
  })
  @IsOptional()
  @IsString()
  unexpectedCase?: string;

  @ApiProperty({
    example: ['https://cloudinary.com/image1.jpg'],
    description: 'Proof of delivery images (required for DELIVERED)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  finishedPictures?: string[];
}

export class CompleteBatchDto {
  @ApiProperty({
    example: [
      'https://cloudinary.com/photo1.jpg',
      'https://cloudinary.com/photo2.jpg',
    ],
    description: 'Batch completion proof photos (minimum 1 required)',
  })
  @IsArray()
  @IsString({ each: true })
  completionPhotos: string[];

  @ApiProperty({
    example: 'Đã giao xong tất cả đơn trong batch',
    required: false,
  })
  @IsOptional()
  @IsString()
  completionNote?: string;

  @ApiProperty({
    example: true,
    description: 'Whether COD has been collected',
    default: false,
  })
  @IsOptional()
  codCollected?: boolean;

  @ApiProperty({
    example: 450000,
    description: 'Total COD amount collected',
    required: false,
  })
  @IsOptional()
  totalCodAmount?: number;
}

export class BulkUpdateBatchOrderDto {
  @ApiProperty({
    example: [
      {
        orderId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'DELIVERED',
        note: 'Giao thành công',
        finishedPictures: ['https://storage.com/proof1.jpg'],
      },
      {
        orderId: '550e8400-e29b-41d4-a716-446655440002',
        status: 'FAILED',
        unexpectedCase: 'Không có người nhận',
      },
    ],
    description: 'Array of order updates',
    type: [UpdateBatchOrderDto],
  })
  @IsArray()
  updates: UpdateBatchOrderDto[];
}

export class UpdateShippingMethodDto {
  @ApiProperty({
    enum: ShippingMethod,
    example: ShippingMethod.GHN,
  })
  @IsEnum(ShippingMethod)
  shippingMethod: ShippingMethod;

  @ApiProperty({
    example: 'Khoảng cách quá xa, cần GHN hỗ trợ',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
