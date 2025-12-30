import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class GetAvailabilitySummaryDto {
  @ApiProperty({
    description: 'Tháng cần kiểm tra (từ 1 đến 12)',
    example: '11',
  })
  @IsNotEmpty()
  @IsString()
  @Length(1, 2)
  month: string;

  @ApiProperty({
    description: 'Năm cần kiểm tra (4 chữ số)',
    example: '2025',
  })
  @IsNotEmpty()
  @IsString()
  @Length(4, 4)
  year: string;
}
