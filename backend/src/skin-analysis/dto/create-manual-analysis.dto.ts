import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateManualAnalysisDto {
  @ApiProperty({
    description: 'Primary complaint',
    example: 'Redness on cheeks',
  })
  @IsString()
  chiefComplaint: string;

  @ApiProperty({
    description: 'Patient described symptoms',
    example: 'Itchy and burning sensation',
  })
  @IsString()
  patientSymptoms: string;

  @ApiProperty({
    description: 'Additional notes',
    required: false,
    example: 'Started 2 days ago',
  })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
