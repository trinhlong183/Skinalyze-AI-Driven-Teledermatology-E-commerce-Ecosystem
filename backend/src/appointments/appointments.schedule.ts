import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, IsNull, Between, LessThan } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentStatus } from './types/appointment.types';
import { addMinutes, subMinutes, subHours } from 'date-fns';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationPriority,
  NotificationType,
} from '../notifications/entities/notification.entity';

@Injectable()
export class AppointmentsScheduler {
  private readonly logger = new Logger(AppointmentsScheduler.name);
  private readonly MEET_LINK_LOOKAHEAD_MINUTES = 60;
  private readonly STUCK_APPOINTMENT_GRACE_MINUTES = 15;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly appointmentsService: AppointmentsService,
    private readonly entityManager: EntityManager,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleGenerateMeetLinksCron() {
    this.logger.log(
      'Running Cron: Check for appointments needing Meet links...',
    );

    const now = new Date();
    const targetTime = addMinutes(now, this.MEET_LINK_LOOKAHEAD_MINUTES);

    const appointmentsToProcess = await this.appointmentRepository.find({
      where: {
        appointmentStatus: AppointmentStatus.SCHEDULED,
        meetingUrl: IsNull(),
        startTime: Between(now, targetTime),
      },
      relations: [
        'dermatologist',
        'dermatologist.user',
        'customer',
        'customer.user',
      ],
    });

    if (appointmentsToProcess.length === 0) return;

    this.logger.log(
      `Found ${appointmentsToProcess.length} appointments needing links.`,
    );

    for (const appointment of appointmentsToProcess) {
      const meetLink =
        await this.appointmentsService.generateMeetLinkForAppointment(
          appointment,
        );

      if (!meetLink) {
        continue;
      }

      await this.notifyMeetLinkReady(appointment, meetLink);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCleanupEndedAppointments() {
    this.logger.log('Running Cron: Cleanup stuck appointments...');

    const minutesAgo = subMinutes(
      new Date(),
      this.STUCK_APPOINTMENT_GRACE_MINUTES,
    );

    const stuckAppointments = await this.appointmentRepository.find({
      select: [
        'appointmentId',
        'customerJoinedAt',
        'dermatologistJoinedAt',
        'appointmentStatus',
      ],
      where: [
        {
          appointmentStatus: AppointmentStatus.SCHEDULED,
          endTime: LessThan(minutesAgo),
        },
        {
          appointmentStatus: AppointmentStatus.IN_PROGRESS,
          endTime: LessThan(minutesAgo),
        },
      ],
      relations: ['customerSubscription'],
    });

    if (stuckAppointments.length === 0) return;

    this.logger.log(`Found ${stuckAppointments.length} stuck appointments.`);

    for (const stuckAppt of stuckAppointments) {
      try {
        await this.entityManager.transaction(async (manager) => {
          await this.appointmentsService.processStuckAppointment(
            stuckAppt.appointmentId,
            manager,
          );
        });
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Failed cleanup for ${stuckAppt.appointmentId}: ${err.message}`,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleSettlement() {
    this.logger.log('Running Cron: Settlement (Paying Doctors)...');

    // Find COMPLETED appointment more than 24 hours ago (Dispute Window)
    // And not disputed, not settled
    const disputeWindow = subHours(
      new Date(),
      this.appointmentsService.VALID_REPORT_HOURS,
    );

    const pendingSettlements = await this.appointmentRepository.find({
      where: {
        appointmentStatus: AppointmentStatus.COMPLETED,
        updatedAt: LessThan(disputeWindow), // Đã hoàn thành > 24h
      },
      relations: ['dermatologist', 'dermatologist.user', 'payment'],
    });

    if (pendingSettlements.length === 0) return;

    this.logger.log(
      `Found ${pendingSettlements.length} appointments ready for settlement.`,
    );

    for (const appt of pendingSettlements) {
      try {
        await this.entityManager.transaction(async (manager) => {
          await this.appointmentsService.settleAppointment(appt, manager);
        });
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Failed settlement for ${appt.appointmentId}: ${err.message}`,
        );
      }
    }
  }

  private async notifyMeetLinkReady(
    appointment: Appointment,
    meetLink: string,
  ): Promise<void> {
    const actionUrl = `app://AppointmentDetailScreen?appointmentId=${appointment.appointmentId}`;

    const startTimeLabel = appointment.startTime.toLocaleString('vi-VN');
    const notificationPayload = {
      appointmentId: appointment.appointmentId,
      meetingUrl: meetLink,
      startTime: appointment.startTime.toISOString(),
    };

    const customerUserId = appointment.customer?.user?.userId;
    if (customerUserId) {
      try {
        await this.notificationsService.sendToUser(
          customerUserId,
          NotificationType.APPOINTMENT,
          'Your appointment link is ready',
          `Your appointment scheduled for ${startTimeLabel} now has a Google Meet link available.`,
          notificationPayload,
          actionUrl,
          undefined,
          NotificationPriority.HIGH,
        );
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Failed to notify customer ${customerUserId} for appointment ${appointment.appointmentId}: ${err.message}`,
        );
      }
    } else {
      this.logger.warn(
        `Skipping customer notification for appointment ${appointment.appointmentId}: customer userId missing`,
      );
    }

    const dermatologistUserId = appointment.dermatologist?.user?.userId;
    const customerName =
      appointment.customer?.user?.fullName || 'your upcoming client';
    if (dermatologistUserId) {
      try {
        await this.notificationsService.sendToUser(
          dermatologistUserId,
          NotificationType.APPOINTMENT,
          'Consultation link ready',
          `The Meet link for your consultation with ${customerName} is ready for ${startTimeLabel}.`,
          notificationPayload,
          actionUrl,
          undefined,
          NotificationPriority.HIGH,
        );
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Failed to notify dermatologist ${dermatologistUserId} for appointment ${appointment.appointmentId}: ${err.message}`,
        );
      }
    } else {
      this.logger.warn(
        `Skipping dermatologist notification for appointment ${appointment.appointmentId}: dermatologist userId missing`,
      );
    }
  }
}
