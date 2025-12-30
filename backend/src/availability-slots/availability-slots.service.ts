import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  FindOperator,
  FindOptionsWhere,
  In,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';
import {
  AvailabilitySlot,
  SlotStatus,
} from './entities/availability-slot.entity';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import {
  addDays,
  addMinutes,
  endOfMonth,
  isBefore,
  isEqual,
  parse,
  startOfMonth,
} from 'date-fns';

type NewSlotData = {
  dermatologistId: string;
  startTime: Date;
  endTime: Date;
  status: SlotStatus;
  price: number;
};

@Injectable()
export class AvailabilitySlotsService {
  private readonly MAX_BOOKING_WINDOW_DAYS = 30;
  constructor(
    @InjectRepository(AvailabilitySlot)
    private readonly slotRepository: Repository<AvailabilitySlot>,
  ) {}
  private readonly logger = new Logger(AvailabilitySlotsService.name);
  private getRepository(manager?: EntityManager) {
    return manager
      ? manager.getRepository(AvailabilitySlot)
      : this.slotRepository;
  }

  async createMySlots(
    dermatologistId: string,
    defaultSlotPrice: number,
    dto: CreateAvailabilityDto,
  ) {
    const newSlotsToCreate: NewSlotData[] = [];
    const startTimesToCheck: Date[] = [];
    const now = new Date();
    const maxAllowedDate = addDays(now, this.MAX_BOOKING_WINDOW_DAYS);

    // 1: GENERATE INDIVIDUAL SLOTS FROM INPUT BLOCKS
    for (const block of dto.blocks) {
      const start = this.parseDate(block.startTime, 'block start time');
      const blockEnd = this.parseDate(block.endTime, 'block end time');
      const duration = block.slotDurationInMinutes;
      const priceForThisBlock = block.price ?? defaultSlotPrice;

      // Validate block time range
      if (blockEnd <= start) {
        throw new BadRequestException(
          'Block end time must be after block start time.',
        );
      }
      if (isBefore(start, now)) {
        throw new BadRequestException(
          `Cannot create availability in the past. Block starts at ${start.toISOString()}`,
        );
      }

      if (isBefore(maxAllowedDate, start)) {
        throw new BadRequestException(
          `Cannot create availability more than ${this.MAX_BOOKING_WINDOW_DAYS} days in advance. Block starts at ${start.toISOString()}`,
        );
      }

      // Slice the block into smaller slots
      let currentSlotStart = start;

      while (isBefore(currentSlotStart, blockEnd)) {
        const currentSlotEnd = addMinutes(currentSlotStart, duration);

        // Stop if the generated slot exceeds the max booking window
        if (isBefore(maxAllowedDate, currentSlotStart)) {
          this.logger.warn(
            `Skipping slot at ${currentSlotStart.toISOString()} for derm ${dermatologistId} as it is beyond the ${this.MAX_BOOKING_WINDOW_DAYS}-day limit.`,
          );
          break;
        }

        // Ensure the slot fits within the block's end time
        if (
          isBefore(currentSlotEnd, blockEnd) ||
          isEqual(currentSlotEnd, blockEnd)
        ) {
          newSlotsToCreate.push({
            dermatologistId,
            startTime: currentSlotStart,
            endTime: currentSlotEnd,
            status: SlotStatus.AVAILABLE,
            price: priceForThisBlock,
          });
          startTimesToCheck.push(currentSlotStart);
          currentSlotStart = currentSlotEnd;
        } else {
          // If the slot does not fit, break out of the loop
          break;
        }
      }
    }

    if (newSlotsToCreate.length === 0) {
      throw new BadRequestException('No valid slots to create.');
    }

    // 2: INTERNAL SELF-OVERLAP CHECK (Check payload for overlapping slots)

    // Sort slots by start time to enable overlap checking
    newSlotsToCreate.sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );

    for (let i = 0; i < newSlotsToCreate.length - 1; i++) {
      const currentSlot = newSlotsToCreate[i];
      const nextSlot = newSlotsToCreate[i + 1];

      // Condition: If the Next Slot starts BEFORE the Current Slot ends -> OVERLAP
      if (nextSlot.startTime < currentSlot.endTime) {
        throw new ConflictException(
          `Input blocks are overlapping. Slot start at ${currentSlot.startTime.toISOString()} overlaps with ${nextSlot.startTime.toISOString()}`,
        );
      }
    }

    // 3: BUILD DATABASE OVERLAP CONDITIONS
    //Check overlap: (OldStart < NewEnd) AND (OldEnd > NewStart)
    const overlapConditions: FindOptionsWhere<AvailabilitySlot>[] =
      newSlotsToCreate.map((newSlot) => {
        return {
          dermatologistId: dermatologistId,
          startTime: LessThan(newSlot.endTime), // Existing slot starts before new slot ends (OldStart < NewEnd)
          endTime: MoreThan(newSlot.startTime), // Existing slot ends after new slot starts (OldEnd > NewStart)
        };
      });

    //  4: FIND EXISTING OVERLAPS IN DATABASE
    // Find slots that overlap with any of the new slots
    const existingOverlaps = await this.slotRepository.find({
      where: overlapConditions, // OR conditions (typeorm handles this automatically)
    });

    if (existingOverlaps.length > 0) {
      throw new ConflictException(
        'One or more new slots overlap with existing time slots.',
      );
    }

    //  5: BULK INSERT & RACE CONDITION HANDLING
    try {
      await this.slotRepository.insert(newSlotsToCreate);
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY' || error?.number === 1062) {
        throw new ConflictException(
          'A race condition occurred. One or more slots already exist.',
        );
      }
      throw error;
    }
    return {
      message: `Successfully created ${newSlotsToCreate.length} new slots.`,
    };
  }

  async getAvailabilitySummary(
    dermatologistId: string,
    month: number,
    year: number,
  ): Promise<string[]> {
    if (month < 1 || month > 12) {
      throw new BadRequestException('Invalid month. Must be between 1 and 12.');
    }
    const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const referenceDate = parse(dateStr, 'yyyy-MM-dd', new Date());
    if (isNaN(referenceDate.getTime())) {
      throw new BadRequestException('Invalid year or month.');
    }

    // Range of the month
    const firstDay = startOfMonth(referenceDate);
    const lastDay = endOfMonth(referenceDate);
    const now = new Date();

    const query = this.slotRepository
      .createQueryBuilder('slot')
      .select('DATE(slot.startTime) as date')
      .where('slot.dermatologistId = :dermatologistId', { dermatologistId })
      .andWhere('slot.status = :status', { status: SlotStatus.AVAILABLE })
      .andWhere('slot.startTime >= :now', { now })
      .andWhere('slot.startTime BETWEEN :firstDay AND :lastDay', {
        firstDay,
        lastDay,
      })
      .groupBy('date')
      .orderBy('date', 'ASC');

    // Get raw results
    const rawResults: { date: string }[] = await query.getRawMany();

    return rawResults.map((result) => result.date);
  }

  async getMySlots(
    dermatologistId: string,
    startDate?: string,
    endDate?: string,
    status?: SlotStatus,
  ) {
    let dateRangeFilter: FindOperator<Date> | undefined;

    if (startDate && endDate) {
      const rangeStart = this.parseDate(startDate, 'start date');
      const rangeEnd = this.parseDate(endDate, 'end date');

      if (rangeEnd < rangeStart) {
        throw new BadRequestException('End date must be after start date.');
      }

      dateRangeFilter = Between(rangeStart, rangeEnd);
    } else if (startDate || endDate) {
      throw new BadRequestException(
        'Both startDate and endDate are required when filtering by range.',
      );
    }

    const where: Record<string, unknown> = {
      dermatologistId,
    };

    if (dateRangeFilter) {
      where.startTime = dateRangeFilter;
    }

    if (status) {
      where.status = status;
    }

    return this.slotRepository.find({
      where,
      order: {
        startTime: 'ASC',
      },
    });
  }

  async cancelMySlotsBatch(dermatologistId: string, slotIds: string[]) {
    const slots = await this.slotRepository.find({
      where: {
        slotId: In(slotIds),
        dermatologistId,
      },
    });

    if (slots.length === 0) {
      throw new NotFoundException('No matching slots found to cancel.');
    }

    // (If booked slot found, abort the entire batch cancellation)
    const bookedSlot = slots.find((slot) => slot.status === SlotStatus.BOOKED);

    if (bookedSlot) {
      throw new BadRequestException(
        `Cannot cancel batch. Slot with ID ${bookedSlot.slotId} is already BOOKED. Please handle booking cancellations separately.`,
      );
    }

    const result = await this.slotRepository.delete({
      slotId: In(slots.map((s) => s.slotId)),
      dermatologistId,
    });

    return {
      success: true,
      message: `Successfully cancelled ${result.affected} slot(s).`,
      deletedCount: result.affected,
    };
  }

  async cancelMySlot(dermatologistId: string, slotId: string) {
    const slot = await this.slotRepository.findOne({
      where: {
        slotId,
        dermatologistId,
      },
    });

    if (!slot) {
      throw new NotFoundException(
        'Slot not found or you do not have permission.',
      );
    }

    if (slot.status === SlotStatus.BOOKED) {
      throw new BadRequestException(
        'This slot is already booked by a customer. Please cancel the appointment instead.',
      );
    }

    await this.slotRepository.remove(slot);

    return { message: 'Availability slot successfully cancelled.' };
  }

  async reserveSlot(
    dermatologistId: string,
    startTimeIso: string,
    endTimeIso: string,
    manager?: EntityManager,
  ): Promise<AvailabilitySlot> {
    const repository = this.getRepository(manager);
    const slot = await this.ensureSlotAvailability(
      repository,
      dermatologistId,
      startTimeIso,
      endTimeIso,
    );

    const updateResult = await repository.update(
      { slotId: slot.slotId, status: SlotStatus.AVAILABLE },
      { status: SlotStatus.BOOKED },
    );

    if (!updateResult.affected) {
      throw new ConflictException('Requested slot is no longer available.');
    }

    slot.status = SlotStatus.BOOKED;
    return slot;
  }

  async linkSlotToAppointment(
    slotId: string,
    appointmentId: string,
    manager?: EntityManager,
  ) {
    const repository = this.getRepository(manager);
    await repository.update(slotId, { appointmentId });
  }

  async releaseSlot(slotId: string, manager?: EntityManager) {
    const repository = this.getRepository(manager);
    await repository.update(slotId, {
      status: SlotStatus.AVAILABLE,
      appointmentId: null,
    });
  }

  async releaseSlotByAppointment(
    appointmentId: string,
    manager?: EntityManager,
  ) {
    if (!appointmentId) {
      return;
    }

    const repository = this.getRepository(manager);
    const slot = await repository.findOne({
      where: { appointmentId },
    });

    if (!slot) {
      return;
    }

    await this.releaseSlot(slot.slotId, manager);
  }

  private async ensureSlotAvailability(
    repository: Repository<AvailabilitySlot>,
    dermatologistId: string,
    startTimeIso: string,
    endTimeIso: string,
  ): Promise<AvailabilitySlot> {
    const { start, end } = this.getValidatedRange(startTimeIso, endTimeIso);

    const slot = await repository.findOne({
      where: {
        dermatologistId,
        startTime: start,
      },
    });

    if (!slot) {
      throw new NotFoundException('Requested slot does not exist.');
    }

    if (slot.endTime.getTime() !== end.getTime()) {
      throw new BadRequestException(
        'Requested time range does not match the slot duration.',
      );
    }

    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new ConflictException('Requested slot is no longer available.');
    }

    return slot;
  }

  private parseDate(value: string, context: string): Date {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${context} provided.`);
    }

    return parsed;
  }

  private getValidatedRange(startIso: string, endIso: string) {
    const start = this.parseDate(startIso, 'start time');
    const end = this.parseDate(endIso, 'end time');

    if (end <= start) {
      throw new BadRequestException('End time must be after start time.');
    }

    return { start, end };
  }
}
