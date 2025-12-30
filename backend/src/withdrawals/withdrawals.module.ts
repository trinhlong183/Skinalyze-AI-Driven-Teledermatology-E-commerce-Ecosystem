import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { WithdrawalOtpSession } from './entities/withdrawal-otp-session.entity';
import { User } from '../users/entities/user.entity';
import { Payment } from '../payments/entities/payment.entity';
import { EmailModule } from '../email/email.module';
import { WithdrawalsController } from './withdrawals.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WithdrawalRequest, WithdrawalOtpSession, User, Payment]),
    EmailModule,
  ],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}
