import {
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  IsString,
} from 'class-validator';

export class CreateDermatologistDto {
  @IsOptional()
  @IsNumber()
  yearsOfExp?: number;

  @IsOptional()
  @IsString()
  about?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0)
  defaultSlotPrice?: number;
}

export class UpdateDermatologistDto {
  @IsOptional()
  @IsNumber()
  yearsOfExp?: number;

  @IsOptional()
  @IsString()
  about?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0)
  defaultSlotPrice?: number;
}
