import {
  IsNumber,
  IsPositive,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TopupBalanceDto {
  @ApiProperty({
    description: 'Số tiền nạp vào tài khoản (VND)',
    example: 500000,
    minimum: 10000,
  })
  @IsNumber()
  @IsPositive()
  @Min(10000, { message: 'Số tiền nạp tối thiểu là 10,000 VND' })
  amount: number;

  @ApiProperty({
    description: 'Phương thức thanh toán',
    example: 'momo',
    enum: ['momo', 'zalopay', 'vnpay', 'bank_transfer', 'cash'],
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({
    description: 'Ghi chú cho giao dịch',
    example: 'Nạp tiền qua Momo',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
