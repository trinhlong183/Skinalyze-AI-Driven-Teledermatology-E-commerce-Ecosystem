import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilitySlotsController } from './availability-slots.controller';
import { AvailabilitySlotsService } from './availability-slots.service';
import { AvailabilitySlot } from './entities/availability-slot.entity';
import { DermatologistsModule } from '../dermatologists/dermatologists.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AvailabilitySlot]),
    forwardRef(() => DermatologistsModule),
  ],
  controllers: [AvailabilitySlotsController],
  providers: [AvailabilitySlotsService],
  exports: [AvailabilitySlotsService],
})
export class AvailabilitySlotsModule {}
