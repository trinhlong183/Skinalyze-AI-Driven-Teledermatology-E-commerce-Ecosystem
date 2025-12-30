import { PartialType } from '@nestjs/swagger';
import { CreateRoutineDetailDto } from './create-routine-detail.dto';

export class UpdateRoutineDetailDto extends PartialType(
  CreateRoutineDetailDto,
) {}
