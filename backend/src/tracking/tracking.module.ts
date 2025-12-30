import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { Order } from '../orders/entities/order.entity';
import { ShippingLog } from '../shipping-logs/entities/shipping-log.entity';
import { TrackingController } from './tracking.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, ShippingLog]),
  ],
  controllers: [TrackingController],
  providers: [
    TrackingGateway, 
    TrackingService,
    // Provide TrackingGateway với custom token để resolve circular dependency
    {
      provide: 'TrackingGateway',
      useExisting: forwardRef(() => TrackingGateway),
    },
  ],
  exports: [TrackingGateway, TrackingService],
})
export class TrackingModule {}
