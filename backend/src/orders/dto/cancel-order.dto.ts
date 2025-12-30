import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiProperty({
    description: 'Reason for cancelling/rejecting the order',
    example: 'Sản phẩm tạm hết hàng',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({
    description: 'ID of staff/admin who cancelled the order',
    example: 'staff-uuid-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  cancelledBy?: string;
}
