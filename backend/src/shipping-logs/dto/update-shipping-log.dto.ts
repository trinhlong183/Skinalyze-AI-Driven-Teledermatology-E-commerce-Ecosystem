import { PartialType } from '@nestjs/swagger';
import { CreateShippingLogDto } from './create-shipping-log.dto';

export class UpdateShippingLogDto extends PartialType(CreateShippingLogDto) {}
