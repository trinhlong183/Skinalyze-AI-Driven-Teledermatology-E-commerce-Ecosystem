import { IsUUID, IsNumber, IsString, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'UUID of the product being reviewed',
    example: '511fa772-4a30-4f85-91b0-25cc07655f26',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Review content (minimum 10 characters)',
    minLength: 10,
    maxLength: 1000,
    example: 'Amazing product! Really improved my skin texture and reduced my acne.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  content: string;
}