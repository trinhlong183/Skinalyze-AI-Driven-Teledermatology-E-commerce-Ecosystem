import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingLogsService } from './shipping-logs.service';
import { ShippingLogsController } from './shipping-logs.controller';
import { ShippingLog } from './entities/shipping-log.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { GhnModule } from '../ghn/ghn.module';
import { ShippingLogsScheduler } from './shipping-logs.schedule';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShippingLog, Order, User]),
    CloudinaryModule,
    GhnModule,
  ],
  controllers: [ShippingLogsController],
  providers: [ShippingLogsService, ShippingLogsScheduler],
  exports: [ShippingLogsService],
})
export class ShippingLogsModule {}
