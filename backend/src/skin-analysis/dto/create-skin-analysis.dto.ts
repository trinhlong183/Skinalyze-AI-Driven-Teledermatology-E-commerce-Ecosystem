import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';

export class CreateSkinAnalysisDto {
  @IsString()
  customerId: string;

  @IsEnum(['AI_SCAN', 'MANUAL'])
  source: string;

  @IsOptional()
  @IsString()
  chiefComplaint?: string | null;

  @IsOptional()
  @IsString()
  patientSymptoms?: string | null;

  @IsArray()
  @IsString({ each: true })
  imageUrls: string[];

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  aiDetectedDisease?: string | null;

  @IsOptional()
  @IsString()
  aiDetectedCondition?: string | null;

  @IsOptional()
  @IsArray()
  aiRecommendedProducts?: any[] | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mask?: string[] | null;
}