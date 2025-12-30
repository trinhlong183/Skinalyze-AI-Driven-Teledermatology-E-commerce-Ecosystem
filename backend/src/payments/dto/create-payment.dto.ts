import {
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  IsString,
  IsObject,
} from 'class-validator';
import { PaymentMethod, PaymentType } from '../entities/payment.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Order ID (required for order payment)',
    example: 'uuid-string',
    required: false,
  })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({
    description: 'User ID (required for topup)',
    example: 'uuid-string',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Plan ID (required for subscription)',
    example: 'uuid-string',
    required: false,
  })
  @IsString()
  @IsOptional()
  planId?: string;

  @ApiProperty({
    description: 'Customer ID (for creating order after payment)',
    example: 'customer-uuid',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({
    description: 'Cart data (for creating order after payment)',
    example: { items: [] },
    required: false,
  })
  @IsObject()
  @IsOptional()
  cartData?: any;

  @ApiProperty({
    description: 'Shipping address',
    example: '123 Nguyen Hue, Q1, HCMC',
    required: false,
  })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiProperty({
    description: 'GHN Ward Code',
    example: '20308',
    required: false,
  })
  @IsString()
  @IsOptional()
  toWardCode?: string;

  @ApiProperty({
    description: 'GHN District ID',
    example: 1444,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  toDistrictId?: number;

  @ApiProperty({
    description: 'Order notes',
    example: 'Giao giờ hành chính',
    required: false,
  })
  @IsString()
  @IsOptional()
  orderNotes?: string;

  @ApiProperty({
    description: 'Preferred shipping method (INTERNAL or GHN)',
    example: 'GHN',
    required: false,
  })
  @IsString()
  @IsOptional()
  shippingMethod?: string;

  @ApiProperty({
    description: 'Payment type',
    enum: PaymentType,
    example: PaymentType.ORDER,
  })
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @ApiProperty({
    description: 'Amount to pay (VND)',
    example: 500000,
    minimum: 1000,
  })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    default: PaymentMethod.BANKING,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod = PaymentMethod.BANKING;
}
