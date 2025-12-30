import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';
import { SubscriptionPlan } from '../subscription-plans/entities/subscription-plan.entity';
import { CustomerSubscription } from '../customer-subscription/entities/customer-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      SubscriptionPlan,
      CustomerSubscription,
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
