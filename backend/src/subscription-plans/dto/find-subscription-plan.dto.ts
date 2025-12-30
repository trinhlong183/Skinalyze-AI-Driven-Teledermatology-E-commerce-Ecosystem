import { ApiProperty } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum SubscriptionPlanSortBy {
  CREATED_AT = 'createdAt',
  BASE_PRICE = 'basePrice',
  TOTAL_SESSIONS = 'totalSessions',
  DURATION_IN_DAYS = 'durationInDays',
  PLAN_NAME = 'planName',
}

export class FindSubscriptionPlansDto {
  @ApiProperty({
    description: 'Filter by active status (true/false)',
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBooleanString() // Use IsBooleanString as query params are always strings
  isActive?: string;

  @ApiProperty({
    description: 'Filter plans by a specific dermatologist',
    required: false,
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  dermatologistId?: string;

  /**
   * Search by plan name
   */
  @ApiProperty({
    description: 'Search by plan name (planName)',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by minimum price',
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsNumberString()
  minPrice?: string;

  @ApiProperty({
    description: 'Filter by maximum price',
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsNumberString()
  maxPrice?: string;

  @ApiProperty({
    description: 'Filter by minimum sessions',
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsNumberString()
  minSessions?: string;

  @ApiProperty({
    description: 'Filter by maximum sessions',
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsNumberString()
  maxSessions?: string;

  @ApiProperty({
    description: 'Filter by minimum duration (days)',
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsNumberString()
  minDuration?: string;

  @ApiProperty({
    description: 'Filter by maximum duration (days)',
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsNumberString()
  maxDuration?: string;

  @ApiProperty({
    description: 'Select field to sort by',
    required: false,
    enum: SubscriptionPlanSortBy,
    default: SubscriptionPlanSortBy.BASE_PRICE,
  })
  @IsOptional()
  @IsEnum(SubscriptionPlanSortBy)
  sortBy?: SubscriptionPlanSortBy = SubscriptionPlanSortBy.BASE_PRICE;

  @ApiProperty({
    description: 'Select sort order (Ascending/Descending)',
    required: false,
    enum: ['ASC', 'DESC'],
    default: 'ASC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
