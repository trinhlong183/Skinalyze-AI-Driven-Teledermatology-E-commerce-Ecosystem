import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RoutineDetail,
  RoutineStepType,
} from '../routine-details/entities/routine-detail.entity';
import { NotificationsService } from './notifications.service';
import {
  NotificationType,
  NotificationPriority,
} from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { RoutineStatus } from '../treatment-routines/entities/treatment-routine.entity';

@Injectable()
export class RoutineRemindersService {
  private readonly logger = new Logger(RoutineRemindersService.name);

  constructor(
    @InjectRepository(RoutineDetail)
    private readonly routineDetailRepository: Repository<RoutineDetail>,
    private readonly notificationsService: NotificationsService,
    // Inject thêm FirebaseService/DeviceTokenService to push notifications on mobile
  ) {}

  /**
   *  Morning: 7:00 AM every day
   */
  @Cron('0 7 * * *', { name: 'MorningRoutine', timeZone: 'Asia/Ho_Chi_Minh' })
  async handleMorningReminders() {
    this.logger.log(' Starting Morning Routine Reminders...');
    await this.processRemindersForStep(
      RoutineStepType.MORNING,
      'Chào buổi sáng! ',
      'Đừng quên quy trình skincare sáng nay nhé:',
    );
  }

  /**
   *  Noon: 12:00 PM every day
   */
  @Cron('0 12 * * *', { name: 'NoonRoutine', timeZone: 'Asia/Ho_Chi_Minh' })
  async handleNoonReminders() {
    this.logger.log(' Starting Noon Routine Reminders...');
    await this.processRemindersForStep(
      RoutineStepType.NOON,
      'Nhắc nhở buổi trưa ',
      'Đã đến giờ chăm sóc da buổi trưa:',
    );
  }

  /**
   *  Evening: 8:00 PM every day
   */
  @Cron('0 20 * * *', { name: 'EveningRoutine', timeZone: 'Asia/Ho_Chi_Minh' })
  async handleEveningReminders() {
    this.logger.log(' Starting Evening Routine Reminders...');
    await this.processRemindersForStep(
      RoutineStepType.EVENING,
      'Skincare buổi tối ',
      'Thư giãn và chăm sóc da trước khi ngủ nào:',
    );
  }

  private async processRemindersForStep(
    stepType: RoutineStepType,
    titleBase: string,
    messagePrefix: string,
  ) {
    // 1. Find active RoutineDetails for the given step type and active Routines
    const details = await this.routineDetailRepository.find({
      where: {
        stepType: stepType,
        isActive: true,
        treatmentRoutine: {
          status: RoutineStatus.ACTIVE,
        },
      },
      relations: [
        'treatmentRoutine',
        'treatmentRoutine.customer',
        'treatmentRoutine.customer.user',
      ],
      select: {
        routineDetailId: true,
        content: true,
        treatmentRoutine: {
          routineId: true,
          routineName: true,
          customer: {
            customerId: true,
            user: {
              userId: true,
              fullName: true,
            },
          },
        },
      },
    });

    if (details.length === 0) {
      this.logger.log(`No active routines found for ${stepType}.`);
      return;
    }

    // 2. GROUP BY [USER + ROUTINE]
    // Key: "userId_routineId" -> Value: Data Object
    const remindersMap = new Map<
      string,
      {
        userId: string;
        routineId: string;
        routineName: string;
        items: string[];
      }
    >();

    for (const detail of details) {
      const user = detail.treatmentRoutine?.customer?.user;
      if (!user) continue;

      const userId = user.userId;
      const routineId = detail.treatmentRoutine.routineId;
      const routineName = detail.treatmentRoutine.routineName;
      const content = detail.content;

      const compositeKey = `${userId}_${routineId}`;

      let entry = remindersMap.get(compositeKey);

      if (!entry) {
        entry = {
          userId,
          routineId,
          routineName,
          items: [],
        };
        remindersMap.set(compositeKey, entry);
      }

      entry.items.push(content);
    }

    // 3. Create Notifications for each unique [USER + ROUTINE]
    this.logger.log(
      `Sending reminders for ${remindersMap.size} unique routines...`,
    );

    const notificationsToCreate: Promise<any>[] = [];

    for (const entry of remindersMap.values()) {
      const { userId, routineId, routineName, items } = entry;

      const listString = items.join(', ');

      const dynamicTitle = `${titleBase} - ${routineName}`;
      const fullMessage = `${messagePrefix} ${listString}`;

      const dto: CreateNotificationDto = {
        userId: userId,
        type: NotificationType.TREATMENT_ROUTINE,
        title: dynamicTitle,
        message: fullMessage,
        priority: NotificationPriority.HIGH,
        data: {
          stepType: stepType,
          items: items,
          routineId: routineId,
        },
        imageUrl: 'https://example.com/skincare-icon.png',

        actionUrl: `app://TreatmentRoutineDetailScreen?routineId=${routineId}`,
      };

      notificationsToCreate.push(
        this.notificationsService
          .create(dto)
          .catch((err) =>
            this.logger.error(
              `Failed to create noti for user ${userId} (Routine: ${routineId}): ${err.message}`,
            ),
          ),
      );
    }

    await Promise.all(notificationsToCreate);
    this.logger.log(`✅ Completed sending ${stepType} reminders.`);
  }
}
