import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSpecializationDto } from './create-specialization.dto';

export class UpdateSpecializationDto extends PartialType(
  OmitType(CreateSpecializationDto, ['dermatologistId'] as const),
) {}
