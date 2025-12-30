import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Query,
  Patch,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * 🔔 Webhook endpoint for SePay
   * SePay sẽ gọi endpoint này khi có giao dịch mới
   */
  @Post('webhook/sepay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'SePay webhook endpoint',
    description:
      'Receives payment notifications from SePay when customers transfer money',
  })
  @ApiBody({ type: SepayWebhookDto })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleSepayWebhook(@Body() webhookData: SepayWebhookDto) {
    // Log FIRST to catch all requests
    console.log('🚨 WEBHOOK HIT! Timestamp:', new Date().toISOString());
    console.log('🚨 Webhook data:', JSON.stringify(webhookData, null, 2));

    this.logger.log(
      `📥 Received SePay webhook: Transaction #${webhookData.id}`,
    );

    try {
      const result = await this.paymentsService.handleSepayWebhook(webhookData);
      return {
        success: true,
        message: 'Webhook received',
        data: result,
      };
    } catch (error) {
      this.logger.error(`❌ Webhook processing error: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 💳 Tạo payment cho order hoặc topup
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create payment (order or topup)',
    description: 'Create payment for order or balance topup',
  })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    const payment = await this.paymentsService.createPayment(createPaymentDto);

    const paymentTypeLabel =
      payment.paymentType === 'order' ? 'đơn hàng' : 'nạp tiền';

    return {
      success: true,
      message: `Payment created for ${paymentTypeLabel}. Vui lòng chuyển khoản với mã thanh toán.`,
      data: {
        paymentType: payment.paymentType,
        paymentCode: payment.paymentCode,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        expiredAt: payment.expiredAt,
        bankingInfo: {
          bankName: 'MBBank',
          accountNumber: '0347178790',
          accountName: 'CHU PHAN NHAT LONG',
          transferContent: payment.paymentCode, // Customer PHẢI nhập đúng code này
          amount: payment.amount,
          qrCodeUrl: `https://img.vietqr.io/image/MB-0347178790-compact2.png?amount=${payment.amount}&addInfo=${payment.paymentCode}`,
          note:
            payment.paymentType === 'order'
              ? 'Thanh toán đơn hàng - Vui lòng nhập CHÍNH XÁC mã thanh toán vào nội dung chuyển khoản'
              : 'Nạp tiền vào ví - Vui lòng nhập CHÍNH XÁC mã thanh toán vào nội dung chuyển khoản',
        },
      },
    };
  }

  /**
   * 🔍 Check payment status
   */
  @Get('check/:paymentCode')
  @ApiOperation({ summary: 'Check payment status by payment code' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  async checkPaymentStatus(@Param('paymentCode') paymentCode: string) {
    const status = await this.paymentsService.checkPaymentStatus(paymentCode);

    return {
      success: true,
      data: status,
    };
  }

  /**
   * 📋 Get payments by order ID
   */
  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments for an order' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getPaymentsByOrder(@Param('orderId') orderId: string) {
    const payments = await this.paymentsService.findByOrderId(orderId);

    return {
      success: true,
      data: payments,
    };
  }

  /**
   * � Get all payments (Admin only)
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments (Admin/Staff only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'completed', 'failed', 'expired', 'refunded'],
  })
  @ApiQuery({
    name: 'paymentType',
    required: false,
    enum: ['order', 'topup', 'withdraw', 'booking', 'subscription'],
  })
  @ApiResponse({
    status: 200,
    description: 'All payments retrieved successfully',
  })
  async getAllPayments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('status') status?: string,
    @Query('paymentType') paymentType?: string,
  ) {
    const result = await this.paymentsService.findAll(
      page,
      limit,
      status,
      paymentType,
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * � Get wallet transactions (TOPUP & WITHDRAW only)
   */
  @Get('wallet/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my wallet transactions (TOPUP and WITHDRAW only)',
    description: 'Returns only the authenticated user\'s wallet transactions',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'completed', 'failed', 'expired', 'refunded'],
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet transactions retrieved successfully',
  })
  async getWalletTransactions(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('status') status?: string,
  ) {
    const userId = req.user.userId;

    const result = await this.paymentsService.findWalletTransactions(
      page,
      limit,
      status,
      userId, // Pass userId to filter by current user
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * �💸 Refund payment (TOPUP only)
   */
  @Patch(':paymentCode/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a TOPUP payment (Admin/Staff only)' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  async refundPayment(@Param('paymentCode') paymentCode: string) {
    const result = await this.paymentsService.refundTopupPayment(paymentCode);

    return {
      success: true,
      message: 'Payment refunded successfully',
      data: result,
    };
  }

  /**
   * �📄 Get payment by code
   */
  @Get(':paymentCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment details by payment code' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  async getPaymentByCode(@Param('paymentCode') paymentCode: string) {
    const payment = await this.paymentsService.findByCode(paymentCode);

    return {
      success: true,
      data: payment,
    };
  }
}
