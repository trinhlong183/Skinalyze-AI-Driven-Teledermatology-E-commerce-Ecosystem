import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsDateString,
  IsUrl,
  IsEnum,
  IsNumber,
  IsBoolean,  // Add this import for boolean validation
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'SecurePassword123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString()
  fullName: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.CUSTOMER,
    required: false,
    default: UserRole.CUSTOMER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    description: 'User phone number (optional)',
    example: '+84901234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'User date of birth (optional)',
    example: '1990-01-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiProperty({
    description: 'User profile photo URL (optional)',
    example: 'https://example.com/photos/john.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'photoUrl must be a valid URL' })
  photoUrl?: string;

  // Address fields
  @ApiProperty({
    description: 'Full street address',
    example: '123 Nguyen Hue Street',
  })
  @IsString()
  street: string;

  @ApiProperty({
    description: 'Street address line 1 (optional)',
    example: 'Building A, Floor 5',
    required: false,
  })
  @IsOptional()
  @IsString()
  streetLine1?: string;

  @ApiProperty({
    description: 'Street address line 2 (optional)',
    example: 'Apartment 502',
    required: false,
  })
  @IsOptional()
  @IsString()
  streetLine2?: string;

  @ApiProperty({
    description: 'Ward or Sub-district',
    example: 'Ben Nghe Ward',
  })
  @IsString()
  wardOrSubDistrict: string;

  @ApiProperty({
    description: 'District',
    example: 'District 1',
  })
  @IsString()
  district: string;

  @ApiProperty({
    description: 'City or Province',
    example: 'Ho Chi Minh City',
  })
  @IsString()
  city: string;

  @ApiProperty({
    description: 'GHN District ID (optional)',
    example: 1442,
    required: false,
  })
  @IsOptional()
  districtId?: number;

  @ApiProperty({
    description: 'GHN Ward Code (optional)',
    example: '21211',
    required: false,
  })
  @IsOptional()
  @IsString()
  wardCode?: string;

  @ApiProperty({
    description: 'User gender (optional) - true for Male, false for Female',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  gender?: boolean;
}
