import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { WithdrawalType } from '../entities/withdrawal-request.entity';

export class CreateWithdrawalRequestDto {
  @ApiProperty({ example: '123456', description: 'OTP code sent to email' })
  @IsNotEmpty()
  @IsString()
  otpCode: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: 500000, description: 'Amount in VND' })
  @IsNotEmpty()
  @IsNumber()
  @Min(50000, { message: 'Minimum withdrawal amount is 50,000 VND' })
  amount: number;

  @ApiProperty({
    example: 'withdraw',
    enum: WithdrawalType,
    default: WithdrawalType.WITHDRAW,
  })
  @IsOptional()
  @IsEnum(WithdrawalType)
  type?: WithdrawalType;

  @ApiProperty({ example: 'Vietcombank' })
  @IsNotEmpty()
  @IsString()
  bankName: string;

  @ApiProperty({ example: '1234567890' })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 'Urgent withdrawal', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
