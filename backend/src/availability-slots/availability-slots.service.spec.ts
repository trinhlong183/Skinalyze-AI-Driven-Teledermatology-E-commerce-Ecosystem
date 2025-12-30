import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager, UpdateResult } from 'typeorm';
import { AvailabilitySlotsService } from './availability-slots.service';
import {
  AvailabilitySlot,
  SlotStatus,
} from './entities/availability-slot.entity';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { addDays, addMinutes } from 'date-fns';

describe('AvailabilitySlotsService', () => {
  let service: AvailabilitySlotsService;
  let repository: Repository<AvailabilitySlot>;

  const mockSlotRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilitySlotsService,
        {
          provide: getRepositoryToken(AvailabilitySlot),
          useValue: mockSlotRepository,
        },
      ],
    }).compile();

    service = module.get<AvailabilitySlotsService>(AvailabilitySlotsService);
    repository = module.get<Repository<AvailabilitySlot>>(
      getRepositoryToken(AvailabilitySlot),
    );

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMySlots', () => {
    const dermatologistId = 'derm-123';
    const defaultPrice = 200000;
    const now = new Date();
    const tomorrow = addDays(now, 1);

    describe('Normal cases', () => {
      it('should create slots successfully with valid input', async () => {
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: addDays(now, 1).toISOString(),
              endTime: addDays(addMinutes(now, 120), 1).toISOString(),
              slotDurationInMinutes: 60,
            },
          ],
        };

        mockSlotRepository.find.mockResolvedValue([]); // No overlaps
        mockSlotRepository.insert.mockResolvedValue({});

        const result = await service.createMySlots(
          dermatologistId,
          defaultPrice,
          dto,
        );

        expect(result.message).toContain('Successfully created');
        expect(mockSlotRepository.find).toHaveBeenCalled();
        expect(mockSlotRepository.insert).toHaveBeenCalled();
      });

      it('should create multiple slots from a single block', async () => {
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: addDays(now, 1).toISOString(),
              endTime: addMinutes(addDays(now, 1), 180).toISOString(), // 3 hours
              slotDurationInMinutes: 60, // 1 hour each = 3 slots
            },
          ],
        };

        mockSlotRepository.find.mockResolvedValue([]);
        mockSlotRepository.insert.mockResolvedValue({});

        await service.createMySlots(dermatologistId, defaultPrice, dto);

        expect(mockSlotRepository.insert).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              dermatologistId,
              status: SlotStatus.AVAILABLE,
              price: defaultPrice,
            }),
          ]),
        );
      });

      it('should use custom price when provided in block', async () => {
        const customPrice = 300000;
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: addDays(now, 1).toISOString(),
              endTime: addMinutes(addDays(now, 1), 60).toISOString(),
              slotDurationInMinutes: 60,
              price: customPrice,
            },
          ],
        };

        mockSlotRepository.find.mockResolvedValue([]);
        mockSlotRepository.insert.mockResolvedValue({});

        await service.createMySlots(dermatologistId, defaultPrice, dto);

        expect(mockSlotRepository.insert).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              price: customPrice,
            }),
          ]),
        );
      });

      it('should create slots from multiple blocks', async () => {
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: addDays(now, 1).toISOString(),
              endTime: addMinutes(addDays(now, 1), 60).toISOString(),
              slotDurationInMinutes: 30,
            },
            {
              startTime: addDays(now, 2).toISOString(),
              endTime: addMinutes(addDays(now, 2), 60).toISOString(),
              slotDurationInMinutes: 30,
            },
          ],
        };

        mockSlotRepository.find.mockResolvedValue([]);
        mockSlotRepository.insert.mockResolvedValue({});

        const result = await service.createMySlots(
          dermatologistId,
          defaultPrice,
          dto,
        );

        expect(result.message).toContain('4'); // 2 slots per block
      });
    });

    describe('Boundary cases', () => {
      it('should create slot exactly at 30-day limit', async () => {
        const maxDate = addDays(now, 29);
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: maxDate.toISOString(),
              endTime: addMinutes(maxDate, 60).toISOString(),
              slotDurationInMinutes: 60,
            },
          ],
        };

        mockSlotRepository.find.mockResolvedValue([]);
        mockSlotRepository.insert.mockResolvedValue({});

        await service.createMySlots(dermatologistId, defaultPrice, dto);

        expect(mockSlotRepository.insert).toHaveBeenCalled();
      });

      it('should handle minimum duration slot (15 minutes)', async () => {
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: addDays(now, 1).toISOString(),
              endTime: addMinutes(addDays(now, 1), 15).toISOString(),
              slotDurationInMinutes: 15,
            },
          ],
        };

        mockSlotRepository.find.mockResolvedValue([]);
        mockSlotRepository.insert.mockResolvedValue({});

        await service.createMySlots(dermatologistId, defaultPrice, dto);

        expect(mockSlotRepository.insert).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              dermatologistId,
            }),
          ]),
        );
      });
    });

    describe('Abnormal cases', () => {
      it('should throw error when block start time is in the past', async () => {
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: addDays(now, -1).toISOString(), // Yesterday
              endTime: addMinutes(addDays(now, -1), 60).toISOString(),
              slotDurationInMinutes: 60,
            },
          ],
        };

        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow('Cannot create availability in the past');
      });

      it('should throw error when block end time is before start time', async () => {
        const start = addDays(now, 1);
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: start.toISOString(),
              endTime: addMinutes(start, -60).toISOString(), // Before start
              slotDurationInMinutes: 60,
            },
          ],
        };

        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow('Block end time must be after block start time');
      });

      it('should throw error when block exceeds 30-day limit', async () => {
        const tooFar = addDays(now, 31);
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: tooFar.toISOString(),
              endTime: addMinutes(tooFar, 60).toISOString(),
              slotDurationInMinutes: 60,
            },
          ],
        };

        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow('Cannot create availability more than 30 days');
      });

      it('should throw error when input blocks overlap each other', async () => {
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: addDays(now, 1).toISOString(),
              endTime: addMinutes(addDays(now, 1), 120).toISOString(),
              slotDurationInMinutes: 60,
            },
            {
              startTime: addMinutes(addDays(now, 1), 90).toISOString(), // Overlaps with first block
              endTime: addMinutes(addDays(now, 1), 150).toISOString(),
              slotDurationInMinutes: 60,
            },
          ],
        };

        mockSlotRepository.find.mockResolvedValue([]);

        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow(ConflictException);
        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow('Input blocks are overlapping');
      });

      it('should throw error when new slots overlap with existing slots', async () => {
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: addDays(now, 1).toISOString(),
              endTime: addMinutes(addDays(now, 1), 60).toISOString(),
              slotDurationInMinutes: 60,
            },
          ],
        };

        // Mock existing overlapping slot
        mockSlotRepository.find.mockResolvedValue([
          {
            slotId: 'existing-slot',
            startTime: addDays(now, 1),
            endTime: addMinutes(addDays(now, 1), 60),
          },
        ]);

        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow(ConflictException);
        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow('overlap with existing time slots');
      });

      it('should handle database race condition', async () => {
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: addDays(now, 1).toISOString(),
              endTime: addMinutes(addDays(now, 1), 60).toISOString(),
              slotDurationInMinutes: 60,
            },
          ],
        };

        mockSlotRepository.find.mockResolvedValue([]);
        mockSlotRepository.insert.mockRejectedValue({ code: 'ER_DUP_ENTRY' });

        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow(ConflictException);
        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow('race condition occurred');
      });

      it('should throw error when no valid slots can be created', async () => {
        const dto: CreateAvailabilityDto = {
          blocks: [],
        };

        await expect(
          service.createMySlots(dermatologistId, defaultPrice, dto),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('getMySlots', () => {
    const dermatologistId = 'derm-123';

    describe('Normal cases', () => {
      it('should retrieve all slots for dermatologist without filters', async () => {
        const mockSlots = [
          { slotId: '1', status: SlotStatus.AVAILABLE },
          { slotId: '2', status: SlotStatus.BOOKED },
        ];

        mockSlotRepository.find.mockResolvedValue(mockSlots);

        const result = await service.getMySlots(dermatologistId);

        expect(result).toEqual(mockSlots);
        expect(mockSlotRepository.find).toHaveBeenCalledWith({
          where: { dermatologistId },
          order: { startTime: 'ASC' },
        });
      });

      it('should filter slots by date range', async () => {
        const startDate = new Date().toISOString();
        const endDate = addDays(new Date(), 7).toISOString();

        mockSlotRepository.find.mockResolvedValue([]);

        await service.getMySlots(dermatologistId, startDate, endDate);

        expect(mockSlotRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              dermatologistId,
              startTime: expect.anything(),
            }),
          }),
        );
      });

      it('should filter slots by status', async () => {
        mockSlotRepository.find.mockResolvedValue([]);

        await service.getMySlots(
          dermatologistId,
          undefined,
          undefined,
          SlotStatus.AVAILABLE,
        );

        expect(mockSlotRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              dermatologistId,
              status: SlotStatus.AVAILABLE,
            }),
          }),
        );
      });
    });

    describe('Abnormal cases', () => {
      it('should throw error when only startDate is provided', async () => {
        const startDate = new Date().toISOString();

        await expect(
          service.getMySlots(dermatologistId, startDate),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.getMySlots(dermatologistId, startDate),
        ).rejects.toThrow('Both startDate and endDate are required');
      });

      it('should throw error when only endDate is provided', async () => {
        const endDate = new Date().toISOString();

        await expect(
          service.getMySlots(dermatologistId, undefined, endDate),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw error when endDate is before startDate', async () => {
        const startDate = addDays(new Date(), 7).toISOString();
        const endDate = new Date().toISOString();

        await expect(
          service.getMySlots(dermatologistId, startDate, endDate),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.getMySlots(dermatologistId, startDate, endDate),
        ).rejects.toThrow('End date must be after start date');
      });
    });
  });

  describe('cancelMySlot', () => {
    const dermatologistId = 'derm-123';
    const slotId = 'slot-123';

    describe('Normal cases', () => {
      it('should cancel an available slot successfully', async () => {
        const mockSlot = {
          slotId,
          dermatologistId,
          status: SlotStatus.AVAILABLE,
        };

        mockSlotRepository.findOne.mockResolvedValue(mockSlot);
        mockSlotRepository.remove.mockResolvedValue(mockSlot);

        const result = await service.cancelMySlot(dermatologistId, slotId);

        expect(result.message).toContain('successfully cancelled');
        expect(mockSlotRepository.remove).toHaveBeenCalledWith(mockSlot);
      });
    });

    describe('Abnormal cases', () => {
      it('should throw NotFoundException when slot does not exist', async () => {
        mockSlotRepository.findOne.mockResolvedValue(null);

        await expect(
          service.cancelMySlot(dermatologistId, slotId),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.cancelMySlot(dermatologistId, slotId),
        ).rejects.toThrow('Slot not found');
      });

      it('should throw error when trying to cancel booked slot', async () => {
        const mockSlot = {
          slotId,
          dermatologistId,
          status: SlotStatus.BOOKED,
        };

        mockSlotRepository.findOne.mockResolvedValue(mockSlot);

        await expect(
          service.cancelMySlot(dermatologistId, slotId),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.cancelMySlot(dermatologistId, slotId),
        ).rejects.toThrow('already booked by a customer');
      });

      it('should throw error when slot belongs to different dermatologist', async () => {
        mockSlotRepository.findOne.mockResolvedValue(null);

        await expect(
          service.cancelMySlot('different-derm', slotId),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('reserveSlot', () => {
    const dermatologistId = 'derm-123';
    const startTime = new Date().toISOString();
    const endTime = addMinutes(new Date(), 60).toISOString();

    describe('Normal cases', () => {
      it('should reserve an available slot successfully', async () => {
        const mockSlot = {
          slotId: 'slot-123',
          dermatologistId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: SlotStatus.AVAILABLE,
          price: 200000,
        };

        mockSlotRepository.findOne.mockResolvedValue(mockSlot);
        mockSlotRepository.update.mockResolvedValue({ affected: 1 });

        const result = await service.reserveSlot(
          dermatologistId,
          startTime,
          endTime,
        );

        expect(result.status).toBe(SlotStatus.BOOKED);
        expect(mockSlotRepository.update).toHaveBeenCalledWith(
          { slotId: mockSlot.slotId, status: SlotStatus.AVAILABLE },
          { status: SlotStatus.BOOKED },
        );
      });
    });

    describe('Abnormal cases', () => {
      it('should throw NotFoundException when slot does not exist', async () => {
        mockSlotRepository.findOne.mockResolvedValue(null);

        await expect(
          service.reserveSlot(dermatologistId, startTime, endTime),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.reserveSlot(dermatologistId, startTime, endTime),
        ).rejects.toThrow('Requested slot does not exist');
      });

      it('should throw ConflictException when slot is no longer available', async () => {
        const mockSlot = {
          slotId: 'slot-123',
          dermatologistId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: SlotStatus.BOOKED,
        };

        mockSlotRepository.findOne.mockResolvedValue(mockSlot);

        await expect(
          service.reserveSlot(dermatologistId, startTime, endTime),
        ).rejects.toThrow(ConflictException);
        await expect(
          service.reserveSlot(dermatologistId, startTime, endTime),
        ).rejects.toThrow('slot is no longer available');
      });

      it('should throw BadRequestException when time range does not match', async () => {
        const mockSlot = {
          slotId: 'slot-123',
          dermatologistId,
          startTime: new Date(startTime),
          endTime: addMinutes(new Date(endTime), 30), // Different end time
          status: SlotStatus.AVAILABLE,
        };

        mockSlotRepository.findOne.mockResolvedValue(mockSlot);

        await expect(
          service.reserveSlot(dermatologistId, startTime, endTime),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.reserveSlot(dermatologistId, startTime, endTime),
        ).rejects.toThrow('time range does not match');
      });

      it('should throw ConflictException on race condition', async () => {
        const mockSlot = {
          slotId: 'slot-123',
          dermatologistId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: SlotStatus.AVAILABLE,
        };

        mockSlotRepository.findOne.mockResolvedValue(mockSlot);
        mockSlotRepository.update.mockResolvedValue({ affected: 0 }); // Race condition

        await expect(
          service.reserveSlot(dermatologistId, startTime, endTime),
        ).rejects.toThrow(ConflictException);
        await expect(
          service.reserveSlot(dermatologistId, startTime, endTime),
        ).rejects.toThrow('no longer available');
      });
    });
  });

  describe('releaseSlot', () => {
    it('should release a booked slot successfully', async () => {
      const slotId = 'slot-123';
      mockSlotRepository.update.mockResolvedValue({ affected: 1 });

      await service.releaseSlot(slotId);

      expect(mockSlotRepository.update).toHaveBeenCalledWith(slotId, {
        status: SlotStatus.AVAILABLE,
        appointmentId: null,
      });
    });
  });

  describe('getAvailabilitySummary', () => {
    const dermatologistId = 'derm-123';

    describe('Normal cases', () => {
      it('should return dates with available slots', async () => {
        const mockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([
            { date: '2025-12-10' },
            { date: '2025-12-15' },
          ]),
        };

        mockSlotRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

        const result = await service.getAvailabilitySummary(
          dermatologistId,
          12,
          2025,
        );

        expect(result).toEqual(['2025-12-10', '2025-12-15']);
        expect(mockQueryBuilder.getRawMany).toHaveBeenCalled();
      });
    });

    describe('Abnormal cases', () => {
      it('should throw error for invalid month', async () => {
        await expect(
          service.getAvailabilitySummary(dermatologistId, 13, 2025),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.getAvailabilitySummary(dermatologistId, 13, 2025),
        ).rejects.toThrow('Invalid month');
      });

      it('should throw error for invalid year', async () => {
        await expect(
          service.getAvailabilitySummary(dermatologistId, 12, -1),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});
