import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ 
    example: 500000, 
    description: 'Amount in VND to verify OTP for' 
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(50000, { message: 'Minimum withdrawal amount is 50,000 VND' })
  amount: number;
}
