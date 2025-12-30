import { PartialType } from '@nestjs/swagger';
import { CreateSkinAnalysisDto } from './create-skin-analysis.dto';

export class UpdateSkinAnalysisDto extends PartialType(CreateSkinAnalysisDto) {}
