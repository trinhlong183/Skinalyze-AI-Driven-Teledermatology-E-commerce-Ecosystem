import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsUUID,
  ValidateNested,
  IsBoolean,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoutineStepType } from '../entities/routine-detail.entity';

// DTO for individual product items in the routine detail
export class CreateRoutineProductItemDto {
  @ApiPropertyOptional({
    description: 'ID của sản phẩm trong hệ thống (nếu có)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({
    description: 'Tên sản phẩm (bắt buộc)',
    example: 'Sữa rửa mặt CeraVe',
  })
  @IsString()
  productName: string;

  @ApiPropertyOptional({
    description: 'Cách dùng (tùy chọn)',
    example: '1 hạt đậu',
  })
  @IsOptional()
  @IsString()
  usage?: string;

  @ApiPropertyOptional({
    description: 'Tần suất sử dụng (tùy chọn)',
    example: 'Sáng và Tối',
  })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiProperty({
    description: 'Đánh dấu là sản phẩm mua ngoài (không có trong kho)',
    example: false,
  })
  @IsBoolean()
  isExternal: boolean;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm cho sản phẩm',
    example: 'Mua ở hiệu thuốc tây',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Link mua hàng bên ngoài (nếu có)',
    example: 'https://shopee.vn/product/...',
  })
  @IsOptional()
  @IsUrl()
  externalLink?: string;
}

export class CreateRoutineDetailDto {
  @ApiProperty({
    description: 'ID của Treatment Routine cha',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  routineId: string;

  @ApiPropertyOptional({
    description: 'Loại bước (enum: morning, evening...) hoặc tiêu đề',
    example: 'morning',
  })
  @IsOptional()
  @IsString()
  stepType?: RoutineStepType;

  @ApiProperty({
    description: 'Mô tả/Tiêu đề hiển thị',
    example: 'Buổi Sáng',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Hướng dẫn chung cho bước này',
    example: 'Rửa mặt sạch, sau đó thoa các sản phẩm theo thứ tự.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Danh sách sản phẩm trong bước này',
    type: [CreateRoutineProductItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRoutineProductItemDto)
  products: CreateRoutineProductItemDto[];
}
