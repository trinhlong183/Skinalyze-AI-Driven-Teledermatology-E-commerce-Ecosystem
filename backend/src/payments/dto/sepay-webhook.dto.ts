import { IsString, IsNumber, IsIn, IsOptional } from 'class-validator';

export class SepayWebhookDto {
  @IsNumber()
  id: number; // ID giao dịch trên SePay

  @IsString()
  gateway: string; // Brand name của ngân hàng

  @IsString()
  transactionDate: string; // Thời gian xảy ra giao dịch

  @IsString()
  accountNumber: string; // Số tài khoản ngân hàng

  @IsOptional()
  @IsString()
  code?: string; // Mã code thanh toán

  @IsString()
  content: string; // Nội dung chuyển khoản

  @IsString()
  @IsIn(['in', 'out'])
  transferType: 'in' | 'out'; // Loại giao dịch

  @IsNumber()
  transferAmount: number; // Số tiền giao dịch

  @IsNumber()
  accumulated: number; // Số dư tài khoản

  @IsOptional()
  @IsString()
  subAccount?: string; // Tài khoản phụ

  @IsString()
  referenceCode: string; // Mã tham chiếu SMS

  @IsString()
  description: string; // Toàn bộ nội dung tin nhắn SMS
}
