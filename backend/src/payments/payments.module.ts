import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { OrdersModule } from '../orders/orders.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { CartModule } from '../cart/cart.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AppointmentsModule } from 'src/appointments/appointments.module';
import { CustomerSubscriptionModule } from 'src/customer-subscription/customer-subscription.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    forwardRef(() => OrdersModule),
    TransactionsModule,
    UsersModule,
    forwardRef(() => CartModule), // For clearing cart after payment
    forwardRef(() => AppointmentsModule),
    forwardRef(() => CustomerSubscriptionModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
