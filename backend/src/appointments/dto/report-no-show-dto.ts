import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportNoShowDto {
  @ApiProperty({
    description: 'Ghi chú thêm của người báo cáo (Optional)',
    required: false,
    example: 'Bác sĩ có vào nhưng không bật cam/mic rồi thoát ra ngay',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
