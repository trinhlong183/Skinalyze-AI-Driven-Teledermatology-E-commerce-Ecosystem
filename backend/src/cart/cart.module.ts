import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AddressModule } from '../address/address.module';

@Module({
  imports: [
    ConfigModule, // Required for ConfigService in CartService
    ScheduleModule.forRoot(), // Required for @Cron decorator
    ProductsModule,
    InventoryModule,
    AddressModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
