import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity';
import { Dermatologist } from './dermatologists/entities/dermatologist.entity';
import { Customer } from './customers/entities/customer.entity';
import { SkinAnalysis } from './skin-analysis/entities/skin-analysis.entity';
import { Product } from './products/entities/product.entity';
import { Address } from './address/entities/address.entity';
import { ProductsModule } from './products/products.module';
import { AddressModule } from './address/address.module';
import { CategoriesModule } from './categories/categories.module';
import { Category } from './categories/entities/category.entity';
import { InventoryModule } from './inventory/inventory.module';
import { Inventory } from './inventory/entities/inventory.entity';
import { InventoryAdjustment } from './inventory/entities/inventory-adjustment.entity';
import { CustomersModule } from './customers/customers.module';
import { SkinAnalysisModule } from './skin-analysis/skin-analysis.module';
import { OrdersModule } from './orders/orders.module';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { TransactionsModule } from './transactions/transactions.module';
import { Transaction } from './transactions/entities/transaction.entity';
import { ShippingLogsModule } from './shipping-logs/shipping-logs.module';
import { ShippingLog } from './shipping-logs/entities/shipping-log.entity';
import { DermatologistsController } from './dermatologists/dermatologists.controller';
import { DermatologistsModule } from './dermatologists/dermatologists.module';
import { EmailModule } from './email/email.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { TreatmentRoutinesModule } from './treatment-routines/treatment-routines.module';
import { RoutineDetailsModule } from './routine-details/routine-details.module';
import { TreatmentRoutine } from './treatment-routines/entities/treatment-routine.entity';
import { RoutineDetail } from './routine-details/entities/routine-detail.entity';
import { Appointment } from './appointments/entities/appointment.entity';
import { NotificationsModule } from './notifications/notifications.module';
import { Notification } from './notifications/entities/notification.entity';
import { FirebaseModule } from './firebase/firebase.module';
import { DeviceToken } from './users/entities/device-token.entity';
import { CustomerSubscriptionModule } from './customer-subscription/customer-subscription.module';
import { CustomerSubscription } from './customer-subscription/entities/customer-subscription.entity';
import { SubscriptionPlan } from './subscription-plans/entities/subscription-plan.entity';
import { SubscriptionPlansModule } from './subscription-plans/subscription-plans.module';
import { Payment } from './payments/entities/payment.entity';
import { PaymentsModule } from './payments/payments.module';
import { GoogleMeetModule } from './google-meet/google-meet.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AvailabilitySlotsModule } from './availability-slots/availability-slots.module';
import { AvailabilitySlot } from './availability-slots/entities/availability-slot.entity';
import { ChatSessionsModule } from './chat-sessions/chat-sessions.module';
import { ChatMessagesModule } from './chat-messages/chat-messages.module';
import { ChatMessage } from './chat-messages/entities/chat-message.entity';
import { ChatSession } from './chat-sessions/entities/chat-session.entity';
import { TrackingModule } from './tracking/tracking.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ReviewsModule } from './reviews/reviews.module';
import { Review } from './reviews/entities/review.entity';
import { CartModule } from './cart/cart.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { WithdrawalRequest } from './withdrawals/entities/withdrawal-request.entity';
import { WithdrawalOtpSession } from './withdrawals/entities/withdrawal-otp-session.entity';
import { GhnModule } from './ghn/ghn.module';
import { SpecializationsModule } from './specializations/specializations.module';
import { Specialization } from './specializations/entities/specialization.entity';
import { ReturnRequestsModule } from './return-requests/return-requests.module';
import { ReturnRequest } from './return-requests/entities/return-request.entity';
import { RatingsModule } from './ratings/ratings.module';
import { Rating } from './ratings/entities/rating.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(), //  Activate CRON JOB

    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'Naruto1234@',
      database: process.env.DB_DATABASE || 'skinalyze',
      entities: [
        User,
        Product,
        Address,
        Category,
        Customer,
        Dermatologist,
        SkinAnalysis,
        Inventory,
        InventoryAdjustment,
        Order,
        OrderItem,
        Transaction,
        ShippingLog,
        Appointment,
        TreatmentRoutine,
        RoutineDetail,
        Notification,
        DeviceToken,
        SubscriptionPlan,
        CustomerSubscription,
        Payment,
        AvailabilitySlot,
        ChatMessage,
        ChatSession,
        Review,
        Rating,
        WithdrawalRequest,
        WithdrawalOtpSession,
        Specialization,
        ReturnRequest,
      ],
      synchronize: false, // Auto-create tables (use migrations for production later)
      logging: process.env.NODE_ENV === 'development',
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
    AddressModule,
    CategoriesModule,
    InventoryModule,
    CartModule,
    CustomersModule,
    SkinAnalysisModule,
    OrdersModule,
    TransactionsModule,
    ShippingLogsModule,
    DermatologistsModule,
    EmailModule,
    AppointmentsModule,
    TreatmentRoutinesModule,
    RoutineDetailsModule,
    NotificationsModule,
    FirebaseModule,
    SubscriptionPlansModule,
    CustomerSubscriptionModule,
    PaymentsModule,
    GoogleMeetModule,
    CloudinaryModule,
    AvailabilitySlotsModule,
    ChatSessionsModule,
    ChatMessagesModule,
    TrackingModule,
    ReviewsModule,
    WithdrawalsModule,
    GhnModule,
    SpecializationsModule,
    ReturnRequestsModule,
    RatingsModule,
  ],
  controllers: [AppController, DermatologistsController],
  providers: [AppService],
})
export class AppModule {}
