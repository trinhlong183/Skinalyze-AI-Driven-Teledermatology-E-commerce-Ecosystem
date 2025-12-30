import { PartialType } from '@nestjs/swagger';
import { CreateReviewDto } from './create-review.dto';
import { IsNumber, IsString, Min, Max, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReviewDto extends PartialType(CreateReviewDto) {
  @ApiPropertyOptional({
    description: 'Updated rating from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Updated review content',
    minLength: 10,
    maxLength: 1000,
    example: 'Updated: Good product, but a bit expensive.',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  content?: string;
}