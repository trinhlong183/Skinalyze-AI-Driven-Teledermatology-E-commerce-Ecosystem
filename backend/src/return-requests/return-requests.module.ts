import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnRequestsService } from './return-requests.service';
import { ReturnRequestsController } from './return-requests.controller';
import { ReturnRequest } from './entities/return-request.entity';
import { Order } from '../orders/entities/order.entity';
import { ShippingLog } from '../shipping-logs/entities/shipping-log.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Payment } from '../payments/entities/payment.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReturnRequest, Order, ShippingLog, Customer, Payment, User]),
    CloudinaryModule,
  ],
  controllers: [ReturnRequestsController],
  providers: [ReturnRequestsService],
  exports: [ReturnRequestsService],
})
export class ReturnRequestsModule {}
