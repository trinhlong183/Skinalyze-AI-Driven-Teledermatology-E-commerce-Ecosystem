import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min, IsString } from 'class-validator';
import { TransactionStatus } from '../entities/transaction.entity';

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionStatus, default: TransactionStatus.PENDING })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ example: 'wallet', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
