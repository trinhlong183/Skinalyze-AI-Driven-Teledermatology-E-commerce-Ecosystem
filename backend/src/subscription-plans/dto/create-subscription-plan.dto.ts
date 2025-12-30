import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionPlanDto {
  @ApiProperty({
    description: 'Display name of the subscription plan',
    example: 'Premium Acne Care',
  })
  @IsString()
  @IsNotEmpty()
  planName: string;

  @ApiPropertyOptional({
    description: 'Short description outlining the plan benefits',
    example: 'Includes 6 dermatologist sessions and priority support',
  })
  @IsString()
  @IsOptional()
  planDescription?: string;

  @ApiProperty({
    description: 'Base price of the subscription (in VND)',
    example: 1500000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({
    description: 'Total number of sessions customers receive',
    example: 6,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  totalSessions: number;

  @ApiProperty({
    description: 'Subscription validity period expressed in days',
    example: 90,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  durationInDays: number;

  @ApiPropertyOptional({
    description: 'Whether the plan is currently active and visible to users',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
