import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { Notification } from './entities/notification.entity';
import { UsersModule } from '../users/users.module';
import { Customer } from '../customers/entities/customer.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { RoutineRemindersService } from './routine-reminders.service';
import { RoutineDetail } from 'src/routine-details/entities/routine-detail.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, Customer, RoutineDetail]),
    UsersModule, // Import để có DeviceTokensService
    CloudinaryModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION') || '1d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    RoutineRemindersService,
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
