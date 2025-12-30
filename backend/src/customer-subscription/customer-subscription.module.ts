import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerSubscription } from './entities/customer-subscription.entity';
import { CustomerSubscriptionService } from './customer-subscription.service';
import { CustomerSubscriptionController } from './customer-subscription.controller';
import { PaymentsModule } from '../payments/payments.module';
import { CustomersModule } from '../customers/customers.module';
import { SubscriptionPlansModule } from '../subscription-plans/subscription-plans.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerSubscription]),
    forwardRef(() => PaymentsModule),
    CustomersModule,
    SubscriptionPlansModule,
    UsersModule,
  ],
  controllers: [CustomerSubscriptionController],
  providers: [CustomerSubscriptionService],
  exports: [CustomerSubscriptionService],
})
export class CustomerSubscriptionModule {}
