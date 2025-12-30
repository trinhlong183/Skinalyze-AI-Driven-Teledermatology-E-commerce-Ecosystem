import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WithdrawalStatus } from '../entities/withdrawal-request.entity';

export class UpdateWithdrawalStatusDto {
  @ApiProperty({
    example: 'approved',
    enum: WithdrawalStatus,
  })
  @IsEnum(WithdrawalStatus)
  status: WithdrawalStatus;

  @ApiProperty({ example: 'Approved by admin', required: false })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
