import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsString()
  @IsNotEmpty()
  productDescription: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock: number;

  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sellingPrice: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  originalPrice?: number; // Cost price for inventory

  @IsArray()
  @IsString({ each: true })
  productImages: string[];

  @IsString()
  @IsNotEmpty()
  ingredients: string;

  @IsArray()
  @IsString({ each: true })
  suitableFor: string[];

  @IsArray()
  @IsOptional()
  reviews?: any[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  salePercentage?: number;
}
