import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadFinishedPicturesDto {
  @ApiProperty({
    description: 'Shipping log ID',
    example: 'uuid-shipping-log-123',
  })
  @IsNotEmpty()
  @IsString()
  shippingLogId: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Ảnh bằng chứng hoàn thành (1-5 ảnh)',
  })
  files: Express.Multer.File[];
}
