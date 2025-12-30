import { PartialType } from '@nestjs/swagger';
import { CreateReturnRequestDto } from './create-return-request.dto';

export class UpdateReturnRequestDto extends PartialType(CreateReturnRequestDto) {}
