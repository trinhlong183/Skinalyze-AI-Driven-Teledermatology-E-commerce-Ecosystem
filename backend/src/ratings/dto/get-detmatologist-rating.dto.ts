import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum RatingSortOption {
  LATEST = 'latest',
  HIGHEST = 'highest',
  LOWEST = 'lowest',
}

export class GetDermatologistRatingsDto {
  @ApiPropertyOptional({
    description: 'Number of ratings per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Page index (1-based)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Filter by exact rating value (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Sort order for ratings',
    enum: RatingSortOption,
    default: RatingSortOption.LATEST,
  })
  @IsOptional()
  @IsEnum(RatingSortOption)
  sort?: RatingSortOption = RatingSortOption.LATEST;
}
