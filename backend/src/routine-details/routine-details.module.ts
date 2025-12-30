import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutineDetailsService } from './routine-details.service';
import { RoutineDetailsController } from './routine-details.controller';
import { TreatmentRoutine } from '../treatment-routines/entities/treatment-routine.entity';
import { RoutineDetail } from './entities/routine-detail.entity';
import { DermatologistsModule } from 'src/dermatologists/dermatologists.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoutineDetail, TreatmentRoutine]),
    DermatologistsModule,
  ],
  controllers: [RoutineDetailsController],
  providers: [RoutineDetailsService],
  exports: [RoutineDetailsService],
})
export class RoutineDetailsModule {}
