import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  FindOptionsWhere,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { DermatologistsService } from '../dermatologists/dermatologists.service';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import {
  FindSubscriptionPlansDto,
  SubscriptionPlanSortBy,
} from './dto/find-subscription-plan.dto';
import { CustomerSubscription } from 'src/customer-subscription/entities/customer-subscription.entity';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionRepository: Repository<SubscriptionPlan>,
    private readonly dermatologistsService: DermatologistsService,
    private readonly entityManager: EntityManager,
  ) {}
  private handleError(error: unknown, message: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(message);
  }

  private async getOwnedSubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<SubscriptionPlan> {
    try {
      const dermatologist =
        await this.dermatologistsService.findByUserId(userId);
      if (!dermatologist) {
        throw new NotFoundException('Dermatologist not found');
      }
      const subscription = await this.subscriptionRepository.findOne({
        where: {
          planId: subscriptionId,
          dermatologist: { dermatologistId: dermatologist.dermatologistId },
        },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      return subscription;
    } catch (error) {
      this.handleError(error, 'Failed to resolve subscription ownership');
    }
  }
  async createForUser(
    userId: string,
    body: CreateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    try {
      const dermatologist =
        await this.dermatologistsService.findByUserId(userId);
      if (!dermatologist) {
        throw new NotFoundException('Dermatologist not found');
      }
      const subscription = this.subscriptionRepository.create({
        ...body,
        dermatologist: { dermatologistId: dermatologist.dermatologistId },
        isActive: body.isActive ?? true,
      });

      return this.subscriptionRepository.save(subscription);
    } catch (error) {
      this.handleError(error, 'Failed to create subscription');
    }
  }

  async findAll(
    filters: FindSubscriptionPlansDto,
  ): Promise<SubscriptionPlan[]> {
    try {
      const where: FindOptionsWhere<SubscriptionPlan> = {};

      // (FILTERS)

      if (filters.dermatologistId) {
        where.dermatologist = { dermatologistId: filters.dermatologistId };
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive === 'true';
      }

      if (filters.search) {
        where.planName = Like(`%${filters.search}%`);
      }

      if (filters.minPrice && filters.maxPrice) {
        where.basePrice = Between(
          Number(filters.minPrice),
          Number(filters.maxPrice),
        );
      } else if (filters.minPrice) {
        where.basePrice = MoreThanOrEqual(Number(filters.minPrice));
      } else if (filters.maxPrice) {
        where.basePrice = LessThanOrEqual(Number(filters.maxPrice));
      }

      if (filters.minSessions && filters.maxSessions) {
        where.totalSessions = Between(
          Number(filters.minSessions),
          Number(filters.maxSessions),
        );
      } else if (filters.minSessions) {
        where.totalSessions = MoreThanOrEqual(Number(filters.minSessions));
      } else if (filters.maxSessions) {
        where.totalSessions = LessThanOrEqual(Number(filters.maxSessions));
      }

      if (filters.minDuration && filters.maxDuration) {
        where.durationInDays = Between(
          Number(filters.minDuration),
          Number(filters.maxDuration),
        );
      } else if (filters.minDuration) {
        where.durationInDays = MoreThanOrEqual(Number(filters.minDuration));
      } else if (filters.maxDuration) {
        where.durationInDays = LessThanOrEqual(Number(filters.maxDuration));
      }

      // (SORTING)
      const orderOptions: Record<string, 'ASC' | 'DESC'> = {};
      const sortBy = filters.sortBy || SubscriptionPlanSortBy.CREATED_AT;
      const sortOrder = filters.sortOrder || 'DESC';
      orderOptions[sortBy] = sortOrder;

      if (sortBy === SubscriptionPlanSortBy.PLAN_NAME) {
        orderOptions['planId'] = 'ASC';
      }

      return this.subscriptionRepository.find({
        where,
        relations: ['dermatologist', 'dermatologist.user'],
        order: orderOptions,
      });
    } catch (error) {
      this.handleError(error, 'Failed to list subscriptions');
    }
  }
  async findOne(planId: string): Promise<SubscriptionPlan> {
    try {
      const plan = await this.subscriptionRepository.findOne({
        where: { planId: planId },
      });
      if (!plan) {
        throw new NotFoundException(
          `Subscription plan with ID ${planId} not found`,
        );
      }
      return plan;
    } catch (error) {
      this.handleError(error, 'Failed to retrieve subscription plan');
    }
  }

  async updateForUser(
    userId: string,
    subscriptionId: string,
    body: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    try {
      const subscription = await this.getOwnedSubscription(
        userId,
        subscriptionId,
      );

      Object.assign(subscription, body);

      return this.subscriptionRepository.save(subscription);
    } catch (error) {
      this.handleError(error, 'Failed to update subscription');
    }
  }

  async removeForUser(userId: string, subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.getOwnedSubscription(
        userId,
        subscriptionId,
      );

      // Check if any customers have purchased this plan
      const subscriberCount = await this.entityManager
        .getRepository(CustomerSubscription)
        .count({
          where: { subscriptionPlan: { planId: subscriptionId } },
        });

      // CASE A: No customers have purchased this plan -> Hard delete (Clean DB)
      if (subscriberCount === 0) {
        await this.subscriptionRepository.remove(subscription);
        return;
      }

      // CASE B: Customers have purchased this plan -> Soft delete (Active = false)
      if (subscription.isActive === false) {
        throw new BadRequestException('Plan is already inactive/deleted.');
      }

      subscription.isActive = false;
      await this.subscriptionRepository.save(subscription);
    } catch (error) {
      this.handleError(error, 'Failed to delete subscription');
    }
  }
}
