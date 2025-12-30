import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  WithdrawalRequest,
  WithdrawalStatus,
} from './entities/withdrawal-request.entity';
import { WithdrawalOtpSession } from './entities/withdrawal-otp-session.entity';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { UpdateWithdrawalStatusDto } from './dto/update-withdrawal-status.dto';
import { User } from '../users/entities/user.entity';
import {
  Payment,
  PaymentStatus,
  PaymentType,
  PaymentMethod,
} from '../payments/entities/payment.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class WithdrawalsService {
  constructor(
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawalRepository: Repository<WithdrawalRequest>,
    @InjectRepository(WithdrawalOtpSession)
    private readonly otpSessionRepository: Repository<WithdrawalOtpSession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly emailService: EmailService,
  ) {}

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private censorAccountNumber(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 4) {
      return '****';
    }
    const visibleStart = accountNumber.substring(0, 2);
    const visibleEnd = accountNumber.substring(accountNumber.length - 2);
    const maskedLength = accountNumber.length - 4;
    const masked = '*'.repeat(maskedLength);
    return `${visibleStart}${masked}${visibleEnd}`;
  }

  private sanitizeRequest(
    request: WithdrawalRequest,
    skipCensoring = false,
  ): WithdrawalRequest {
    if (request.accountNumber && !skipCensoring) {
      request.accountNumber = this.censorAccountNumber(request.accountNumber);
    }
    return request;
  }

  /**
   * 🔐 Bước 1: Request OTP
   */
  async requestOTP(
    userId: string,
    requestOtpDto: RequestOtpDto,
  ): Promise<{ sessionId: string; otpCode?: string; message?: string }> {
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.balance < requestOtpDto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Current balance: ${user.balance} VND`,
      );
    }

    // Xóa các OTP sessions cũ đã hết hạn của user này
    await this.otpSessionRepository.delete({
      userId,
      otpExpiry: LessThan(new Date()),
    });

    const otpCode = this.generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

    const session = this.otpSessionRepository.create({
      userId,
      otpCode,
      otpExpiry,
      amount: requestOtpDto.amount,
      isVerified: false,
    });

    const savedSession = await this.otpSessionRepository.save(session);

    // Try to send email, but don't fail if email service is down
    try {
      await this.emailService.sendWithdrawalOTP(
        user.email,
        otpCode,
        requestOtpDto.amount,
      );
      return { sessionId: savedSession.sessionId };
    } catch (error) {
      console.error('Failed to send OTP email:', error.message);
      // Return OTP in response if email fails (for development/testing)
      return {
        sessionId: savedSession.sessionId,
        otpCode: otpCode, // Only in case email fails
        message:
          'Email service temporarily unavailable. Use the OTP code provided.',
      };
    }
  }

  /**
   * ✅ Bước 2: Tạo withdrawal request với OTP đã verify
   */
  async createRequest(
    userId: string,
    createDto: CreateWithdrawalRequestDto,
  ): Promise<WithdrawalRequest> {
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 🔐 Tìm OTP session và verify
    const otpSession = await this.otpSessionRepository.findOne({
      where: {
        userId,
        otpCode: createDto.otpCode,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpSession) {
      throw new BadRequestException('Invalid OTP code');
    }

    if (otpSession.otpExpiry < new Date()) {
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    if (otpSession.isVerified) {
      throw new BadRequestException('OTP has already been used');
    }

    // Verify số tiền phải khớp với OTP session
    // Convert both to numbers for comparison (in case one is stored as string/decimal)
    if (Number(otpSession.amount) !== Number(createDto.amount)) {
      throw new BadRequestException(
        `Amount does not match OTP request. Expected: ${otpSession.amount}, Got: ${createDto.amount}`,
      );
    }

    if (user.balance < createDto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Current balance: ${user.balance} VND`,
      );
    }

    // Đánh dấu OTP session đã sử dụng
    otpSession.isVerified = true;
    await this.otpSessionRepository.save(otpSession);

    // Tạo withdrawal request
    const request = this.withdrawalRepository.create({
      userId,
      fullName: createDto.fullName,
      amount: createDto.amount,
      type: createDto.type,
      bankName: createDto.bankName,
      accountNumber: createDto.accountNumber,
      notes: createDto.notes,
      status: WithdrawalStatus.VERIFIED,
    });

    const saved = await this.withdrawalRepository.save(request);

    // 💰 Create payment record for withdrawal with PENDING status
    const paymentCode = this.generateWithdrawalPaymentCode(saved.requestId);
    const payment = this.paymentRepository.create({
      paymentCode,
      paymentType: PaymentType.WITHDRAW,
      userId: user.userId,
      withdrawalRequestId: saved.requestId, // Link to withdrawal request
      amount: saved.amount,
      paidAmount: 0, // Will be set when approved
      paymentMethod: PaymentMethod.BANKING,
      status: PaymentStatus.PENDING,
      transferContent: `Withdrawal Request #${saved.requestId}`,
    });
    await this.paymentRepository.save(payment);

    return this.sanitizeRequest(saved);
  }

  async getMyRequests(userId: string): Promise<WithdrawalRequest[]> {
    const requests = await this.withdrawalRepository.find({
      where: { userId },
      relations: ['payment'],
      order: { createdAt: 'DESC' },
    });
    return requests.map((req) => this.sanitizeRequest(req));
  }

  async getAllRequests(
    status?: WithdrawalStatus,
  ): Promise<WithdrawalRequest[]> {
    const where = status ? { status } : {};
    const requests = await this.withdrawalRepository.find({
      where,
      relations: ['user', 'payment'],
      order: { createdAt: 'DESC' },
    });
    // Admins need to see full account numbers to process withdrawals
    return requests;
  }

  async updateStatus(
    requestId: string,
    adminUserId: string,
    updateDto: UpdateWithdrawalStatusDto,
  ): Promise<WithdrawalRequest> {
    const request = await this.withdrawalRepository.findOne({
      where: { requestId },
      relations: ['user'],
    });

    if (!request) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (
      updateDto.status === WithdrawalStatus.APPROVED &&
      request.status !== WithdrawalStatus.VERIFIED
    ) {
      throw new BadRequestException('Request must be verified before approval');
    }

    if (updateDto.status === WithdrawalStatus.APPROVED) {
      const user = request.user;

      if (Number(user.balance) < Number(request.amount)) {
        throw new BadRequestException(
          `User has insufficient balance. Current: ${user.balance} VND, Required: ${request.amount} VND`,
        );
      }

      user.balance = Number(user.balance) - Number(request.amount);
      await this.userRepository.save(user);

      request.approvedAt = new Date();
      request.approvedBy = adminUserId;

      // 💰 Update payment record to COMPLETED
      const payment = await this.paymentRepository.findOne({
        where: { withdrawalRequestId: request.requestId },
      });

      if (payment) {
        payment.status = PaymentStatus.COMPLETED;
        payment.paidAmount = request.amount;
        payment.paidAt = new Date();
        await this.paymentRepository.save(payment);
      }
    }

    if (updateDto.status === WithdrawalStatus.REJECTED) {
      request.rejectionReason = updateDto.rejectionReason || null;

      // 💰 Update payment record to FAILED when withdrawal is rejected
      const payment = await this.paymentRepository.findOne({
        where: { withdrawalRequestId: request.requestId },
      });

      if (payment) {
        payment.status = PaymentStatus.FAILED;
        await this.paymentRepository.save(payment);
      }
    }

    if (updateDto.status === WithdrawalStatus.COMPLETED) {
      request.completedAt = new Date();
    }

    request.status = updateDto.status;
    const updated = await this.withdrawalRepository.save(request);

    // Try to send email notification, but don't fail if email service is down
    try {
      await this.emailService.sendWithdrawalStatusUpdate(
        request.user.email,
        updateDto.status,
        request.amount,
        request.bankName,
        updateDto.rejectionReason,
      );
    } catch (error) {
      console.error('Failed to send withdrawal status email:', error.message);
      // Continue without failing - email is not critical
    }

    return this.sanitizeRequest(updated);
  }

  async cancelRequest(userId: string, requestId: string): Promise<void> {
    const request = await this.withdrawalRepository.findOne({
      where: { requestId, userId },
    });

    if (!request) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (
      request.status !== WithdrawalStatus.PENDING &&
      request.status !== WithdrawalStatus.VERIFIED
    ) {
      throw new BadRequestException('Cannot cancel this request');
    }

    request.status = WithdrawalStatus.CANCELLED;
    await this.withdrawalRepository.save(request);

    // 💰 Update payment record to FAILED when withdrawal is cancelled
    const payment = await this.paymentRepository.findOne({
      where: { withdrawalRequestId: request.requestId },
    });

    if (payment && payment.status === PaymentStatus.PENDING) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);
    }
  }

  private generateWithdrawalPaymentCode(requestId: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const idShort = requestId.replace(/-/g, '').slice(-8).toUpperCase();
    return `SKW${idShort}${timestamp}`; // SKW = SKinalyze Withdrawal
  }
}
