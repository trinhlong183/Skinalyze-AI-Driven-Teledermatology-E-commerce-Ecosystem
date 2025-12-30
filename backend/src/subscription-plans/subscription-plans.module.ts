import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { DermatologistsModule } from '../dermatologists/dermatologists.module';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan]), DermatologistsModule],
  controllers: [SubscriptionPlansController],
  providers: [SubscriptionPlansService],
  exports: [SubscriptionPlansService],
})
export class SubscriptionPlansModule {}
