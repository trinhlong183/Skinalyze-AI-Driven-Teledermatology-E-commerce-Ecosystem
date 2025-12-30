import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaymentMethod } from 'src/payments/entities/payment.entity';

export class CreateCustomerSubscriptionDto {
  @ApiProperty({
    description:
      'ID của Gói dịch vụ (SubscriptionPlan) mà khách hàng muốn mua.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  planId: string;

  @ApiProperty({
    description: 'Phương thức thanh toán (tùy chọn, mặc định là BANKING)',
    enum: PaymentMethod,
    default: PaymentMethod.BANKING,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod = PaymentMethod.BANKING;
}
