import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteOrderDto {
  @ApiPropertyOptional({ 
    description: 'Customer feedback or notes about the completed order',
    example: 'Sản phẩm tốt, giao hàng nhanh'
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}
