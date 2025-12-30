import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import {
  AppointmentStatus,
  TerminationReason,
} from './types/appointment.types';
import { UsersService } from '../users/users.service';
import { CustomerSubscriptionService } from '../customer-subscription/customer-subscription.service';
import { DisputeDecision, ResolveDisputeDto } from './dto/resolve-dispute.dto';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from '../payments/entities/payment.entity';

@Injectable()
export class AdminAppointmentsService {
  private readonly logger = new Logger(AdminAppointmentsService.name);
  private readonly BOOKING_FEE_RATE = 0.25;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly usersService: UsersService,
    private readonly customerSubscriptionService: CustomerSubscriptionService,
    private readonly entityManager: EntityManager,
  ) {}

  async resolveDispute(
    adminUserId: string,
    appointmentId: string,
    dto: ResolveDisputeDto,
  ) {
    return this.entityManager.transaction(async (manager) => {
      const appRepo = manager.getRepository(Appointment);

      const appointment = await appRepo.findOne({
        where: { appointmentId },
        relations: [
          'payment',
          'customer',
          'customer.user',
          'dermatologist',
          'dermatologist.user',
          'customerSubscription',
        ],
        lock: { mode: 'pessimistic_write' }, // Lock row to prevent race conditions
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      // 1. Validate Status
      const validStatuses = [
        AppointmentStatus.DISPUTED,
        AppointmentStatus.INTERRUPTED,
        AppointmentStatus.COMPLETED,
      ];

      if (!validStatuses.includes(appointment.appointmentStatus)) {
        throw new BadRequestException(
          `Cannot resolve appointment with status ${appointment.appointmentStatus}. It must be DISPUTED, INTERRUPTED, or COMPLETED.`,
        );
      }

      this.logger.log(
        `Admin with userId ${adminUserId} resolving Appt ${appointmentId} with decision: ${dto.decision}`,
      );

      // 2. Setup: Validate input based on decision type
      switch (dto.decision) {
        case DisputeDecision.REFUND_CUSTOMER:
          // === CASE A: Refund Customer 100% ===
          await this.processFullRefund(manager, appointment);

          appointment.appointmentStatus = AppointmentStatus.CANCELLED;
          appointment.terminatedReason =
            dto.finalReason ?? TerminationReason.SYSTEM_CANCELLED;
          break;

        case DisputeDecision.PAYOUT_DOCTOR:
          // === CASE B: Payout Doctor(Customer loses) ===
          await this.processDoctorPayout(
            manager,
            appointment,
            this.BOOKING_FEE_RATE,
          );

          appointment.appointmentStatus = AppointmentStatus.SETTLED;
          // Do not change terminatedReason (to keep the original reason)
          if (dto.finalReason) {
            appointment.terminatedReason = dto.finalReason;
          }
          break;

        case DisputeDecision.PARTIAL_REFUND:
          // === CASE C: Partial Refund (Split between Customer and Doctor) ===
          await this.processPartialRefund(
            manager,
            appointment,
            dto.refundAmount,
          );

          appointment.appointmentStatus = AppointmentStatus.SETTLED;
          appointment.terminatedReason =
            dto.finalReason ?? TerminationReason.PLATFORM_ISSUE;
          break;

        default:
          throw new BadRequestException('Invalid decision type');
      }

      // 4. UPDATE ADMIN AUDIT INFORMATION
      appointment.adminNote = dto.adminNote;
      appointment.resolvedAt = new Date();
      appointment.resolvedBy = adminUserId;

      await appRepo.save(appointment);

      return {
        success: true,
        message: 'Dispute resolved successfully.',
        finalStatus: appointment.appointmentStatus,
        decision: dto.decision,
      };
    });
  }

  private async processFullRefund(
    manager: EntityManager,
    appointment: Appointment,
  ) {
    // Case 1: Booking paid with Wallet/Direct Payment -> Refund to wallet
    if (appointment.payment) {
      if (!appointment.customer?.user?.userId) {
        throw new BadRequestException('Customer user data missing for refund.');
      }
      const refundAmount = Number(appointment.payment.amount);

      await this.usersService.updateBalance(
        appointment.customer.user.userId,
        refundAmount,
        manager,
      );
      this.logger.log(`💰 Refunded Full ${refundAmount} to Customer Wallet.`);
    }
    // Case 2: Booking paid with Subscription -> Refund session
    else if (appointment.customerSubscription) {
      await this.customerSubscriptionService.refundSession(
        appointment.customerSubscription.id,
        manager,
      );
      this.logger.log(`🔄 Refunded 1 Session to Customer Subscription.`);
    }
  }

  /**
   * Helper: Payout Doctor (Doctor wins)
   */
  private async processDoctorPayout(
    manager: EntityManager,
    appointment: Appointment,
    feeRate: number,
  ) {
    // Only payout if booking was paid with money (Subscription does not pay cash per session)
    if (appointment.payment) {
      if (!appointment.dermatologist?.user?.userId) {
        throw new BadRequestException(
          'Dermatologist user data missing for payout.',
        );
      }

      const originalAmount = Number(appointment.payment.amount);
      const payoutAmount = originalAmount * (1 - feeRate);

      if (payoutAmount > 0) {
        await this.usersService.updateBalance(
          appointment.dermatologist.user.userId,
          payoutAmount,
          manager,
        );

        // Create Payment Record
        const paymentRepo = manager.getRepository(Payment);
        const payment = paymentRepo.create({
          paymentCode: `SKWSTAPP${Date.now()}${Math.floor(Math.random() * 1000)}`,
          paymentType: PaymentType.TOPUP,
          amount: payoutAmount,
          userId: appointment.dermatologist.user.userId,
          transferContent: appointment.appointmentId,
          status: PaymentStatus.COMPLETED,
          paymentMethod: PaymentMethod.WALLET,
          paidAt: new Date(),
        });
        await paymentRepo.save(payment);

        this.logger.log(
          `💰 Payout ${payoutAmount} (Rate ${((1 - feeRate) * 100).toFixed(2)}%) to Doctor Wallet.`,
        );
      }
    } else {
      this.logger.log(
        'ℹ️ Subscription booking resolved to Doctor (No cash payout needed).',
      );
    }
  }

  private async processPartialRefund(
    manager: EntityManager,
    appointment: Appointment,
    refundAmount?: number,
  ) {
    // 1. Validate Payment Method
    if (!appointment.payment) {
      throw new BadRequestException(
        'Partial refund is ONLY available for wallet/direct payments. Subscription sessions cannot be split.',
      );
    }

    // 2. Validate: refundAmount compare to original booking price
    const originalPrice = Number(appointment.payment.amount);

    if (!refundAmount || refundAmount <= 0 || refundAmount >= originalPrice) {
      throw new BadRequestException(
        `Invalid partial refund amount. Must be > 0 and < ${originalPrice}`,
      );
    }

    // 3. Perform the split refund
    // Step 1: Refund the customer
    await this.usersService.updateBalance(
      appointment.customer.user.userId,
      refundAmount,
      manager,
    );

    // Step 2: Payout the doctor with the remaining amount
    const remainingRevenue = originalPrice - refundAmount;
    const doctorIncome = remainingRevenue * (1 - this.BOOKING_FEE_RATE);

    if (doctorIncome > 0) {
      await this.usersService.updateBalance(
        appointment.dermatologist.user.userId,
        doctorIncome,
        manager,
      );

      // Create Payment Record
      const paymentRepo = manager.getRepository(Payment);
      const payment = paymentRepo.create({
        paymentCode: `SKWSTAPP${Date.now()}${Math.floor(Math.random() * 1000)}`,
        paymentType: PaymentType.TOPUP,
        amount: doctorIncome,
        userId: appointment.dermatologist.user.userId,
        transferContent: appointment.appointmentId,
        status: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.WALLET,
        paidAt: new Date(),
      });
      await paymentRepo.save(payment);
    }

    this.logger.log(
      `💸 Partial Resolve: Customer +${refundAmount}, Derma +${doctorIncome}, Platform +${remainingRevenue - doctorIncome}`,
    );
  }
}
