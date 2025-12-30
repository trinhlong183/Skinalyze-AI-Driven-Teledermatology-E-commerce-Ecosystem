import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class AssignStaffDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID của staff sẽ được gán',
  })
  @IsUUID()
  staffId: string;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Có force gán lại không (nếu đã có staff)',
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
