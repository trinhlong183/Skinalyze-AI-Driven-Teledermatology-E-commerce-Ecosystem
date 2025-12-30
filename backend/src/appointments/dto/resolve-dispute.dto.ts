import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TerminationReason } from '../types/appointment.types';

export enum DisputeDecision {
  REFUND_CUSTOMER = 'REFUND_CUSTOMER',
  PAYOUT_DOCTOR = 'PAYOUT_DOCTOR',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
}

const ALLOWED_DISPUTE_REASONS = [
  TerminationReason.DOCTOR_NO_SHOW,
  TerminationReason.CUSTOMER_NO_SHOW,
  TerminationReason.DOCTOR_ISSUE,
  TerminationReason.CUSTOMER_ISSUE,
  TerminationReason.PLATFORM_ISSUE,
  TerminationReason.SYSTEM_CANCELLED,
];

export class ResolveDisputeDto {
  @ApiProperty({
    description: 'Quyết định xử lý của Admin',
    enum: DisputeDecision,
  })
  @IsEnum(DisputeDecision)
  decision: DisputeDecision;

  @ApiProperty({
    description: 'Lý do/Ghi chú của Admin (Bắt buộc để lưu bằng chứng)',
  })
  @IsString()
  @IsNotEmpty()
  adminNote: string;

  @ApiPropertyOptional({
    description:
      'Số tiền hoàn lại cho khách (Bắt buộc nếu chọn PARTIAL_REFUND)',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @ApiPropertyOptional({
    description: 'Lý do kết thúc cuối cùng (Chốt lại sự thật vụ việc)',
    enum: ALLOWED_DISPUTE_REASONS,
  })
  @IsOptional()
  @IsIn(ALLOWED_DISPUTE_REASONS, {
    message:
      'Final reason must be related to dispute resolution (No-show, Issue, etc.)',
  })
  finalReason?: TerminationReason;
}
