import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
} from 'class-validator';
import { ShippingMethod } from '../../shipping-logs/entities/shipping-log.entity';

export enum PaymentMethod {
  WALLET = 'wallet', // Thanh toán bằng balance
  COD = 'cod', // Cash on delivery
  BANKING = 'banking', // Chuyển khoản ngân hàng (SePay)
  BANK_TRANSFER = 'bank_transfer',
  MOMO = 'momo',
  ZALOPAY = 'zalopay',
  VNPAY = 'vnpay',
}

export class CheckoutCartDto {
  @ApiProperty({
    example: '72 Thành Thái, Phường 14, Quận 10, Hồ Chí Minh, Vietnam',
  })
  @IsString()
  shippingAddress: string;

  @ApiProperty({
    example: 'Hồ Chí Minh',
    description: 'Province/City name (BE will auto-find GHN code)',
    required: false,
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({
    example: 'Quận 10',
    description: 'District name (BE will auto-find GHN code)',
    required: false,
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({
    example: 'Phường 14',
    description: 'Ward name (BE will auto-find GHN code)',
    required: false,
  })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiProperty({
    example: 500000,
    description: 'Total amount for the order (including shipping fee)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiProperty({
    example: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ],
    description:
      'Optional: Specific product IDs to checkout. If not provided, checkout all items with selected=true in cart',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedProductIds?: string[];

  @ApiProperty({
    example: 'cod',
    enum: PaymentMethod,
    description:
      'Payment method: wallet (từ balance), cod, banking (chuyển khoản real-time), bank_transfer, momo, zalopay, vnpay',
    default: PaymentMethod.COD,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    example: false,
    description:
      'If true, use wallet balance to pay for this order (same as paymentMethod=wallet)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  useWallet?: boolean;

  @ApiProperty({ example: 'Please call before delivery', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: 'INTERNAL',
    enum: ShippingMethod,
    description:
      'Shipping method: INTERNAL (nội bộ), GHN (third-party), or BATCH (combine orders)',
    default: ShippingMethod.INTERNAL,
    required: false,
  })
  @IsOptional()
  @IsEnum(ShippingMethod)
  shippingMethod?: ShippingMethod;
}
