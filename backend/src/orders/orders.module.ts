import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { GhnWebhookController } from './webhooks/ghn-webhook.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomersModule } from '../customers/customers.module';
import { UsersModule } from '../users/users.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShippingLogsModule } from '../shipping-logs/shipping-logs.module';
import { GhnModule } from '../ghn/ghn.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Payment]),
    CartModule,
    InventoryModule,
    CustomersModule,
    UsersModule,
    forwardRef(() => PaymentsModule),
    NotificationsModule,
    ShippingLogsModule,
    GhnModule,
  ],
  controllers: [OrdersController, GhnWebhookController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
