import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { SubscriptionPlan } from '../subscription-plans/entities/subscription-plan.entity';
import { CustomerSubscription } from '../customer-subscription/entities/customer-subscription.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionRepository: Repository<SubscriptionPlan>,
    @InjectRepository(CustomerSubscription)
    private readonly customerSubscriptionRepository: Repository<CustomerSubscription>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const { userId, pastDermatologicalHistory, ...rest } = createCustomerDto;

    const customer = this.customerRepository.create({
      ...rest,
      pastDermatologicalHistory: pastDermatologicalHistory ?? [],
      user: { userId } as User,
    });

    (customer as any).userId = userId;

    return await this.customerRepository.save(customer);
  }

  async findAll(): Promise<Customer[]> {
    return await this.customerRepository.find({
      relations: ['user'],
    });
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { customerId: id },
      relations: ['user'],
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async findByUserId(userId: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { user: { userId } },
      relations: ['user'],
    });
    if (!customer) {
      throw new NotFoundException(`Customer with userId ${userId} not found`);
    }
    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    const customer = await this.findOne(id);
    Object.assign(customer, updateCustomerDto);
    return await this.customerRepository.save(customer);
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    await this.customerRepository.remove(customer);
  }

  async incrementAiUsage(userId: string): Promise<Customer> {
    const customer = await this.findByUserId(userId);
    if (!customer) {
      throw new NotFoundException(`Customer with userId ${userId} not found`);
    }
    customer.aiUsageAmount += 1;
    return await this.customerRepository.save(customer);
  }

  async addAnalysis(userId: string, _analysisId: string): Promise<Customer> {
    const customer = await this.findByUserId(userId);
    if (!customer) {
      throw new NotFoundException(`Customer with userId ${userId} not found`);
    }
    void _analysisId;
    // Skin analyses are now tracked through the SkinAnalysis entity relation.
    return customer;
  }

  async subscribeToPlan(
    userId: string,
    subscriptionId: string,
  ): Promise<Customer> {
    const customer = await this.findByUserId(userId);
    if (!customer) {
      throw new NotFoundException(`Customer with userId ${userId} not found`);
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { planId: subscriptionId, isActive: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found or inactive');
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + subscription.durationInDays);

    const activeSubscriptions = await this.customerSubscriptionRepository.find({
      where: {
        customer: { customerId: customer.customerId },
        isActive: true,
      },
      relations: ['customer'],
    });

    if (activeSubscriptions.length) {
      activeSubscriptions.forEach((record) => {
        record.isActive = false;
      });
      await this.customerSubscriptionRepository.save(activeSubscriptions);
    }

    const newSubscription = this.customerSubscriptionRepository.create({
      customer,
      subscriptionPlan: subscription,
      sessionsRemaining: subscription.totalSessions,
      startDate,
      endDate,
      isActive: true,
    });

    await this.customerSubscriptionRepository.save(newSubscription);

    return await this.findOne(customer.customerId);
  }
}
