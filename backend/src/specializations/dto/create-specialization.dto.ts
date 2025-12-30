import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSpecializationDto {
  @ApiProperty({
    description: 'Dermatologist ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  dermatologistId: string;

  @ApiProperty({
    description: 'Specialization name',
    example: 'Cosmetic Dermatology',
  })
  @IsString()
  @IsNotEmpty()
  specializationName: string;

  @ApiProperty({
    description: 'Specialty area',
    example: 'Anti-aging treatments',
  })
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiProperty({
    description: 'Certificate image URL',
    required: false,
    example: 'https://cloudinary.com/certificates/cert123.jpg',
  })
  @IsString()
  @IsOptional()
  certificateImageUrl?: string;

  @ApiProperty({
    description: 'Description of the specialization',
    required: false,
    example: 'Board certified in cosmetic dermatology procedures',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Certification level',
    required: false,
    example: 'Expert',
  })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiProperty({
    description: 'Issuing authority',
    required: false,
    example: 'American Board of Dermatology',
  })
  @IsString()
  @IsOptional()
  issuingAuthority?: string;

  @ApiProperty({
    description: 'Issue date',
    required: false,
    example: '2020-01-15',
  })
  @IsDateString()
  @IsOptional()
  issueDate?: Date;

  @ApiProperty({
    description: 'Expiry date',
    required: false,
    example: '2030-01-15',
  })
  @IsDateString()
  @IsOptional()
  expiryDate?: Date;
}
