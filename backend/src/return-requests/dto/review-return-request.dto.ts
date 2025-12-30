import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewReturnRequestDto {
  @ApiProperty({
    description: 'Review note from staff',
    example: 'Approved. Hàng đúng là bị hư hỏng.',
    required: false,
  })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class AssignStaffDto {
  // Staff ID will be taken from JWT token
  // No additional fields needed
}

export class CompleteReturnDto {
  @ApiProperty({
    description: 'Completion note',
    example: 'Đã nhận hàng về kho, tình trạng như khách mô tả',
    required: false,
  })
  @IsOptional()
  @IsString()
  completionNote?: string;

  @ApiProperty({
    description: 'Return completion photos URLs',
    example: ['https://example.com/warehouse1.jpg'],
    required: false,
    type: [String],
  })
  @IsOptional()
  returnCompletionPhotos?: string[];
}
