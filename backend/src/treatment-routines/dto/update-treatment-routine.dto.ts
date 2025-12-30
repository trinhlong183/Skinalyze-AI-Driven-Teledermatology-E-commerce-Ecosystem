import { PartialType } from '@nestjs/swagger';
import { CreateTreatmentRoutineDto } from './create-treatment-routine.dto';

export class UpdateTreatmentRoutineDto extends PartialType(
  CreateTreatmentRoutineDto,
) {}
