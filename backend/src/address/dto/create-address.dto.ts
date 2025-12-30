import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    description: 'User ID who owns this address',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Full street address',
    example: '123 Nguyen Hue Street',
  })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({
    description: 'Street address line 1 (optional)',
    example: 'Building A, Floor 5',
    required: false,
  })
  @IsString()
  @IsOptional()
  streetLine1?: string;

  @ApiProperty({
    description: 'Street address line 2 (optional)',
    example: 'Apartment 502',
    required: false,
  })
  @IsString()
  @IsOptional()
  streetLine2?: string;

  @ApiProperty({
    description: 'Ward or Sub-district',
    example: 'Ben Nghe Ward',
  })
  @IsString()
  @IsNotEmpty()
  wardOrSubDistrict: string;

  @ApiProperty({
    description: 'District',
    example: 'District 1',
  })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty({
    description: 'City or Province',
    example: 'Ho Chi Minh City',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'GHN District ID (optional)',
    example: 1442,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  districtId?: number;

  @ApiProperty({
    description: 'GHN Ward Code (optional)',
    example: '21211',
    required: false,
  })
  @IsOptional()
  @IsString()
  wardCode?: string;
}
