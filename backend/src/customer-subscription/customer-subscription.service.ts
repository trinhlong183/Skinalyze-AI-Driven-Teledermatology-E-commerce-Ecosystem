import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, LessThan, Repository } from 'typeorm';
import { CustomerSubscription } from './entities/customer-subscription.entity';
import { SubscriptionPlansService } from '../subscription-plans/subscription-plans.service';
import { PaymentsService } from '../payments/payments.service';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from '../payments/entities/payment.entity';
import { CreateCustomerSubscriptionDto } from './dto/create-customer-subscription.dto';
import { Customer } from 'src/customers/entities/customer.entity';
import { SubscriptionPlan } from 'src/subscription-plans/entities/subscription-plan.entity';
import { UsersService } from 'src/users/users.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CustomerSubscriptionService {
  readonly logger = new Logger(CustomerSubscriptionService.name);

  constructor(
    @InjectRepository(CustomerSubscription)
    private readonly customerSubscriptionRepository: Repository<CustomerSubscription>,
    private readonly subscriptionPlansService: SubscriptionPlansService,
    private readonly usersService: UsersService,
    private readonly entityManager: EntityManager,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  async createSubscriptionPayment(
    customerId: string,
    dto: CreateCustomerSubscriptionDto,
  ): Promise<Payment> {
    const plan = await this.subscriptionPlansService.findOne(dto.planId);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    if (!plan.isActive) {
      throw new BadRequestException('This plan is currently inactive.');
    }
    this.logger.log(
      `Creating payment for customer ${customerId} for plan ${plan.planId} with amount ${plan.basePrice}`,
    );
    const payment = await this.paymentsService.createPayment({
      paymentType: PaymentType.SUBSCRIPTION,
      amount: plan.basePrice,
      customerId: customerId,
      paymentMethod: dto.paymentMethod,
      planId: plan.planId,
    });

    return payment;
  }

  async createSubscriptionWithWallet(
    userId: string,
    customerId: string,
    dto: CreateCustomerSubscriptionDto,
  ): Promise<CustomerSubscription> {
    const plan = await this.subscriptionPlansService.findOne(dto.planId);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    if (!plan.isActive) {
      throw new BadRequestException('This plan is currently inactive.');
    }

    return this.entityManager.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);

      // A. deduct customer wallet
      await this.usersService.updateBalance(
        userId,
        -Number(plan.basePrice),
        manager,
      );

      const paidAt = new Date();
      const payment = paymentRepo.create({
        paymentType: PaymentType.SUBSCRIPTION,
        amount: plan.basePrice,
        customerId: customerId,
        userId: userId,
        planId: plan.planId,
        paymentMethod: PaymentMethod.WALLET,
        status: PaymentStatus.COMPLETED,
        paidAt: paidAt,
        paymentCode: `SKSW${customerId
          .replace(/-/g, '')
          .slice(-8)
          .toUpperCase()}${Date.now().toString().slice(-6)}`,
      });

      const savedPayment = await paymentRepo.save(payment);

      return await this.activateSubscription(
        customerId,
        plan.planId,
        savedPayment,
        paidAt,
        manager,
      );
    });
  }

  async activateSubscription(
    customerId: string,
    planId: string,
    payment: Payment,
    paidAt: Date,
    manager: EntityManager,
  ): Promise<CustomerSubscription> {
    const subRepo = manager.getRepository(CustomerSubscription);
    const planRepo = manager.getRepository(SubscriptionPlan);
    const customerRepo = manager.getRepository(Customer);

    // 1. Lấy thông tin
    const [plan, customer] = await Promise.all([
      planRepo.findOneBy({ planId }),
      customerRepo.findOneBy({ customerId }),
    ]);

    if (!plan || !customer) {
      throw new NotFoundException(
        'Plan or Customer not found during activation',
      );
    }

    // 2. TẠO MỚI GÓI ĐÃ KÍCH HOẠT
    const duration = plan.durationInDays;
    const endDate = new Date(paidAt);
    endDate.setDate(paidAt.getDate() + duration);

    // SỬA LẠI: Gán các đối tượng quan hệ trực tiếp
    const newSubscription = subRepo.create({
      customer: customer,
      subscriptionPlan: plan,
      payment: payment,
      sessionsRemaining: plan.totalSessions,
      isActive: true,
      startDate: paidAt,
      endDate: endDate,
    });

    await subRepo.save(newSubscription);
    this.logger.log(
      `✅ Subscription ${newSubscription.id} activated. Expires on: ${endDate.toISOString()}`,
    );

    return newSubscription;
  }

  async useSession(
    subscriptionId: string,
    customerId: string,
    manager: EntityManager,
  ): Promise<CustomerSubscription> {
    const subRepo = manager.getRepository(CustomerSubscription);
    const subscription = await subRepo.findOne({
      where: { id: subscriptionId, customer: { customerId: customerId } },
    });

    if (!subscription) {
      throw new NotFoundException(
        'Subscription not found or does not belong to user.',
      );
    }
    if (!subscription.isActive) {
      throw new BadRequestException('This subscription is not active.');
    }
    if (subscription.endDate && new Date() > subscription.endDate) {
      throw new BadRequestException('This subscription has expired.');
    }
    if (subscription.sessionsRemaining <= 0) {
      throw new BadRequestException(
        'This subscription has no sessions remaining.',
      );
    }

    subscription.sessionsRemaining -= 1;

    return subRepo.save(subscription);
  }

  async refundSession(
    subscriptionId: string,
    manager: EntityManager,
  ): Promise<CustomerSubscription> {
    const subRepo = manager.getRepository(CustomerSubscription);
    const subscription = await subRepo.findOne({
      where: { id: subscriptionId },
      relations: ['subscriptionPlan'],
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription ${subscriptionId} not found for refund.`,
      );
    }

    if (
      subscription.sessionsRemaining >=
      subscription.subscriptionPlan.totalSessions
    ) {
      this.logger.warn(
        `Subscription ${subscriptionId} is already full. Cannot refund session.`,
      );
      return subscription;
    }
    subscription.sessionsRemaining += 1;

    this.logger.log(
      `Session refunded for Subscription ${subscriptionId}. New count: ${subscription.sessionsRemaining}`,
    );
    return subRepo.save(subscription);
  }

  async findByCustomerId(
    customerId: string,
    dermatologistId?: string,
  ): Promise<CustomerSubscription[]> {
    const where: FindOptionsWhere<CustomerSubscription> = {
      customer: { customerId: customerId },
    };

    if (dermatologistId) {
      where.subscriptionPlan = {
        dermatologist: { dermatologistId: dermatologistId },
      };
    }

    return this.customerSubscriptionRepository.find({
      where,
      relations: [
        'subscriptionPlan',
        'payment',
        'subscriptionPlan.dermatologist',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneByIdAndCustomer(
    id: string,
    customerId: string,
  ): Promise<CustomerSubscription> {
    const subscription = await this.customerSubscriptionRepository.findOne({
      where: { id, customer: { customerId: customerId } },
      relations: ['subscriptionPlan', 'payment'],
    });

    if (!subscription) {
      throw new NotFoundException(
        'Subscription not found or you do not own it.',
      );
    }
    return subscription;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredSubscriptions() {
    this.logger.log('Running Cron Job: Deactivating expired subscriptions...');

    const now = new Date();

    const expiredSubscriptions = await this.customerSubscriptionRepository.find(
      {
        where: {
          isActive: true,
          endDate: LessThan(now),
        },
      },
    );

    if (expiredSubscriptions.length === 0) {
      return;
    }

    for (const sub of expiredSubscriptions) {
      sub.isActive = false;
      await this.customerSubscriptionRepository.save(sub);
      this.logger.log(`Deactivated expired subscription ${sub.id}`);
    }

    this.logger.log(
      `Deactivated ${expiredSubscriptions.length} subscriptions.`,
    );
  }
}
