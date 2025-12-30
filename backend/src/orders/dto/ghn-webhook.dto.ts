import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * GHN Fee Breakdown
 */
export class GhnFeeDto {
  @ApiPropertyOptional({ description: 'COD Failed Fee', example: 0 })
  @IsOptional()
  @IsNumber()
  CODFailedFee?: number;

  @ApiPropertyOptional({ description: 'COD Fee', example: 0 })
  @IsOptional()
  @IsNumber()
  CODFee?: number;

  @ApiPropertyOptional({ description: 'Coupon discount', example: 0 })
  @IsOptional()
  @IsNumber()
  Coupon?: number;

  @ApiPropertyOptional({
    description: 'Remote areas delivery fee',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  DeliverRemoteAreasFee?: number;

  @ApiPropertyOptional({ description: 'Document return fee', example: 0 })
  @IsOptional()
  @IsNumber()
  DocumentReturn?: number;

  @ApiPropertyOptional({ description: 'Double check fee', example: 0 })
  @IsOptional()
  @IsNumber()
  DoubleCheck?: number;

  @ApiPropertyOptional({ description: 'Insurance fee', example: 17500 })
  @IsOptional()
  @IsNumber()
  Insurance?: number;

  @ApiPropertyOptional({ description: 'Main service fee', example: 53900 })
  @IsOptional()
  @IsNumber()
  MainService?: number;

  @ApiPropertyOptional({ description: 'Pick remote areas fee', example: 53900 })
  @IsOptional()
  @IsNumber()
  PickRemoteAreasFee?: number;

  @ApiPropertyOptional({ description: 'R2S fee', example: 0 })
  @IsOptional()
  @IsNumber()
  R2S?: number;

  @ApiPropertyOptional({ description: 'Return fee', example: 0 })
  @IsOptional()
  @IsNumber()
  Return?: number;

  @ApiPropertyOptional({ description: 'Station DO fee', example: 0 })
  @IsOptional()
  @IsNumber()
  StationDO?: number;

  @ApiPropertyOptional({ description: 'Station PU fee', example: 0 })
  @IsOptional()
  @IsNumber()
  StationPU?: number;

  @ApiPropertyOptional({ description: 'Total fee', example: 0 })
  @IsOptional()
  @IsNumber()
  Total?: number;
}

/**
 * GHN Status Update Webhook DTO
 * Based on actual GHN webhook payload
 */
export class GhnStatusWebhookDto {
  @ApiProperty({
    description: 'GHN order tracking code',
    example: 'Z82BS',
  })
  @IsString()
  OrderCode: string;

  @ApiProperty({
    description: 'Current order status from GHN',
    example: 'ready_to_pick',
    enum: [
      'ready_to_pick',
      'picking',
      'money_collect_picking',
      'picked',
      'storing',
      'sorting',
      'transporting',
      'delivering',
      'money_collect_delivering',
      'delivered',
      'cancel',
      'delivery_fail',
      'waiting_to_return',
      'return',
      'return_transporting',
      'return_sorting',
      'returning',
      'return_fail',
      'returned',
    ],
  })
  @IsString()
  Status: string;

  @ApiProperty({
    description: 'Timestamp of status change (ISO 8601)',
    example: '2021-11-11T03:52:50.158Z',
  })
  @IsDateString()
  Time: string;

  @ApiPropertyOptional({
    description: 'Webhook event type',
    example: 'create',
  })
  @IsOptional()
  @IsString()
  Type?: string;

  @ApiPropertyOptional({
    description: 'COD amount to collect in VND',
    example: 3000000,
  })
  @IsOptional()
  @IsNumber()
  CODAmount?: number;

  @ApiPropertyOptional({
    description: 'Expected COD transfer date to merchant',
    example: null,
  })
  @IsOptional()
  @IsString()
  CODTransferDate?: string | null;

  @ApiPropertyOptional({
    description: 'Client order code (custom reference)',
    example: '',
  })
  @IsOptional()
  @IsString()
  ClientOrderCode?: string;

  @ApiPropertyOptional({
    description: 'Converted weight in grams',
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  ConvertedWeight?: number;

  @ApiPropertyOptional({
    description: 'Order description',
    example: 'Tạo đơn hàng',
  })
  @IsOptional()
  @IsString()
  Description?: string;

  @ApiPropertyOptional({
    description: 'Detailed fee breakdown',
    type: GhnFeeDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GhnFeeDto)
  Fee?: GhnFeeDto;

  @ApiPropertyOptional({
    description: 'Package height in cm',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  Height?: number;

  @ApiPropertyOptional({
    description: 'Is partial return allowed',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  IsPartialReturn?: boolean;

  @ApiPropertyOptional({
    description: 'Package length in cm',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  Length?: number;

  @ApiPropertyOptional({
    description: 'Partial return code',
    example: '',
  })
  @IsOptional()
  @IsString()
  PartialReturnCode?: string;

  @ApiPropertyOptional({
    description: 'Payment type (1 = Shop pays, 2 = Customer pays)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  PaymentType?: number;

  @ApiPropertyOptional({
    description: 'Reason for status (if applicable)',
    example: '',
  })
  @IsOptional()
  @IsString()
  Reason?: string;

  @ApiPropertyOptional({
    description: 'Reason code',
    example: '',
  })
  @IsOptional()
  @IsString()
  ReasonCode?: string;

  @ApiPropertyOptional({
    description: 'Shop ID from GHN',
    example: 81558,
  })
  @IsOptional()
  @IsNumber()
  ShopID?: number;

  @ApiPropertyOptional({
    description: 'Total shipping fee in VND',
    example: 71400,
  })
  @IsOptional()
  @IsNumber()
  TotalFee?: number;

  @ApiPropertyOptional({
    description: 'Warehouse/Station name',
    example: 'Bưu Cục 229 Quan Nhân-Q.Thanh Xuân-HN',
  })
  @IsOptional()
  @IsString()
  Warehouse?: string;

  @ApiPropertyOptional({
    description: 'Package weight in grams',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  Weight?: number;

  @ApiPropertyOptional({
    description: 'Package width in cm',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  Width?: number;
}

/**
 * GHN COD Collection Webhook DTO
 */
export class GhnCodWebhookDto {
  @ApiProperty({
    description: 'GHN order tracking code',
    example: 'GHN123456789',
  })
  @IsString()
  OrderCode: string;

  @ApiProperty({
    description: 'COD amount collected in VND',
    example: 500000,
  })
  @IsNumber()
  CODAmount: number;

  @ApiPropertyOptional({
    description: 'Expected transfer date to merchant',
    example: '2025-12-15',
  })
  @IsOptional()
  @IsString()
  CODTransferDate?: string;

  @ApiPropertyOptional({
    description: 'Collection timestamp (ISO 8601)',
    example: '2025-12-13T14:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  Time?: string;

  @ApiPropertyOptional({
    description: 'Shop ID from GHN',
    example: 123456,
  })
  @IsOptional()
  @IsNumber()
  ShopId?: number;

  @ApiPropertyOptional({
    description: 'Transaction reference number',
    example: 'TXN-987654321',
  })
  @IsOptional()
  @IsString()
  TransactionId?: string;
}
