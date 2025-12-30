import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreatmentRoutinesService } from './treatment-routines.service';
import { TreatmentRoutinesController } from './treatment-routines.controller';
import { TreatmentRoutine } from './entities/treatment-routine.entity';
import { Dermatologist } from '../dermatologists/entities/dermatologist.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { SkinAnalysis } from '../skin-analysis/entities/skin-analysis.entity';
import { RoutineDetail } from 'src/routine-details/entities/routine-detail.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TreatmentRoutine,
      Dermatologist,
      Customer,
      Appointment,
      SkinAnalysis,
      RoutineDetail,
    ]),
  ],
  controllers: [TreatmentRoutinesController],
  providers: [TreatmentRoutinesService],
  exports: [TreatmentRoutinesService],
})
export class TreatmentRoutinesModule {}
