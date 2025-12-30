import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  EntityManager,
  FindOneOptions,
  FindOptionsWhere,
  In,
} from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { CustomersService } from '../customers/customers.service';
import { DermatologistsService } from '../dermatologists/dermatologists.service';
import { Customer } from '../customers/entities/customer.entity';
import { Dermatologist } from '../dermatologists/entities/dermatologist.entity';
import { SkinAnalysis } from '../skin-analysis/entities/skin-analysis.entity';
import { TreatmentRoutine } from '../treatment-routines/entities/treatment-routine.entity';

import { AvailabilitySlotsService } from '../availability-slots/availability-slots.service';
import { PaymentsService } from '../payments/payments.service';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from '../payments/entities/payment.entity';
import { GoogleMeetService } from '../google-meet/google-meet.service';

import {
  AppointmentStatus,
  AppointmentType,
  TerminationReason,
} from './types/appointment.types';
import { CreateSubscriptionAppointmentDto } from './dto/create-subscription-appointment.dto';
import { CustomerSubscriptionService } from '../customer-subscription/customer-subscription.service';
import { UserRole } from '../users/entities/user.entity';
import { CompleteAppointmentDto } from './dto/complete-appointment.dto';
import {
  AppointmentDetailDto,
  FindAppointmentsDto,
} from './dto/find-appointment.dto';
import { UsersService } from '../users/users.service';
import { AvailabilitySlot } from '../availability-slots/entities/availability-slot.entity';
import { ReportNoShowDto } from './dto/report-no-show-dto';
import { InterruptAppointmentDto } from './dto/report-interrupt-appointment';

export interface AppointmentReservationResult {
  appointmentId: string;
  paymentCode: string;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  expiredAt: Date;
  bankingInfo: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    qrCodeUrl: string;
  };
}

export interface AppointmentActionResult {
  message: string;
  [key: string]: any;
}
@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);
  private readonly GRACE_PERIOD_MS = 15 * 60 * 1000; // Waiting time for report NO_SHOW: 15 minutes
  private readonly BOOKING_FEE_RATE = 0.25; // 25% fee for booking
  private readonly CANCELLATION_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds for cancellation refund policy
  readonly VALID_REPORT_HOURS = 24; // Hours allowed to report after completion
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly customersService: CustomersService,
    private readonly dermatologistsService: DermatologistsService,
    private readonly availabilitySlotsService: AvailabilitySlotsService,
    private readonly googleMeetService: GoogleMeetService,
    private readonly entityManager: EntityManager,
    private readonly customerSubscriptionService: CustomerSubscriptionService,
    private readonly usersService: UsersService,

    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  private async validateBookingPrerequisites(
    manager: EntityManager,
    customerId: string,
    dto: CreateAppointmentDto | CreateSubscriptionAppointmentDto,
  ) {
    const skinAnalysisRepo = manager.getRepository(SkinAnalysis);
    const routineRepo = manager.getRepository(TreatmentRoutine);

    // 1. Validate Skin Analysis
    const skinAnalysis = await skinAnalysisRepo.findOne({
      where: {
        analysisId: dto.analysisId,
        customer: { customerId: customerId },
      },
    });

    if (!skinAnalysis) {
      throw new BadRequestException(
        'Invalid or non-existent SkinAnalysis ID for this customer.',
      );
    }

    // 2. Validate Routine (Nếu là Follow-up)
    if (dto.appointmentType === AppointmentType.FOLLOW_UP) {
      if (!dto.trackingRoutineId) {
        throw new BadRequestException(
          'trackingRoutineId is required for FOLLOW_UP appointments.',
        );
      }
      const routine = await routineRepo.findOne({
        where: {
          routineId: dto.trackingRoutineId,
          customer: { customerId: customerId },
        },
      });
      if (!routine) {
        throw new BadRequestException(
          'Invalid or non-existent TreatmentRoutine ID for this customer.',
        );
      }
    }
  }

  private buildBaseAppointment(
    dto: CreateAppointmentDto | CreateSubscriptionAppointmentDto,
    slot: AvailabilitySlot,
    customer: Customer,
  ) {
    return {
      note: dto.note,
      appointmentType: dto.appointmentType,
      startTime: slot.startTime,
      endTime: slot.endTime,
      availabilitySlot: slot,
      customer: { customerId: customer.customerId } as Customer,
      dermatologist: {
        dermatologistId: dto.dermatologistId,
      } as Dermatologist,
      skinAnalysis: { analysisId: dto.analysisId } as SkinAnalysis,
      trackingRoutine: dto.trackingRoutineId
        ? ({ routineId: dto.trackingRoutineId } as TreatmentRoutine)
        : undefined,
    };
  }
  async createReservation(
    userId: string,
    createDto: CreateAppointmentDto,
  ): Promise<AppointmentReservationResult> {
    const customer = await this.customersService.findByUserId(userId);

    return this.entityManager.transaction(async (manager) => {
      const appointmentRepo = manager.getRepository(Appointment);
      await this.validateBookingPrerequisites(
        manager,
        customer.customerId,
        createDto,
      );
      const reservedSlot = await this.availabilitySlotsService.reserveSlot(
        createDto.dermatologistId,
        createDto.startTime,
        createDto.endTime,
        manager,
      );

      // Create Pending Payment
      const payment = await this.paymentsService.createPayment(
        {
          paymentType: PaymentType.BOOKING,
          amount: reservedSlot.price,
          customerId: customer.customerId,
          userId: userId,
        },
        manager,
      );
      // 3. Create Pending Appointment
      const appointment = appointmentRepo.create({
        ...this.buildBaseAppointment(createDto, reservedSlot, customer),
        price: reservedSlot.price,
        appointmentStatus: AppointmentStatus.PENDING_PAYMENT,
        payment,
      });

      const savedAppointment = await appointmentRepo.save(appointment);

      //  Update the reverse relationships (complete 1:1)
      await this.availabilitySlotsService.linkSlotToAppointment(
        reservedSlot.slotId,
        savedAppointment.appointmentId,
        manager,
      );

      return {
        appointmentId: savedAppointment.appointmentId,
        paymentType: payment.paymentType,
        paymentCode: payment.paymentCode, // Must pay using this code
        paymentMethod: payment.paymentMethod,
        expiredAt: payment.expiredAt,
        bankingInfo: {
          bankName: 'MBBank',
          accountNumber: '0347178790',
          accountName: 'CHU PHAN NHAT LONG',
          amount: payment.amount,
          qrCodeUrl: `https://img.vietqr.io/image/MB-0347178790-compact2.png?amount=${payment.amount}&addInfo=${payment.paymentCode}`,
        },
      };
    });
  }
  async createWalletAppointment(
    userId: string,
    createDto: CreateAppointmentDto,
  ): Promise<Appointment> {
    const customer = await this.customersService.findByUserId(userId);
    return this.entityManager.transaction(async (manager) => {
      const appointmentRepo = manager.getRepository(Appointment);
      const paymentRepo = manager.getRepository(Payment);

      await this.validateBookingPrerequisites(
        manager,
        customer.customerId,
        createDto,
      );

      // 1. Reserve Slot
      const reservedSlot = await this.availabilitySlotsService.reserveSlot(
        createDto.dermatologistId,
        createDto.startTime,
        createDto.endTime,
        manager,
      );

      const amountToPay = Number(reservedSlot.price);

      // 2. Deduct Wallet Balance (throw error if insufficient)
      await this.usersService.updateBalance(userId, -amountToPay, manager);

      // 3. Create Payment COMPLETED (Manually set status)
      const payment = paymentRepo.create({
        paymentType: PaymentType.BOOKING,
        amount: amountToPay,
        customerId: customer.customerId,
        userId: userId,
        paymentMethod: PaymentMethod.WALLET,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        paymentCode: `SKBW${customer.customerId
          .replace(/-/g, '')
          .slice(-8)
          .toUpperCase()}${Date.now().toString().slice(-6)}`,
      });
      const savedPayment = await paymentRepo.save(payment);

      // 4. Create Confirmed Appointment
      const appointment = appointmentRepo.create({
        ...this.buildBaseAppointment(createDto, reservedSlot, customer),
        price: amountToPay,
        appointmentStatus: AppointmentStatus.SCHEDULED,
        payment: savedPayment,
      });

      const savedAppointment = await appointmentRepo.save(appointment);

      await this.availabilitySlotsService.linkSlotToAppointment(
        reservedSlot.slotId,
        savedAppointment.appointmentId,
        manager,
      );

      return savedAppointment;
    });
  }
  async createSubscriptionAppointment(
    userId: string,
    createDto: CreateSubscriptionAppointmentDto,
  ): Promise<Appointment> {
    const customer = await this.customersService.findByUserId(userId);

    return this.entityManager.transaction(async (manager) => {
      const appointmentRepo = manager.getRepository(Appointment);

      await this.validateBookingPrerequisites(
        manager,
        customer.customerId,
        createDto,
      );
      //  Reserve Slot
      const reservedSlot = await this.availabilitySlotsService.reserveSlot(
        createDto.dermatologistId,
        createDto.startTime,
        createDto.endTime,
        manager,
      );

      //  -1 SESSION
      const usedSubscription =
        await this.customerSubscriptionService.useSession(
          createDto.customerSubscriptionId,
          customer.customerId,
          manager,
        );

      // Create Appointment (Scheduled)
      const appointment = appointmentRepo.create({
        ...this.buildBaseAppointment(createDto, reservedSlot, customer),
        price: 0,
        appointmentStatus: AppointmentStatus.SCHEDULED,
        customerSubscription: usedSubscription,
      });

      const savedAppointment = await appointmentRepo.save(appointment);

      await this.availabilitySlotsService.linkSlotToAppointment(
        reservedSlot.slotId,
        savedAppointment.appointmentId,
        manager,
      );

      return savedAppointment;
    });
  }

  async completeAppointment(
    userId: string,
    appointmentId: string,
    dto: CompleteAppointmentDto,
  ): Promise<Appointment> {
    const dermatologist = await this.dermatologistsService.findByUserId(userId);

    const appointment = await this.appointmentRepository.findOne({
      where: {
        appointmentId,
        dermatologist: { dermatologistId: dermatologist.dermatologistId },
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        'Appointment not found or you do not own it.',
      );
    }

    if (appointment.appointmentStatus !== AppointmentStatus.IN_PROGRESS) {
      this.logger.warn(
        `Attempted to complete an appointment not IN_PROGRESS (Status: ${appointment.appointmentStatus})`,
      );
      throw new BadRequestException(
        'Appointment is not in a state to be completed (must be IN_PROGRESS).',
      );
    }

    if (!appointment.customerJoinedAt) {
      this.logger.warn(
        `Attempted to complete appointment ${appointmentId} but customer has not joined.`,
      );
      throw new BadRequestException(
        'Cannot complete: Customer has not joined the appointment. Mark as NO_SHOW instead.',
      );
    }

    appointment.appointmentStatus = AppointmentStatus.COMPLETED;
    appointment.actualEndTime = new Date();
    if (dto.medicalNote) {
      appointment.medicalNote = dto.medicalNote;
    }

    const updatedAppointment =
      await this.appointmentRepository.save(appointment);

    this.logger.log(
      `Appt ${appointmentId} marked COMPLETED. Waiting for settlement window.`,
    );

    // 5.
    // (Notification do appointment review to customer)
    // await this.notificationService.sendReviewRequest(appointment.customer.userId, appointmentId);

    return updatedAppointment;
  }

  async updateMedicalNote(
    userId: string,
    appointmentId: string,
    medicalNote: string,
  ): Promise<Appointment> {
    const dermatologist = await this.dermatologistsService.findByUserId(userId);

    const appointment = await this.appointmentRepository.findOne({
      where: { appointmentId },
      relations: ['dermatologist'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found.');
    }

    if (
      appointment.dermatologist.dermatologistId !==
      dermatologist.dermatologistId
    ) {
      throw new ForbiddenException('You are not assigned to this appointment.');
    }

    if (
      appointment.appointmentStatus === AppointmentStatus.COMPLETED ||
      appointment.appointmentStatus === AppointmentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot update note for completed or cancelled appointments.',
      );
    }

    appointment.medicalNote = medicalNote;
    return this.appointmentRepository.save(appointment);
  }

  async recordCheckIn(appointmentId: string, userId: string, role: UserRole) {
    const appointment = await this.appointmentRepository.findOne({
      where: { appointmentId },
      relations: [
        'customer',
        'customer.user',
        'dermatologist',
        'dermatologist.user',
      ],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (
      appointment.appointmentStatus !== AppointmentStatus.SCHEDULED &&
      appointment.appointmentStatus !== AppointmentStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        `Cannot check-in to an appointment with status ${appointment.appointmentStatus}`,
      );
    }

    // 3. Validate Thời gian (MỚI)
    // Chỉ cho phép check-in nếu thời gian hiện tại >= (StartTime - 10 phút)
    const now = new Date();
    const tenMinutesInMs = 10 * 60 * 1000;
    const checkInAllowedTime = new Date(
      appointment.startTime.getTime() - tenMinutesInMs,
    );

    if (now < checkInAllowedTime) {
      // Nếu chưa tới giờ check-in
      const minutesToWait = Math.ceil(
        (checkInAllowedTime.getTime() - now.getTime()) / 60000,
      );
      throw new BadRequestException(
        `Too early to check-in. Please wait ${minutesToWait} more minutes (Check-in opens 10 mins before start).`,
      );
    }

    if (role === UserRole.CUSTOMER) {
      if (appointment.customer.user.userId !== userId) {
        throw new ForbiddenException(
          'Cannot check-in: You do not own this appointment',
        );
      }
      if (!appointment.customerJoinedAt) {
        appointment.customerJoinedAt = new Date();
      }
    } else if (role === UserRole.DERMATOLOGIST) {
      if (appointment.dermatologist.user.userId !== userId) {
        throw new ForbiddenException(
          'Cannot check-in: You are not assigned to this appointment',
        );
      }
      if (!appointment.dermatologistJoinedAt) {
        appointment.dermatologistJoinedAt = new Date();
      }
    }

    if (appointment.appointmentStatus === AppointmentStatus.SCHEDULED) {
      appointment.appointmentStatus = AppointmentStatus.IN_PROGRESS;
    }

    await this.appointmentRepository.save(appointment);

    this.logger.log(
      `User ${userId} (${role}) checked in for Appt ${appointmentId}`,
    );
  }

  async interruptAppointment(
    userId: string,
    role: UserRole,
    appointmentId: string,
    dto: InterruptAppointmentDto,
  ): Promise<AppointmentActionResult> {
    return this.entityManager.transaction(async (manager) => {
      const appointmentRepo = manager.getRepository(Appointment);

      const appointment = await appointmentRepo.findOne({
        where: { appointmentId },
        relations: [
          'dermatologist.user',
          'payment',
          'customerSubscription',
          'customer.user',
        ],
      });

      if (!appointment) throw new NotFoundException('Appointment not found');

      //  Validate Owner
      if (role === UserRole.CUSTOMER) {
        if (appointment.customer.user.userId !== userId)
          throw new ForbiddenException('Not your appointment');
      } else {
        if (appointment.dermatologist.user.userId !== userId)
          throw new ForbiddenException('Not your appointment');
      }

      // 1. CHECK: Đã báo cáo chưa? (Tránh spam report 2 lần)
      if (role === UserRole.CUSTOMER && appointment.customerReportReason) {
        throw new BadRequestException('You have already submitted a report.');
      }
      if (
        role === UserRole.DERMATOLOGIST &&
        appointment.dermatologistReportReason
      ) {
        throw new BadRequestException('You have already submitted a report.');
      }
      // 2. VALIDATE STATUS: Cho phép thêm INTERRUPTED và DISPUTED
      const allowedStatuses = [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.INTERRUPTED,
        AppointmentStatus.DISPUTED,
      ];

      if (!allowedStatuses.includes(appointment.appointmentStatus)) {
        throw new BadRequestException(
          `Cannot report interrupt for ${appointment.appointmentStatus}.`,
        );
      }
      const isInProgress =
        appointment.appointmentStatus === AppointmentStatus.IN_PROGRESS;
      const isCompleted =
        appointment.appointmentStatus === AppointmentStatus.COMPLETED;
      const isDoubleReport = [
        AppointmentStatus.INTERRUPTED,
        AppointmentStatus.DISPUTED,
      ].includes(appointment.appointmentStatus);

      // If completed or double reported, check valid report time window
      if (isCompleted || isDoubleReport) {
        const hoursSinceEnd =
          (Date.now() - appointment.endTime.getTime()) / 36e5;
        if (hoursSinceEnd > this.VALID_REPORT_HOURS) {
          throw new BadRequestException(
            `Report window (${this.VALID_REPORT_HOURS}h) expired.`,
          );
        }
      }

      // Set report reason & note
      const noteContent = dto.terminationNote || 'Reported interrupt via App';

      if (role === UserRole.CUSTOMER) {
        appointment.customerReportReason = dto.reason;
        appointment.customerReportNote = noteContent;
      } else {
        appointment.dermatologistReportReason = dto.reason;
        appointment.dermatologistReportNote = noteContent;
      }

      let message = 'Report recorded.';
      let refundTriggered = false;

      // Dermatologist admits fault
      if (
        role === UserRole.DERMATOLOGIST &&
        dto.reason === TerminationReason.DOCTOR_ISSUE
      ) {
        await this.processRefundForCustomer(appointment, manager);

        appointment.appointmentStatus = AppointmentStatus.CANCELLED;
        appointment.terminatedReason = TerminationReason.DOCTOR_CANCELLED;
        appointment.terminationNote = `Auto-resolved: Doctor admitted fault. Note: ${noteContent}`;

        // If InProgress -> add actualEndTime
        // If Interrupt/Completed -> Keep the old time
        if (isInProgress) {
          appointment.actualEndTime = new Date();
        }

        message = 'Refunded to customer successfully (Doctor admitted fault).';
        refundTriggered = true;

        await appointmentRepo.save(appointment);
        return { message, refundTriggered };
      }

      // CASE A: In Progress
      if (isInProgress) {
        appointment.actualEndTime = new Date();
        appointment.appointmentStatus = AppointmentStatus.INTERRUPTED;
        // Để terminatedReason trống hoặc null, chờ Admin set sau
        message =
          'Interruption recorded. Payment is frozen pending Admin review.';
      }

      // CASE B: Completed
      else if (isCompleted) {
        appointment.appointmentStatus = AppointmentStatus.DISPUTED;
        // do not update actualEndTime
        message = 'Dispute raised. Admin will review the session logs.';
      }

      // CASE C: Double Reporting (Additional report on Interrupted/Disputed)
      else {
        appointment.appointmentStatus = AppointmentStatus.DISPUTED;
        // do not update actualEndTime
        message = 'Additional report recorded. Admin will review both sides.';
      }

      await appointmentRepo.save(appointment);

      this.logger.warn(
        `Appt ${appointmentId} reported as ${dto.reason} by ${role}. Status: ${appointment.appointmentStatus}`,
      );

      return { message, refundTriggered };
    });
  }

  async findAll(filters: FindAppointmentsDto): Promise<Appointment[]> {
    const where: FindOptionsWhere<Appointment> = {};

    if (filters.customerId) {
      // TypeORM requires nested object for relations in where clause
      where.customer = { customerId: filters.customerId };
    }
    if (filters.dermatologistId) {
      where.dermatologist = { dermatologistId: filters.dermatologistId };
    }

    if (filters.status) {
      // where.appointmentStatus = filters.status;
      where.appointmentStatus = In(filters.status);
    }
    return this.appointmentRepository.find({
      where: where,
      relations: ['customer.user', 'dermatologist.user', 'payment'],
      order: { startTime: 'ASC' },
    });
  }

  async findOne(id: string): Promise<AppointmentDetailDto> {
    const appointment = await this.appointmentRepository.findOne({
      where: { appointmentId: id },
      relations: [
        'customer.user',
        'dermatologist.user',
        'payment',
        'trackingRoutine',
        'createdRoutine',
        'skinAnalysis',
      ],
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return {
      ...appointment,
      statusMessage: this.getDisplayStatusMessage(appointment),
    } as AppointmentDetailDto;
  }

  private getDisplayStatusMessage(appt: Appointment): string | null {
    // Case 1: (DISPUTED)
    if (appt.appointmentStatus === AppointmentStatus.DISPUTED) {
      // Doctor reports customer no-show, but customer has check-in
      if (
        appt.dermatologistReportReason === TerminationReason.CUSTOMER_NO_SHOW &&
        appt.customerJoinedAt
      ) {
        return 'System recorded No-Show report but Customer has Check-in history. Awaiting Admin review.';
      }

      // Customer reports doctor no-show, but doctor has check-in
      if (
        appt.customerReportReason === TerminationReason.DOCTOR_NO_SHOW &&
        appt.dermatologistJoinedAt
      ) {
        return 'System recorded No-Show report but Doctor has Check-in history. Awaiting Admin review.';
      }

      return 'Appointment is under dispute resolution.';
    }

    // Case 2: (CANCELLED )
    if (
      appt.appointmentStatus === AppointmentStatus.CANCELLED &&
      appt.terminatedReason === TerminationReason.PAYMENT_FAILED
    ) {
      return 'Cancelled due to payment failure/insufficient funds. Amount has been refunded to wallet.';
    }
    if (
      appt.appointmentStatus === AppointmentStatus.CANCELLED &&
      appt.terminatedReason === TerminationReason.CUSTOMER_CANCELLED_EARLY
    ) {
      return 'Cancelled by Customer (in 24 hours advance). A 100% refund has been issued to the customer.';
    }
    if (
      appt.appointmentStatus === AppointmentStatus.CANCELLED &&
      appt.terminatedReason === TerminationReason.CUSTOMER_CANCELLED_LATE
    ) {
      return 'Cancelled by Customer (in less than 24 hours). No refund has been issued.';
    }
    if (
      appt.appointmentStatus === AppointmentStatus.CANCELLED &&
      appt.terminatedReason === TerminationReason.DOCTOR_CANCELLED
    ) {
      return 'Cancelled due to Dermatologist Cancellation. A 100% refund has been issued to the customer.';
    }
    // Case 3: (NO_SHOW)
    if (
      appt.appointmentStatus === AppointmentStatus.NO_SHOW &&
      appt.terminatedReason === TerminationReason.DOCTOR_NO_SHOW
    ) {
      return 'Cancelled due to Dermatologist No-Show. A 100% refund has been issued to the customer.';
    }
    // Case 4: (INTERRUPTED)
    if (appt.appointmentStatus === AppointmentStatus.INTERRUPTED) {
      return 'Interruption reported. Payment is temporarily frozen pending Admin review.';
    }

    // Default
    return null;
  }
  async updateStatus(
    id: string,
    { status }: UpdateAppointmentStatusDto,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id);
    appointment.appointmentStatus = status;
    await this.appointmentRepository.save(appointment);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const appointment = await this.findOne(id);
    await this.appointmentRepository.remove(appointment);
  }

  async generateManualMeetLink(
    userId: string,
    appointmentId: string,
  ): Promise<string> {
    const appointment = await this.appointmentRepository.findOne({
      where: { appointmentId },
      relations: [
        'dermatologist',
        'dermatologist.user',
        'customer',
        'customer.user',
      ],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found.');
    }

    const isDermatologist = appointment.dermatologist?.user?.userId === userId;
    const isCustomer = appointment.customer?.user?.userId === userId;

    if (!isDermatologist && !isCustomer) {
      throw new ForbiddenException(
        'You are not authorized to generate a meeting link for this appointment.',
      );
    }

    // Check if link already exists
    if (appointment.meetingUrl) {
      return appointment.meetingUrl;
    }

    // Check appointment status (only create link for 'SCHEDULED' appointments)
    if (appointment.appointmentStatus !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'Cannot create link for a non-scheduled appointment.',
      );
    }

    const meetLink = await this.generateMeetLinkForAppointment(appointment);

    await this.appointmentRepository.update(appointmentId, {
      meetingUrl: meetLink,
    });

    return meetLink;
  }

  private async executeCancellation(
    manager: EntityManager,
    appointment: Appointment,
    reason: TerminationReason,
    shouldRefund: boolean,
  ) {
    const appointmentRepo = manager.getRepository(Appointment);

    appointment.appointmentStatus = AppointmentStatus.CANCELLED;
    appointment.terminatedReason = reason;
    await appointmentRepo.save(appointment);

    let notificationMessage = '';

    if (shouldRefund) {
      if (appointment.payment) {
        let customerUserId = appointment.customer?.user?.userId || undefined;
        if (!customerUserId) {
          const appWithCustomer = await manager.findOne(Appointment, {
            where: { appointmentId: appointment.appointmentId },
            relations: ['customer', 'customer.user'],
          });
          customerUserId = appWithCustomer?.customer?.user?.userId;
        }

        if (customerUserId) {
          const refundAmount = Number(appointment.payment.amount);

          await this.usersService.updateBalance(
            customerUserId,
            refundAmount,
            manager,
          );

          notificationMessage = 'Already refunded 100% via wallet.';
        } else {
          this.logger.error(
            `Cannot refund Appt ${appointment.appointmentId}: Customer User ID missing.`,
          );
          notificationMessage =
            'Error processing refund: Customer wallet information not found.';
        }
      } else if (appointment.customerSubscription) {
        await this.customerSubscriptionService.refundSession(
          appointment.customerSubscription.id,
          manager,
        );
        notificationMessage =
          '1 session has been refunded to your subscription package.';
      }
    } else {
      notificationMessage =
        'Appointment cancelled. No refund/session return applied (due to late cancellation).';
      // Credit dermatologist wallet (for late cancellation & payment made)
      if (appointment.payment) {
        const appWithDermatologist = await manager.findOne(Appointment, {
          where: { appointmentId: appointment.appointmentId },
          relations: ['dermatologist', 'dermatologist.user'],
        });

        if (appWithDermatologist?.dermatologist?.user) {
          const dermatologistUserId =
            appWithDermatologist.dermatologist.user.userId;
          const originalAmount = Number(appointment.payment.amount);

          const rate = 1 - this.BOOKING_FEE_RATE;
          const amountToCredit = originalAmount * rate;

          if (amountToCredit > 0) {
            await this.usersService.updateBalance(
              dermatologistUserId,
              amountToCredit,
              manager,
            );

            this.logger.log(
              `💰 Late Cancel Compensation: Credited ${amountToCredit} to Doctor ${dermatologistUserId} for Appt ${appointment.appointmentId}`,
            );
          }
        } else {
          this.logger.error(
            `Cannot credit doctor for Appt ${appointment.appointmentId}: Dermatologist User not found.`,
          );
        }
      }

      if (appointment.availabilitySlot) {
        this.logger.log(
          `Releasing slot ${appointment.availabilitySlot.slotId} for Appt ${appointment.appointmentId}`,
        );
        await this.availabilitySlotsService.releaseSlot(
          appointment.availabilitySlot.slotId,
          manager,
        );
      }

      this.logger.log(
        `Appointment ${appointment.appointmentId} cancelled. Reason: ${reason}`,
      );

      return {
        message: notificationMessage,
        terminatedReason: reason,
      };
    }
  }

  private async processNoShowReport(
    appointmentId: string,
    entityId: string,
    reportingRole: UserRole,
    note?: string,
  ): Promise<AppointmentActionResult> {
    return this.entityManager.transaction(async (manager) => {
      const appRepo = manager.getRepository(Appointment);

      const findOptions: FindOneOptions<Appointment> = {
        where: {
          appointmentId: appointmentId,
          ...(reportingRole === UserRole.CUSTOMER
            ? { customer: { customerId: entityId } }
            : { dermatologist: { dermatologistId: entityId } }),
        },
        relations: ['payment', 'customerSubscription'],
      };

      const appointment = await appRepo.findOne(findOptions);

      if (!appointment) {
        throw new NotFoundException(
          'Appointment not found or you do not own it.',
        );
      }

      // 2. CHECK waiting time GRACE PERIOD
      const now = new Date().getTime();
      const graceTime = appointment.startTime.getTime() + this.GRACE_PERIOD_MS;

      if (
        appointment.appointmentStatus === AppointmentStatus.IN_PROGRESS &&
        now < graceTime
      ) {
        throw new BadRequestException(
          `Please wait until Grace Period (${this.GRACE_PERIOD_MS / 1000 / 60} minutes) ends.`,
        );
      }

      const isInProgress =
        appointment.appointmentStatus === AppointmentStatus.IN_PROGRESS;
      const isCompleted =
        appointment.appointmentStatus === AppointmentStatus.COMPLETED;

      if (!isInProgress && !isCompleted) {
        throw new BadRequestException(
          `Cannot report NO-SHOW for ${appointment.appointmentStatus} status.`,
        );
      }
      if (isCompleted) {
        const completionTime =
          appointment.actualEndTime || appointment.updatedAt;
        const hoursSinceUpdate = (now - completionTime.getTime()) / 36e5;
        if (hoursSinceUpdate > this.VALID_REPORT_HOURS)
          throw new BadRequestException(
            `Report window (${this.VALID_REPORT_HOURS}h) expired. Please report within ${this.VALID_REPORT_HOURS} hours.`,
          );
      }
      const finalNote =
        note && note.trim().length > 0
          ? note
          : 'Reported No-Show via Quick Action';
      if (reportingRole === UserRole.CUSTOMER) {
        if (!appointment.customerJoinedAt)
          throw new BadRequestException('You must check-in first.');

        appointment.customerReportReason = TerminationReason.DOCTOR_NO_SHOW;
        appointment.customerReportNote = finalNote;
      } else {
        if (!appointment.dermatologistJoinedAt)
          throw new BadRequestException('You must check-in first.');

        appointment.dermatologistReportReason =
          TerminationReason.CUSTOMER_NO_SHOW;
        appointment.dermatologistReportNote = finalNote;
      }

      let message = 'Report recorded.';

      // CASE A: IN_PROGRESS
      if (isInProgress) {
        // Customer reports Doctor No-Show
        if (reportingRole === UserRole.CUSTOMER) {
          // If dermatologist has NOT joined -> NO_SHOW + Refund
          if (!appointment.dermatologistJoinedAt) {
            await this.processRefundForCustomer(appointment, manager);

            appointment.appointmentStatus = AppointmentStatus.NO_SHOW;
            appointment.terminatedReason = TerminationReason.DOCTOR_NO_SHOW;
            appointment.actualEndTime = new Date();
            message =
              'Refund processed successfully after check of doctor no-show.';
          }
          // If dermatologist HAS joined -> DISPUTED
          else {
            appointment.appointmentStatus = AppointmentStatus.DISPUTED;
            appointment.terminationNote = ' ';
            message =
              'Reported. Admin will review (Doctor has check-in record).';
          }
        }

        // Doctor reports Customer No-Show
        else {
          if (!appointment.customerJoinedAt) {
            appointment.appointmentStatus = AppointmentStatus.NO_SHOW;
            appointment.terminatedReason = TerminationReason.CUSTOMER_NO_SHOW;
            appointment.actualEndTime = new Date();
            message = 'Customer marked as No-Show.';
          } else {
            appointment.appointmentStatus = AppointmentStatus.DISPUTED;
            message =
              'Reported. Admin will review (Customer has check-in record).';
          }
        }
      }

      //  CASE B: COMPLETED
      // Dermatologist completes appointment, Customer reports No-Show -> DISPUTED
      else if (isCompleted) {
        appointment.appointmentStatus = AppointmentStatus.DISPUTED;
        // Remain old actualEndTime(when dermatologist completed) for check record
        message = 'Dispute raised. Payment is frozen pending investigation.';
      }

      await appRepo.save(appointment);
      return { message };
    });
  }

  private async processRefundForCustomer(
    appointment: Appointment,
    manager: EntityManager,
  ) {
    const hasUser = !!appointment.customer?.user?.userId;
    const hasPayment = !!appointment.payment;
    const hasSubscription = !!appointment.customerSubscription;

    const isMissingData = !hasUser || (!hasPayment && !hasSubscription);

    if (isMissingData) {
      this.logger.warn(
        `Missing relations for refund (Appt: ${appointment.appointmentId}). Refetching...`,
      );

      const fullAppointment = await manager.findOne(Appointment, {
        where: { appointmentId: appointment.appointmentId },
        relations: [
          'customer',
          'customer.user',
          'payment',
          'customerSubscription',
        ],
      });

      if (!fullAppointment) {
        this.logger.error(
          `Critical: Could not find appointment ${appointment.appointmentId} during refund process.`,
        );
        return;
      }

      appointment = fullAppointment;
    }

    if (appointment.payment && appointment.customer?.user?.userId) {
      await this.usersService.updateBalance(
        appointment.customer.user.userId,
        Number(appointment.payment.amount),
        manager,
      );
      this.logger.log(
        `💰 Refunded to Customer Wallet for Appt ${appointment.appointmentId}`,
      );
    } else if (appointment.customerSubscription) {
      await this.customerSubscriptionService.refundSession(
        appointment.customerSubscription.id,
        manager,
      );
      this.logger.log(
        `🔄 Refunded Session to Subscription for Appt ${appointment.appointmentId}`,
      );
    }
  }

  async reportCustomerNoShow(
    userId: string, // userId of Dermatologist
    appointmentId: string,
    dto: ReportNoShowDto,
  ): Promise<AppointmentActionResult> {
    const dermatologist = await this.dermatologistsService.findByUserId(userId);

    return this.processNoShowReport(
      appointmentId,
      dermatologist.dermatologistId,
      UserRole.DERMATOLOGIST,
      dto.note,
    );
  }

  async reportDoctorNoShow(
    userId: string, // userId of Customer
    appointmentId: string,
    dto: ReportNoShowDto,
  ): Promise<AppointmentActionResult> {
    const customer = await this.customersService.findByUserId(userId);
    return this.processNoShowReport(
      appointmentId,
      customer.customerId,
      UserRole.CUSTOMER,
      dto.note,
    );
  }

  async cancelMyAppointment(userId: string, appointmentId: string) {
    try {
      const customer = await this.customersService.findByUserId(userId);
      return this.entityManager.transaction(async (manager) => {
        const appointmentRepo = manager.getRepository(Appointment);

        const appointment = await appointmentRepo.findOne({
          where: {
            appointmentId: appointmentId,
            customer: { customerId: customer.customerId },
          },
          relations: ['payment', 'availabilitySlot', 'customerSubscription'],
        });

        if (!appointment) {
          throw new NotFoundException(
            'Appointment not found or you do not own it.',
          );
        }

        if (appointment.appointmentStatus !== AppointmentStatus.SCHEDULED) {
          throw new BadRequestException(
            `Cannot cancel an appointment with status: ${appointment.appointmentStatus}`,
          );
        }

        const msDifference =
          appointment.startTime.getTime() - new Date().getTime();

        if (msDifference > this.CANCELLATION_THRESHOLD_MS) {
          // Early Cancel
          return this.executeCancellation(
            manager,
            appointment,
            TerminationReason.CUSTOMER_CANCELLED_EARLY,
            true,
          );
        } else {
          // Late Cancel
          return this.executeCancellation(
            manager,
            appointment,
            TerminationReason.CUSTOMER_CANCELLED_LATE,
            false,
          );
        }
      });
    } catch (error) {
      this.logger.error(
        `Error cancelling appointment ${appointmentId} for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  async cancelByDermatologist(userId: string, appointmentId: string) {
    try {
      const dermatologist =
        await this.dermatologistsService.findByUserId(userId);

      return this.entityManager.transaction(async (manager) => {
        const appointmentRepo = manager.getRepository(Appointment);
        const appointment = await appointmentRepo.findOne({
          where: {
            appointmentId: appointmentId,
            dermatologist: { dermatologistId: dermatologist.dermatologistId },
          },
          relations: ['payment', 'availabilitySlot', 'customerSubscription'],
        });

        if (!appointment) {
          throw new NotFoundException(
            'Appointment not found or you do not own it.',
          );
        }

        if (appointment.appointmentStatus !== AppointmentStatus.SCHEDULED) {
          throw new BadRequestException(
            `Cannot cancel an appointment with status: ${appointment.appointmentStatus}`,
          );
        }

        return this.executeCancellation(
          manager,
          appointment,
          TerminationReason.DOCTOR_CANCELLED,
          true, //
        );
      });
    } catch (error) {
      this.logger.error(
        `Error cancelling appointment ${appointmentId} by dermatologist ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  async cancelPendingPaymentReservationByUser(
    appointmentId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const customer = await this.customersService.findByUserId(userId);

    return this.entityManager.transaction(async (manager) => {
      const appRepo = manager.getRepository(Appointment);
      const paymentRepo = manager.getRepository(Payment);

      const appointment = await appRepo.findOne({
        where: {
          appointmentId: appointmentId,
          customer: { customerId: customer.customerId },
        },
        relations: ['availabilitySlot', 'payment'],
        lock: { mode: 'pessimistic_write' }, // Lock the row avoiding race conditions
      });

      if (!appointment) {
        throw new NotFoundException(
          'Pending appointment not found or user does not own it.',
        );
      }

      if (appointment.appointmentStatus !== AppointmentStatus.PENDING_PAYMENT) {
        throw new BadRequestException(
          'This appointment is not in a pending payment state.',
        );
      }

      appointment.appointmentStatus = AppointmentStatus.CANCELLED;
      appointment.terminatedReason = TerminationReason.PAYMENT_TIMEOUT;

      if (appointment.availabilitySlot) {
        await this.availabilitySlotsService.releaseSlot(
          appointment.availabilitySlot.slotId,
          manager,
        );
      }

      // Update Payment -> EXPIRED
      // For cron job to skip processing
      if (appointment.payment) {
        appointment.payment.status = PaymentStatus.EXPIRED;
        await paymentRepo.save(appointment.payment);
      }

      await appRepo.save(appointment);

      this.logger.log(
        `User ${userId} manually cancelled reservation for Appt: ${appointmentId}`,
      );

      return { message: 'Appointment reservation successfully cancelled.' };
    });
  }

  /**
   * Được gọi bởi PaymentsService (Cron Job) khi một thanh toán bị hết hạn.
   * Hàm này PHẢI chạy bên trong một transaction do PaymentsService khởi tạo.
   */
  async cancelPendingAppointment(
    appointmentId: string,
    manager: EntityManager,
    reason: TerminationReason,
    note?: string,
  ): Promise<void> {
    this.logger.warn(
      `Attempting to cancel pending appointment ${appointmentId}. Reason: ${reason}`,
    );

    const appRepo = manager.getRepository(Appointment);

    const updateResult = await appRepo.update(
      {
        appointmentId: appointmentId,
        appointmentStatus: AppointmentStatus.PENDING_PAYMENT,
      },
      {
        appointmentStatus: AppointmentStatus.CANCELLED,
        terminatedReason: reason,
        terminationNote: note,
      },
    );

    // Nếu affected === 0, nghĩa là Appointment không tồn tại HOẶC trạng thái không phải PENDING_PAYMENT
    // (Có thể User đã hủy trước đó, hoặc Webhook đã xử lý xong rồi)
    if (updateResult.affected === 0) {
      this.logger.log(
        `Appt ${appointmentId} skipped cancellation. (Already processed or invalid status)`,
      );
      return;
    }

    const appointment = await appRepo.findOne({
      where: { appointmentId },
      relations: ['availabilitySlot'],
    });

    if (appointment?.availabilitySlot) {
      await this.availabilitySlotsService.releaseSlot(
        appointment.availabilitySlot.slotId,
        manager,
      );
      this.logger.log(
        `Released Slot ${appointment.availabilitySlot.slotId} for cancelled Appt ${appointmentId}`,
      );
    }
  }

  async generateMeetLinkForAppointment(
    appointment: Appointment,
  ): Promise<string> {
    try {
      const meetLink = await this.googleMeetService.createMeetLinkFromDates(
        `Skinalyze - ${appointment.appointmentId}`,
        appointment.startTime,
        appointment.endTime,
      );

      await this.appointmentRepository.update(appointment.appointmentId, {
        meetingUrl: meetLink,
      });

      // TODO: Integrate NotificationService here
      // await this.notificationService.sendMeetLink(...)

      this.logger.log(
        `✅ Generated Meet link for Appointment ${appointment.appointmentId}`,
      );

      return meetLink;
    } catch (error) {
      this.logger.error(
        `❌ Failed to generate link for Appointment ${appointment.appointmentId}: ${error.message}`,
      );
      return '';
    }
  }

  // Cron logic to process stuck appointments
  async processStuckAppointment(
    appointmentId: string,
    manager: EntityManager,
  ): Promise<void> {
    const appointment = await manager.findOne(Appointment, {
      where: { appointmentId },
      relations: [
        'payment',
        'customerSubscription',
        'customer',
        'customer.user',
      ],
    });

    if (!appointment) return;

    const hasCustomer = !!appointment.customerJoinedAt;
    const hasDoctor = !!appointment.dermatologistJoinedAt;

    // CASE A: Both joined (Forgot to press Finish) -> Auto Complete
    if (hasCustomer && hasDoctor) {
      appointment.appointmentStatus = AppointmentStatus.COMPLETED;
      appointment.actualEndTime = appointment.endTime;

      await manager.save(appointment);
      this.logger.log(
        `✅ Auto-completed Stuck Appointment ${appointmentId}. (Money Frozen)`,
      );
      return;
    }

    // CASE B: Handle NO_SHOW
    let reason: TerminationReason;
    let shouldRefund = false;

    if (hasCustomer && !hasDoctor) {
      reason = TerminationReason.DOCTOR_NO_SHOW;
      shouldRefund = true;
    } else if (!hasCustomer && hasDoctor) {
      reason = TerminationReason.CUSTOMER_NO_SHOW;
      shouldRefund = false;
    } else {
      // Both no-show
      reason = TerminationReason.CUSTOMER_NO_SHOW; // Customer no-show takes precedence
      shouldRefund = false;
    }

    appointment.appointmentStatus = AppointmentStatus.NO_SHOW;
    appointment.terminatedReason = reason;
    appointment.terminationNote = 'Auto-marked by System (Cleanup Job)';

    await manager.save(appointment);

    // Logic Refund only for DOCTOR_NO_SHOW
    if (shouldRefund) {
      await this.processRefundForCustomer(appointment, manager);
    }
  }

  // Cron logic to settle completed appointments
  async settleAppointment(
    appointment: Appointment,
    manager: EntityManager,
  ): Promise<void> {
    if (!appointment.dermatologist?.user?.userId) {
      this.logger.error(
        `❌ Missing Doctor User Data for Appt ${appointment.appointmentId}`,
      );
      return;
    }

    const doctorId = appointment.dermatologist.user.userId;

    if (appointment.payment) {
      const originalAmount = Number(appointment.payment.amount);
      const rate = 1 - this.BOOKING_FEE_RATE;
      const amountToCredit = originalAmount * rate;

      if (amountToCredit > 0) {
        await this.usersService.updateBalance(
          doctorId,
          amountToCredit,
          manager,
        );

        // Create Payment Record
        const paymentRepo = manager.getRepository(Payment);
        const payment = paymentRepo.create({
          paymentCode: `SKWSTAPP${Date.now()}${Math.floor(Math.random() * 1000)}`,
          paymentType: PaymentType.TOPUP,
          amount: amountToCredit,
          userId: doctorId,
          transferContent: appointment.appointmentId,
          status: PaymentStatus.COMPLETED,
          paymentMethod: PaymentMethod.WALLET,
          paidAt: new Date(),
        });
        await paymentRepo.save(payment);

        this.logger.log(
          `💰 Payout ${amountToCredit} to Doctor ${doctorId} for Appt ${appointment.appointmentId}`,
        );
      }
    } else if (appointment.customerSubscription) {
      // CASE: Booking by SUBSCRIPTION
      this.logger.log(
        `Skipping wallet credit for Appt ${appointment.appointmentId}: This is a subscription-based session. (Commission already paid at purchase).`,
      );
      return;
    } else {
      // CASE: Free Appointment (ADMIN/GIFTED)
      this.logger.warn(
        `Appointment ${appointment.appointmentId} has no payment/subscription. Skipping wallet credit.`,
      );
      return;
    }

    appointment.appointmentStatus = AppointmentStatus.SETTLED;
    await manager.save(appointment);
  }
}
