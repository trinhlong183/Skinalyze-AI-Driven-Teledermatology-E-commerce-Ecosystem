import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ReturnRequestStatus,
  ReturnReason,
} from '../entities/return-request.entity';

class CustomerInfoDto {
  @ApiProperty()
  @Expose()
  customerId: string;

  @ApiProperty()
  @Expose()
  fullName?: string;

  @ApiProperty()
  @Expose()
  email?: string;

  @ApiProperty()
  @Expose()
  phone?: string;
}

class OrderInfoDto {
  @ApiProperty()
  @Expose()
  orderId: string;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}

class ShippingLogInfoDto {
  @ApiProperty()
  @Expose()
  shippingLogId: string;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  carrierName: string;
}

class StaffInfoDto {
  @ApiProperty()
  @Expose()
  userId: string;

  @ApiProperty()
  @Expose()
  fullName: string;

  @ApiProperty()
  @Expose()
  email: string;
}

export class ReturnRequestResponseDto {
  @ApiProperty({
    description: 'Return Request ID',
    example: 'cd486617-7a1c-4dc9-a86c-550f890d4e15',
  })
  @Expose()
  returnRequestId: string;

  @ApiProperty({
    description: 'Order ID',
    example: '6a53c9ee-b9af-437a-b7f4-80884c548b8c',
  })
  @Expose()
  orderId: string;

  @ApiProperty({
    description: 'Shipping Log ID',
    example: '0666b3a2-fdd6-4123-9288-cc5625d220a4',
  })
  @Expose()
  shippingLogId: string;

  @ApiProperty({
    description: 'Customer ID',
    example: '108abcc6-e3cc-4581-9f43-bd07965b5205',
  })
  @Expose()
  customerId: string;

  @ApiProperty({
    description: 'Return reason',
    enum: ReturnReason,
    example: ReturnReason.DAMAGED,
  })
  @Expose()
  reason: ReturnReason;

  @ApiProperty({
    description: 'Detailed reason',
    example: 'Sản phẩm bị vỡ khi nhận hàng',
    nullable: true,
  })
  @Expose()
  reasonDetail?: string;

  @ApiProperty({
    description: 'Evidence photos URLs',
    type: [String],
    example: ['https://example.com/photo1.jpg'],
    nullable: true,
  })
  @Expose()
  evidencePhotos?: string[];

  @ApiProperty({
    description: 'Return request status',
    enum: ReturnRequestStatus,
    example: ReturnRequestStatus.PENDING,
  })
  @Expose()
  status: ReturnRequestStatus;

  @ApiProperty({
    description: 'Review note from staff',
    nullable: true,
  })
  @Expose()
  reviewNote?: string;

  @ApiProperty({
    description: 'Reviewed at',
    nullable: true,
  })
  @Expose()
  reviewedAt?: Date;

  @ApiProperty({
    description: 'Assigned at',
    nullable: true,
  })
  @Expose()
  assignedAt?: Date;

  @ApiProperty({
    description: 'Returned to warehouse at',
    nullable: true,
  })
  @Expose()
  returnedToWarehouseAt?: Date;

  @ApiProperty({
    description: 'Completion note',
    nullable: true,
  })
  @Expose()
  completionNote?: string;

  @ApiProperty({
    description: 'Return completion photos',
    type: [String],
    nullable: true,
  })
  @Expose()
  returnCompletionPhotos?: string[];

  @ApiProperty({
    description: 'Is refunded',
    example: false,
  })
  @Expose()
  isRefunded: boolean;

  @ApiProperty({
    description: 'Refund amount',
    example: 500000,
    nullable: true,
  })
  @Expose()
  refundAmount?: number;

  @ApiProperty({
    description: 'Refunded at',
    nullable: true,
  })
  @Expose()
  refundedAt?: Date;

  @ApiProperty({ description: 'Customer information', type: CustomerInfoDto })
  @Expose()
  @Type(() => CustomerInfoDto)
  customer?: CustomerInfoDto;

  @ApiProperty({ description: 'Order information', type: OrderInfoDto })
  @Expose()
  @Type(() => OrderInfoDto)
  order?: OrderInfoDto;

  @ApiProperty({
    description: 'Shipping log information',
    type: ShippingLogInfoDto,
  })
  @Expose()
  @Type(() => ShippingLogInfoDto)
  shippingLog?: ShippingLogInfoDto;

  @ApiProperty({
    description: 'Staff who reviewed',
    type: StaffInfoDto,
    nullable: true,
  })
  @Expose()
  @Type(() => StaffInfoDto)
  reviewedByStaff?: StaffInfoDto;

  @ApiProperty({
    description: 'Staff assigned to handle return',
    type: StaffInfoDto,
    nullable: true,
  })
  @Expose()
  @Type(() => StaffInfoDto)
  assignedStaff?: StaffInfoDto;

  @ApiProperty({ description: 'Created at' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  @Expose()
  updatedAt: Date;
}
