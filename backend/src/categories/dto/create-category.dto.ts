import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Serums', description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  categoryName: string;

  @ApiProperty({
    example: 'Skincare serums for various skin concerns',
    description: 'Category description',
  })
  @IsString()
  @IsNotEmpty()
  categoryDescription: string;
}
