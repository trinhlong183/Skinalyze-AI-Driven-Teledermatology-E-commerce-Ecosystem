import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { DeviceTokensService } from './device-tokens.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { DeviceToken } from './entities/device-token.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailModule } from '../email/email.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { DermatologistsModule } from '../dermatologists/dermatologists.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DeviceToken]),
    EmailModule,
    CloudinaryModule,
    forwardRef(() => DermatologistsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, DeviceTokensService, JwtAuthGuard, RolesGuard],
  exports: [UsersService, DeviceTokensService],
})
export class UsersModule {}
