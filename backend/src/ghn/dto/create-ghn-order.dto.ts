import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum GhnPaymentType {
  SHOP_PAYS = 1, // Shop/Merchant trả phí
  BUYER_PAYS = 2, // Người mua/nhận trả phí
}

export enum GhnRequiredNote {
  ALLOW_CHECK = 'CHOTHUHANG', // Cho thử hàng
  ALLOW_OPEN = 'CHOXEMHANGKHONGTHU', // Cho xem hàng không thử
  NO_OPEN = 'KHONGCHOXEMHANG', // Không cho xem hàng
}

class GhnItemDto {
  @ApiProperty({ example: 'Serum Vitamin C' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'SERUM-VC-001', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 250000 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiProperty({ example: 200, required: false })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiProperty({
    example: { level1: 'Skincare' },
    required: false,
  })
  @IsOptional()
  category?: {
    level1: string;
  };
}

export class CreateGhnOrderDto {
  @ApiProperty({
    enum: GhnPaymentType,
    example: GhnPaymentType.BUYER_PAYS,
    description: '1 = Shop pays, 2 = Buyer pays',
  })
  @IsEnum(GhnPaymentType)
  paymentTypeId: GhnPaymentType;

  @ApiProperty({ example: 'Giao hàng trong giờ hành chính', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    enum: GhnRequiredNote,
    example: GhnRequiredNote.NO_OPEN,
    required: false,
  })
  @IsOptional()
  @IsEnum(GhnRequiredNote)
  requiredNote?: GhnRequiredNote;

  @ApiProperty({ example: '0332190444' })
  @IsString()
  returnPhone: string;

  @ApiProperty({ example: '39 Nguyễn Tri Trường, Quận 10, TP.HCM' })
  @IsString()
  returnAddress: string;

  @ApiProperty({ example: 1444, required: false })
  @IsOptional()
  @IsNumber()
  returnDistrictId?: number;

  @ApiProperty({ example: '20308', required: false })
  @IsOptional()
  @IsString()
  returnWardCode?: string;

  @ApiProperty({ example: 'ORDER-123456', required: false })
  @IsOptional()
  @IsString()
  clientOrderCode?: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  toName: string;

  @ApiProperty({ example: '0987654321' })
  @IsString()
  toPhone: string;

  @ApiProperty({ example: '72 Thành Thái, Phường 14, Quận 10, Hồ Chí Minh' })
  @IsString()
  toAddress: string;

  @ApiProperty({ example: '20308' })
  @IsString()
  toWardCode: string;

  @ApiProperty({ example: 1444 })
  @IsNumber()
  toDistrictId: number;

  @ApiProperty({ example: 500000, description: 'COD amount (VND)' })
  @IsNumber()
  codAmount: number;

  @ApiProperty({ example: 'Đơn hàng mỹ phẩm Skinalyze' })
  @IsString()
  content: string;

  @ApiProperty({ example: 500, description: 'Total weight in grams' })
  @IsNumber()
  weight: number;

  @ApiProperty({ example: 20, description: 'Length in cm' })
  @IsNumber()
  length: number;

  @ApiProperty({ example: 15, description: 'Width in cm' })
  @IsNumber()
  width: number;

  @ApiProperty({ example: 10, description: 'Height in cm' })
  @IsNumber()
  height: number;

  @ApiProperty({ example: 1444, required: false })
  @IsOptional()
  @IsNumber()
  pickStationId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  deliverStationId?: number;

  @ApiProperty({
    example: 5000000,
    description: 'Insurance value (VND)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  insuranceValue?: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  serviceId?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  serviceTypeId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coupon?: string;

  @ApiProperty({
    example: [2],
    description: 'Pick shift: [2] = afternoon',
    required: false,
  })
  @IsOptional()
  @IsArray()
  pickShift?: number[];

  @ApiProperty({ type: [GhnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GhnItemDto)
  items: GhnItemDto[];
}
