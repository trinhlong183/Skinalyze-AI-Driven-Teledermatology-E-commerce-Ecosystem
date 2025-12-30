import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './entities/appointment.entity';
import { CustomersModule } from '../customers/customers.module';
import { DermatologistsModule } from '../dermatologists/dermatologists.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AvailabilitySlotsModule } from '../availability-slots/availability-slots.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { GoogleMeetModule } from 'src/google-meet/google-meet.module';
import { CustomerSubscriptionModule } from 'src/customer-subscription/customer-subscription.module';
import { UsersModule } from 'src/users/users.module';
import { AppointmentsScheduler } from './appointments.schedule';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminAppointmentsService } from './admin-appointment.service';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    CustomersModule,
    DermatologistsModule,
    TransactionsModule,
    AvailabilitySlotsModule,
    CustomerSubscriptionModule,
    GoogleMeetModule,
    UsersModule,
    NotificationsModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [AppointmentsController, AdminAppointmentsController],
  providers: [
    AppointmentsService,
    AppointmentsScheduler,
    AdminAppointmentsService,
  ],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
