import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, Repository, In } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
} from './entities/payment.entity';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/entities/order.entity';
import { UsersService } from '../users/users.service';
import { CartService } from '../cart/cart.service';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AppointmentStatus,
  TerminationReason,
} from '../appointments/types/appointment.types';
import { CustomerSubscriptionService } from '../customer-subscription/customer-subscription.service';
import { CustomerSubscription } from '../customer-subscription/entities/customer-subscription.entity';
import { SlotStatus } from '../availability-slots/entities/availability-slot.entity';
import { WithdrawalRequest, WithdrawalStatus } from '../withdrawals/entities/withdrawal-request.entity';

interface PaymentProcessingResult {
  success: boolean;
  message: string;
  paymentType?: string;
  paymentCode?: string;
  amount?: number;
  [key: string]: unknown;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly SUBSCRIPTION_FEE_RATE = 0.2; // 20% fee for subscription
  constructor(
    private readonly entityManager: EntityManager,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly usersService: UsersService,

    @Inject(forwardRef(() => CustomerSubscriptionService))
    private readonly customerSubscriptionService: CustomerSubscriptionService,
    @Inject(forwardRef(() => CartService))
    private readonly cartService: CartService,
    @Inject(forwardRef(() => AppointmentsService))
    private readonly appointmentsService: AppointmentsService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Tạo payment mới (cho order, topup, booking...)
   */
  async createPayment(
    createPaymentDto: CreatePaymentDto,
    manager?: EntityManager,
  ): Promise<Payment> {
    const repository =
      manager?.getRepository(Payment) ?? this.paymentRepository;

    const {
      orderId,
      userId,
      customerId,
      cartData,
      shippingAddress,
      orderNotes,
      amount,
      paymentMethod,
      paymentType,
      planId,
    } = createPaymentDto;

    // Validate based on payment type
    if (paymentType === PaymentType.ORDER) {
      // Nếu có orderId, verify order exists (cho trường hợp thanh toán order đã tạo)
      if (orderId) {
        const order = await this.ordersService.findOne(orderId);
        if (!order) {
          throw new NotFoundException(`Order #${orderId} not found`);
        }
      }
      // Nếu không có orderId, cần có cartData để tạo order sau khi thanh toán
      else if (!cartData || !customerId) {
        throw new BadRequestException(
          'Cart data and customer ID are required for order payment',
        );
      }
    } else if (paymentType === PaymentType.TOPUP) {
      if (!userId) {
        throw new BadRequestException('User ID is required for topup');
      }

      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      if (amount < 10000) {
        throw new BadRequestException('Số tiền nạp tối thiểu là 10,000 VND');
      }

      if (amount > 50000000) {
        throw new BadRequestException('Số tiền nạp tối đa là 50,000,000 VND');
      }
    } else if (paymentType === PaymentType.BOOKING) {
      if (!customerId) {
        throw new BadRequestException(
          'CustomerId ID is required for booking payment',
        );
      }
      if (!userId) {
        throw new BadRequestException('UserId is required for booking payment');
      }
    } else if (paymentType === PaymentType.SUBSCRIPTION) {
      if (!customerId || !planId) {
        throw new BadRequestException(
          'CustomerId and PlanId are required for subscription payment',
        );
      }
    }

    const paymentCode = this.generatePaymentCode(
      paymentType,
      orderId,
      userId,
      customerId,
    );

    // Set expiration (15 minutes for banking)
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 5);

    const paymentData: Partial<Payment> = {
      paymentCode,
      paymentType,
      amount,
      paymentMethod: paymentMethod ?? PaymentMethod.BANKING,
      status: PaymentStatus.PENDING,
      expiredAt,
    };

    if (paymentType === PaymentType.ORDER) {
      if (orderId) paymentData.orderId = orderId;
      if (customerId) paymentData.customerId = customerId;
      if (userId) paymentData.userId = userId;
      if (cartData) paymentData.cartData = JSON.stringify(cartData);
      if (shippingAddress) paymentData.shippingAddress = shippingAddress;
      if (createPaymentDto.toWardCode)
        paymentData.toWardCode = createPaymentDto.toWardCode;
      if (createPaymentDto.toDistrictId)
        paymentData.toDistrictId = createPaymentDto.toDistrictId;
      if (orderNotes) paymentData.orderNotes = orderNotes;
      if (createPaymentDto.shippingMethod)
        paymentData.shippingMethod = createPaymentDto.shippingMethod;
    } else if (paymentType === PaymentType.TOPUP) {
      if (userId) paymentData.userId = userId;
    } else if (paymentType === PaymentType.BOOKING) {
      if (userId) paymentData.userId = userId;
      if (customerId) paymentData.customerId = customerId;
    } else if (paymentType === PaymentType.SUBSCRIPTION) {
      if (customerId) paymentData.customerId = customerId;
      if (planId) paymentData.planId = planId;
    }

    const payment = repository.create(paymentData);
    const savedPayment = await repository.save(payment);

    this.logger.log(
      `💳 Payment created: ${paymentCode} - Type: ${paymentType} - Amount: ${amount}`,
    );

    return savedPayment;
  }

  /**
   * Xử lý webhook từ SePay (xác nhận thanh toán)
   */
  async handleSepayWebhook(webhookData: SepayWebhookDto): Promise<any> {
    this.logger.log(
      `🔔 Received SePay webhook: ${JSON.stringify(webhookData)}`,
    );

    // Chỉ xử lý giao dịch tiền VÀO
    if (webhookData.transferType !== 'in') {
      this.logger.warn(
        `⚠️ Ignored transaction type: ${webhookData.transferType}`,
      );
      return { success: false, message: 'Only process incoming transactions' };
    }

    // Extract payment code từ nội dung chuyển khoản
    const paymentCode = this.extractPaymentCode(webhookData.content);
    if (!paymentCode) {
      this.logger.warn(
        `⚠️ No payment code found in content: ${webhookData.content}`,
      );
      return { success: false, message: 'Payment code not found' };
    }

    let responsePayload: PaymentProcessingResult | undefined;
    let postProcess: (() => Promise<void>) | undefined;
    let processedPaymentInfo:
      | { paymentId: number; paymentCode: string }
      | undefined;

    await this.entityManager.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);
      const payment = await paymentRepo.findOne({
        where: { paymentCode },
        relations: ['appointment', 'appointment.availabilitySlot', 'user'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        this.logger.error(`❌ Payment not found in database: ${paymentCode}`);
        responsePayload = {
          success: false,
          message: 'Payment not found',
          paymentCode,
        };
        return;
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        this.logger.warn(`⚠️ Payment already completed: ${paymentCode}`);
        responsePayload = {
          success: true,
          message: 'Payment already completed',
        };
        return;
      }

      // if (payment.expiredAt && new Date() > payment.expiredAt) {
      //   payment.status = PaymentStatus.EXPIRED;
      //   await paymentRepo.save(payment);
      //   this.logger.warn(`⚠️ Payment expired: ${paymentCode}`);
      //   responsePayload = { success: false, message: 'Payment expired' };
      //   return;
      // }

      // Nếu payment đã FAILED trước đó (ví dụ do underpayment lần 1),
      // mà khách lại chuyển thêm tiền -> Vẫn hoàn về ví (Logic Fallback an toàn nhất)
      if (payment.status === PaymentStatus.FAILED) {
        const refundAmount = webhookData.transferAmount;
        if (payment.user) {
          await this.usersService.updateBalance(
            payment.user.userId,
            refundAmount,
            manager,
          );
        }
        responsePayload = {
          success: true,
          message: 'Payment was FAILED. New transfer refunded to Wallet.',
        };
        return;
      }
      const amountReceived = webhookData.transferAmount;
      const amountExpected = Number(payment.amount);

      this.applyWebhookAudit(payment, webhookData, amountReceived);

      // if (amountReceived < amountExpected) {
      //   this.logger.warn(
      //     `⚠️ Insufficient amount. Expected: ${amountExpected}, Received: ${amountReceived}`,
      //   );
      //   await paymentRepo.save(payment);
      //   responsePayload = {
      //     success: false,
      //     message: 'Insufficient amount',
      //     expected: amountExpected,
      //     received: amountReceived,
      //   };
      //   return;
      // }

      if (amountReceived < amountExpected) {
        this.logger.warn(
          `⚠️ Underpayment detected. Expected: ${amountExpected}, Received: ${amountReceived}. Triggering Wallet Refund.`,
        );

        // (WALLET FALLBACK)
        if (payment.user) {
          await this.usersService.updateBalance(
            payment.user.userId,
            amountReceived,
            manager,
          );
          this.logger.log(
            `💰 Refunded ${amountReceived} to User ${payment.user.userId} wallet due to underpayment.`,
          );
        } else {
          this.logger.error(
            `[CRITICAL] Cannot refund underpayment: User not found for Payment ${paymentCode}`,
          );
        }

        payment.status = PaymentStatus.FAILED;
        await paymentRepo.save(payment);

        // C. HỦY BOOKING NGAY LẬP TỨC (Để nhả Slot)
        if (
          payment.paymentType === PaymentType.BOOKING &&
          payment.appointment
        ) {
          await this.appointmentsService.cancelPendingAppointment(
            payment.appointment.appointmentId,
            manager,
            TerminationReason.PAYMENT_FAILED,
            `Underpayment: Received ${amountReceived}/${amountExpected}`,
          );
        }

        responsePayload = {
          success: true, // Webhook xử lý thành công (dù đơn hàng fail)
          message:
            'Underpayment handled: Refunded to Wallet & Booking Cancelled',
          expected: amountExpected,
          received: amountReceived,
        };
        return;
      }

      // 3.  LOGIC "HỒI SINH" (RẤT QUAN TRỌNG)
      // (Chỉ chạy nếu Cron Job đã chạy trước)
      if (payment.status === PaymentStatus.EXPIRED) {
        this.logger.warn(
          `⚠️ Payment ${paymentCode} was EXPIRED. Money received. Checking status...`,
        );

        // Nếu là BOOKING, kiểm tra Slot
        if (payment.paymentType === PaymentType.BOOKING) {
          // Nếu là BOOKING, ta phải kiểm tra xem slot đã bị người khác đặt chưa
          const slot = payment.appointment?.availabilitySlot;
          if (slot && slot.status !== SlotStatus.AVAILABLE) {
            // Kịch bản XẤU NHẤT: Cron Job đã chạy, nhả slot
            // VÀ một khách hàng B đã đặt mất slot đó.
            this.logger.error(
              `[CRITICAL] Payment ${paymentCode} received, but Slot ${slot.slotId} was already re-booked.`,
            );
            throw new ConflictException(
              `Payment received, but the slot was already re-booked by another user. MANUAL REFUND REQUIRED.`,
            );
          }
          // Nếu slot vẫn AVAILABLE (chưa ai đặt), ta "hồi sinh" nó
          this.logger.log(
            `Reviving expired BOOKING ${paymentCode}. Re-reserving slot...`,
          );
          // (Logic cập nhật slot sẽ ở Giai đoạn 2)
        }
        this.logger.log(
          `Reviving expired ${payment.paymentType} payment ${paymentCode}.`,
        );
      }
      // (Dù status là PENDING hay EXPIRED, giờ nó cũng sẽ là COMPLETED)
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
      await paymentRepo.save(payment);

      processedPaymentInfo = {
        paymentId: payment.paymentId,
        paymentCode: payment.paymentCode,
      };

      this.logger.log(
        `✅ Payment completed: ${paymentCode} - Type: ${payment.paymentType}`,
      );

      switch (payment.paymentType) {
        case PaymentType.ORDER:
          postProcess = async () => {
            responsePayload = await this.processOrderPaymentAfterCommit(
              payment.paymentId,
              amountReceived,
            );
          };
          break;
        case PaymentType.TOPUP:
          postProcess = async () => {
            responsePayload = await this.processTopupPaymentAfterCommit(
              payment.paymentId,
              amountReceived,
            );
          };
          break;
        case PaymentType.SUBSCRIPTION:
          postProcess = async () => {
            responsePayload = await this.processSubscriptionPaymentAfterCommit(
              payment.paymentId,
              amountReceived,
            );
          };
          break;
        case PaymentType.BOOKING:
          postProcess = async () => {
            responsePayload = await this.processBookingPaymentAfterCommit(
              payment.paymentId,
              amountReceived,
            );
          };
          break;
        default:
          responsePayload = {
            success: true,
            message: 'Payment processed successfully',
            paymentType: payment.paymentType,
            paymentCode,
            amount: amountReceived,
          };
      }
    });

    if (postProcess) {
      try {
        await postProcess();
      } catch (error) {
        //  LỖI NGHIỆP VỤ (CRITICAL)
        const err = error as Error;
        const paymentId = processedPaymentInfo?.paymentId ?? 'unknown';
        const paymentCode = processedPaymentInfo?.paymentCode ?? 'unknown';
        this.logger.error(
          `[CRITICAL] Payment (ID: ${paymentId}, Code: ${paymentCode}) completed but post-processing failed: ${err.message}`,
          err.stack,
        );
        //  TẠI ĐÂY PHẢI GỬI THÔNG BÁO CHO ADMIN
        throw error;
      }
    }

    return (
      responsePayload ?? {
        success: false,
        message: 'Unable to process payment',
      }
    );
  }

  private applyWebhookAudit(
    payment: Payment,
    webhookData: SepayWebhookDto,
    amountReceived: number,
  ): void {
    payment.paidAmount = amountReceived;
    payment.sepayTransactionId = webhookData.id;
    payment.gateway = webhookData.gateway;
    payment.accountNumber = webhookData.accountNumber;
    payment.referenceCode = webhookData.referenceCode;
    payment.transferContent = webhookData.content;
    payment.transactionDate = new Date(webhookData.transactionDate);
    payment.webhookData = JSON.stringify(webhookData);
  }

  private async processBookingPaymentAfterCommit(
    paymentId: number,
    amountReceived: number,
  ): Promise<PaymentProcessingResult> {
    // Bắt đầu một transaction MỚI, riêng biệt
    // để đảm bảo Cập nhật Hẹn và Cập nhật Slot xảy ra đồng bộ
    return this.entityManager.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);
      const appointmentRepo = manager.getRepository(Appointment);

      // 1. Find Payment
      const payment = await paymentRepo.findOne({
        where: { paymentId },
      });

      if (!payment) {
        this.logger.error(`❌ Payment ${paymentId} not found after commit`);
        throw new NotFoundException('Payment not found after commit');
      }

      // 2. Find Appointment related to this Payment

      const appointment = await appointmentRepo.findOne({
        where: { payment: { paymentId: paymentId } },
        relations: ['availabilitySlot', 'dermatologist', 'dermatologist.user'],
      });

      if (!appointment) {
        this.logger.error(
          `❌ Booking payment ${payment.paymentCode} missing appointment linkage`,
        );
        throw new NotFoundException('Appointment not found for this payment');
      }

      if (!appointment.dermatologist || !appointment.dermatologist.user) {
        this.logger.error(
          `❌ Payment ${payment.paymentCode} completed, but linked Appointment ${appointment.appointmentId} is missing Dermatologist User data. CANNOT credit wallet.`,
        );
        throw new InternalServerErrorException(
          'Dermatologist user data is missing for this appointment.',
        );
      }

      if (appointment.appointmentStatus !== AppointmentStatus.PENDING_PAYMENT) {
        this.logger.error(
          `[CRITICAL_BUSINESS_EXCEPTION] Payment ${paymentId} (Code: ${payment.paymentCode}) confirmed, 
         but Appointment ${appointment.appointmentId} was already in state: ${appointment.appointmentStatus}. 
         MANUAL INTERVENTION REQUIRED.`,
        );

        // Ném lỗi này sẽ kích hoạt 'catch' của postProcess trong hàm handleSepayWebhook
        throw new BadRequestException(
          `Payment was successful, but the appointment (ID: ${appointment.appointmentId}) was already ${appointment.appointmentStatus}. This requires manual intervention.`,
        );
      }

      this.logger.log(
        `✅ Booking confirmed for Appt ${appointment.appointmentId}`,
      );

      // 4. Update Appointment status to SCHEDULED
      appointment.appointmentStatus = AppointmentStatus.SCHEDULED;
      await appointmentRepo.save(appointment);

      this.logger.log(
        `✅ Booking confirmed for Appointment ${appointment.appointmentId}`,
      );

      return {
        success: true,
        message: 'Booking payment processed successfully',
        paymentType: 'booking',
        paymentCode: payment.paymentCode,
        amount: amountReceived,
        appointmentId: appointment.appointmentId,
        slotId: appointment.availabilitySlot?.slotId ?? null,
      };
    });
  }

  private async processSubscriptionPaymentAfterCommit(
    paymentId: number,
    amountReceived: number,
  ): Promise<PaymentProcessingResult> {
    return this.entityManager.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);

      const payment = await paymentRepo.findOne({ where: { paymentId } });

      if (!payment || !payment.planId || !payment.customerId) {
        throw new NotFoundException(
          'Payment data is missing for subscription activation',
        );
      }

      const planId = payment.planId;
      if (!planId) {
        throw new BadRequestException('PlanID is missing from payment planId');
      }

      const subscription =
        await this.customerSubscriptionService.activateSubscription(
          payment.customerId,
          planId,
          payment,
          payment.paidAt,
          manager,
        );

      const fullSubscription = await manager
        .getRepository(CustomerSubscription)
        .findOne({
          where: { id: subscription.id },
          relations: ['subscriptionPlan.dermatologist.user'],
        });

      if (!fullSubscription?.subscriptionPlan?.dermatologist?.user) {
        this.logger.error(
          `CRITICAL: Cannot credit earning for Subscription ${subscription.id}. Missing dermatologist user data.`,
        );
        throw new InternalServerErrorException(
          'Dermatologist user linkage missing.',
        );
      }

      const doctorShare = amountReceived * (1 - this.SUBSCRIPTION_FEE_RATE); // 80%
      const systemShare = amountReceived - doctorShare; // 20%
      const dermatologistUserId =
        fullSubscription.subscriptionPlan.dermatologist.user.userId;

      await this.usersService.updateBalance(
        dermatologistUserId,
        doctorShare,
        manager,
      );

      this.logger.log(
        `💰 Credited ${doctorShare} to User (Dermatologist) ${dermatologistUserId} for Subscription. System fee: ${systemShare}`,
      );

      return {
        success: true,
        message: 'Subscription payment processed successfully',
        paymentType: 'subscription',
        paymentCode: payment.paymentCode,
        customerSubscriptionId: subscription.id,
        amount: amountReceived,
      };
    });
  }

  private async processOrderPaymentAfterCommit(
    paymentId: number,
    amountReceived: number,
  ): Promise<PaymentProcessingResult> {
    const payment = await this.paymentRepository.findOne({
      where: { paymentId },
    });

    if (!payment) {
      this.logger.error(
        `❌ Payment ${paymentId} not found after transaction commit`,
      );
      return {
        success: false,
        message: 'Payment not found after commit',
        paymentId,
      };
    }

    let orderId = payment.orderId;

    if (!orderId && payment.cartData && payment.customerId) {
      try {
        let parsedCart: unknown;

        try {
          parsedCart = JSON.parse(payment.cartData);
        } catch (jsonErr) {
          this.logger.error(
            `❌ Invalid JSON in payment.cartData for Payment ${payment.paymentId} (code: ${payment.paymentCode}). Raw cartData: ${payment.cartData}`,
          );
          throw new BadRequestException('Invalid cart data on payment');
        }

        // 🔄 BACKWARD COMPATIBILITY: Handle both array and object formats
        let items: unknown;

        if (Array.isArray(parsedCart)) {
          // Legacy format: cartData is directly an array
          this.logger.warn(
            `⚠️ Payment ${payment.paymentId} uses legacy array format for cartData. Converting to object format.`,
          );
          items = parsedCart;
        } else if (parsedCart && typeof parsedCart === 'object') {
          // New format: cartData is {items: [...]}
          items = (parsedCart as { items?: unknown }).items;
        } else {
          this.logger.error(
            `❌ Unexpected cartData type for Payment ${payment.paymentId} (code: ${payment.paymentCode}). Type: ${typeof parsedCart}`,
          );
          throw new BadRequestException('Invalid cart data on payment');
        }

        if (!Array.isArray(items)) {
          this.logger.error(
            `❌ Unexpected cartData shape for Payment ${payment.paymentId} (code: ${payment.paymentCode}). Parsed cartData: ${JSON.stringify(
              parsedCart,
            )}`,
          );
          throw new BadRequestException('Invalid cart data on payment');
        }

        const newOrder = await this.ordersService.createOrderFromPayment({
          customerId: payment.customerId,
          cartItems: items as Record<string, unknown>[],
          shippingAddress: payment.shippingAddress,
          toWardCode: payment.toWardCode,
          toDistrictId: payment.toDistrictId,
          notes: payment.orderNotes,
          totalAmount: amountReceived,
          paymentId: payment.paymentId,
          shippingMethod: payment.shippingMethod,
        });

        payment.orderId = newOrder.orderId;
        await this.paymentRepository.save(payment);
        orderId = newOrder.orderId;

        this.logger.log(`✅ Order created from payment: #${orderId}`);

        if (payment.userId) {
          try {
            await this.cartService.clearCart(payment.userId);
            this.logger.log(`✅ Cart cleared for user: ${payment.userId}`);
          } catch (error) {
            const err = error as Error;
            this.logger.warn(
              `⚠️ Failed to clear cart for user ${payment.userId}: ${err.message}`,
            );
          }
        }
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `❌ Failed to create order from payment: ${err.message}`,
        );
        throw error;
      }
    } else if (orderId) {
      await this.ordersService.update(orderId, {
        status: OrderStatus.CONFIRMED,
      });
      this.logger.log(`✅ Order #${orderId} marked as CONFIRMED`);
    }

    return {
      success: true,
      message: 'Order payment processed successfully',
      paymentType: 'order',
      paymentCode: payment.paymentCode,
      amount: amountReceived,
      orderId,
    };
  }

  private async processTopupPaymentAfterCommit(
    paymentId: number,
    amountReceived: number,
  ): Promise<PaymentProcessingResult> {
    const payment = await this.paymentRepository.findOne({
      where: { paymentId },
    });

    if (!payment || !payment.userId) {
      this.logger.error(
        `❌ Payment ${paymentId} missing user information for topup`,
      );
      return {
        success: false,
        message: 'Invalid topup payment data',
        paymentId,
      };
    }

    const user = await this.usersService.findOne(payment.userId);
    const oldBalance = Number(user.balance);
    const newBalance = oldBalance + amountReceived;

    await this.usersService.update(payment.userId, {
      balance: newBalance,
    });

    this.logger.log(
      `✅ Balance updated for user ${payment.userId}: ${oldBalance} → ${newBalance}`,
    );

    return {
      success: true,
      message: 'Topup processed successfully',
      paymentType: 'topup',
      paymentCode: payment.paymentCode,
      amount: amountReceived,
      userId: payment.userId,
      oldBalance,
      newBalance,
    };
  }

  /**
   * Lấy payment theo code
   */
  async findByCode(paymentCode: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { paymentCode },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentCode} not found`);
    }

    return payment;
  }

  /**
   * Lấy payment theo orderId
   */
  async findByOrderId(orderId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Generate payment code duy nhất
   * Format:
   * - Order: SKO{orderId|customerId}{timestamp} (SKinalyze Order)
   * - Topup: SKT{userId_short}{timestamp} (SKinalyze Topup)
   */
  private generatePaymentCode(
    paymentType: PaymentType,
    orderId?: string,
    userId?: string,
    customerId?: string,
  ): string {
    const timestamp = Date.now().toString().slice(-6); // Lấy 6 số cuối

    if (paymentType === PaymentType.ORDER) {
      // Use orderId if exists, otherwise use customerId
      const idToUse = orderId || customerId;
      if (idToUse) {
        const idShort = idToUse.replace(/-/g, '').slice(-8).toUpperCase();
        return `SKO${idShort}${timestamp}`;
      }
    } else if (paymentType === PaymentType.TOPUP && userId) {
      // For topup, use last 8 chars of userId
      const userIdShort = userId.replace(/-/g, '').slice(-8).toUpperCase();
      return `SKT${userIdShort}${timestamp}`;
    } else if (paymentType === PaymentType.BOOKING && customerId) {
      const customerIdShort = customerId
        .replace(/-/g, '')
        .slice(-8)
        .toUpperCase();
      return `SKB${customerIdShort}${timestamp}`;
    } else if (paymentType === PaymentType.SUBSCRIPTION && customerId) {
      const customerIdShort = customerId
        .replace(/-/g, '')
        .slice(-8)
        .toUpperCase();
      return `SKS${customerIdShort}${timestamp}`;
    }

    // Fallback
    return `SK${timestamp}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  /**
   * Extract payment code từ nội dung chuyển khoản
   * Tìm pattern: SKO hoặc SKT + ký tự
   */
  private extractPaymentCode(content: string): string | null {
    // Match SKO hoặc SKT followed by alphanumeric
    const match = content.match(/SK[OTBS][A-Z0-9]+/i);
    return match ? match[0].toUpperCase() : null;
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentCode: string): Promise<any> {
    const payment = await this.findByCode(paymentCode);

    return {
      paymentCode: payment.paymentCode,
      status: payment.status,
      amount: payment.amount,
      paidAmount: payment.paidAmount,
      paymentMethod: payment.paymentMethod,
      createdAt: payment.createdAt,
      expiredAt: payment.expiredAt,
      paidAt: payment.paidAt,
      order: payment.order
        ? {
            orderId: payment.order.orderId,
            status: payment.order.status,
          }
        : null,
    };
  }

  /**
   * Get all payments with pagination and filters (Admin only)
   */
  async findAll(
    page: number = 1,
    limit: number = 50,
    status?: string,
    paymentType?: string,
  ): Promise<{
    data: Payment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (paymentType) {
      where.paymentType = paymentType;
    }

    const [payments, total] = await this.paymentRepository.findAndCount({
      where,
      relations: ['order', 'user', 'appointment', 'customerSubscription'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get wallet transactions (TOPUP and WITHDRAW only)
   */
  async findWalletTransactions(
    page: number = 1,
    limit: number = 50,
    status?: string,
    userId?: string,
  ): Promise<{
    data: Payment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const where: any = {
      paymentType: In([PaymentType.TOPUP, PaymentType.WITHDRAW]),
    };

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.user = { userId };
    }

    const [payments, total] = await this.paymentRepository.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Refund TOPUP payment
   */
  async refundTopupPayment(paymentCode: string): Promise<Payment> {
    return this.entityManager.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);

      const payment = await paymentRepo.findOne({
        where: { paymentCode },
        relations: ['user'],
      });

      if (!payment) {
        throw new NotFoundException(
          `Payment with code ${paymentCode} not found`,
        );
      }

      if (payment.paymentType !== PaymentType.TOPUP) {
        throw new BadRequestException(
          'Only TOPUP payments can be refunded through this endpoint',
        );
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException(
          `Cannot refund payment with status ${payment.status}. Only COMPLETED payments can be refunded.`,
        );
      }

      if (!payment.user) {
        throw new NotFoundException(
          `User not found for payment ${paymentCode}`,
        );
      }

      // Deduct from user wallet
      const refundAmount = Number(payment.paidAmount);
      await this.usersService.updateBalance(
        payment.user.userId,
        -refundAmount,
        manager,
      );

      // Update payment status
      payment.status = PaymentStatus.REFUNDED;
      await paymentRepo.save(payment);

      this.logger.log(
        `💸 Refunded ${refundAmount} from User ${payment.user.userId} wallet for Payment ${paymentCode}`,
      );

      return payment;
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelExpiredPayments(): Promise<number> {
    const expiredPayments = await this.paymentRepository.find({
      where: {
        status: PaymentStatus.PENDING,
        expiredAt: LessThan(new Date()),
      },
      relations: ['order', 'appointment', 'withdrawalRequest'],
    });

    if (expiredPayments.length === 0) {
      this.logger.log('No expired payments found.');
      return 0;
    }

    let processedCount = 0;

    for (const payment of expiredPayments) {
      try {
        // Transaction to handle each payment expiration
        await this.entityManager.transaction(async (manager) => {
          switch (payment.paymentType) {
            case PaymentType.BOOKING:
              if (payment.appointment) {
                await this.appointmentsService.cancelPendingAppointment(
                  payment.appointment.appointmentId,
                  manager,
                  TerminationReason.PAYMENT_TIMEOUT,
                  'System auto-cancelled due to payment expiration.',
                );
              }
              break;

            case PaymentType.ORDER:
              if (payment.order) {
                //  GIAO VIỆC CHO ORDERS SERVICE
                // await this.ordersService.cancelExpiredOrder(
                //   payment.order.orderId,
                //   manager,
                // );
              }
              break;

            case PaymentType.WITHDRAW:
              // 💰 Sync withdrawal status when payment expires
              if (payment.withdrawalRequest) {
                const withdrawalRepo = manager.getRepository(WithdrawalRequest);
                const withdrawal = await withdrawalRepo.findOne({
                  where: { requestId: payment.withdrawalRequest.requestId },
                });

                if (withdrawal && withdrawal.status === WithdrawalStatus.VERIFIED) {
                  withdrawal.status = WithdrawalStatus.REJECTED;
                  withdrawal.rejectionReason = 'Payment expired - no bank transfer received';
                  await withdrawalRepo.save(withdrawal);
                  this.logger.log(
                    `🔄 Withdrawal ${withdrawal.requestId} marked as REJECTED due to payment expiration`,
                  );
                }
              }
              break;

            case PaymentType.TOPUP:
              break;
          }

          // Always Update Payment -> EXPIRED
          payment.status = PaymentStatus.EXPIRED;
          await manager.save(payment);
        });
        processedCount++;
      } catch (error) {
        this.logger.error(
          `Error processing cron job expired payment ${payment.paymentId}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(`🕐 Processed ${processedCount} expired payments.`);
    return processedCount;
  }
}
