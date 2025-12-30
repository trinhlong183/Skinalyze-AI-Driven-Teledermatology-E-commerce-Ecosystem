import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilitySlotsController } from './availability-slots.controller';
import { AvailabilitySlotsService } from './availability-slots.service';
import { DermatologistsService } from '../dermatologists/dermatologists.service';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { SlotStatus } from './entities/availability-slot.entity';
import { addDays, addMinutes } from 'date-fns';

describe('AvailabilitySlotsController', () => {
  let controller: AvailabilitySlotsController;
  let availabilitySlotsService: AvailabilitySlotsService;
  let dermatologistsService: DermatologistsService;

  const mockAvailabilitySlotsService = {
    createMySlots: jest.fn(),
    getMySlots: jest.fn(),
    cancelMySlot: jest.fn(),
    getAvailabilitySummary: jest.fn(),
  };

  const mockDermatologistsService = {
    findByUserId: jest.fn(),
  };

  const mockUser: User = {
    userId: 'user-123',
    email: 'doctor@example.com',
    role: UserRole.DERMATOLOGIST,
  } as User;

  const mockDermatologist = {
    dermatologistId: 'derm-123',
    defaultSlotPrice: 200000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvailabilitySlotsController],
      providers: [
        {
          provide: AvailabilitySlotsService,
          useValue: mockAvailabilitySlotsService,
        },
        {
          provide: DermatologistsService,
          useValue: mockDermatologistsService,
        },
      ],
    }).compile();

    controller = module.get<AvailabilitySlotsController>(
      AvailabilitySlotsController,
    );
    availabilitySlotsService = module.get<AvailabilitySlotsService>(
      AvailabilitySlotsService,
    );
    dermatologistsService = module.get<DermatologistsService>(
      DermatologistsService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createSlots', () => {
    describe('Normal cases', () => {
      it('should create slots successfully', async () => {
        const now = new Date();
        const dto: CreateAvailabilityDto = {
          blocks: [
            {
              startTime: addDays(now, 1).toISOString(),
              endTime: addMinutes(addDays(now, 1), 120).toISOString(),
              slotDurationInMinutes: 60,
            },
          ],
        };

        const expectedResult = {
          message: 'Successfully created 2 new slots.',
        };

        mockDermatologistsService.findByUserId.mockResolvedValue(
          mockDermatologist,
        );
        mockAvailabilitySlotsService.createMySlots.mockResolvedValue(
          expectedResult,
        );

        const result = await controller.createSlots(mockUser, dto);

        expect(result.statusCode).toBe(201);
        expect(result.message).toBe(expectedResult.message);
        expect(dermatologistsService.findByUserId).toHaveBeenCalledWith(
          mockUser.userId,
        );
        expect(availabilitySlotsService.createMySlots).toHaveBeenCalledWith(
          mockDermatologist.dermatologistId,
          mockDermatologist.defaultSlotPrice,
          dto,
        );
      });

      it('should create slots with custom price', async () => {
        const now = new Date();
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

        mockDermatologistsService.findByUserId.mockResolvedValue(
          mockDermatologist,
        );
        mockAvailabilitySlotsService.createMySlots.mockResolvedValue({
          message: 'Successfully created 1 new slots.',
        });

        await controller.createSlots(mockUser, dto);

        expect(availabilitySlotsService.createMySlots).toHaveBeenCalled();
      });
    });
  });

  describe('getSlots', () => {
    describe('Normal cases', () => {
      it('should retrieve all slots without filters', async () => {
        const mockSlots = [
          {
            slotId: 'slot-1',
            status: SlotStatus.AVAILABLE,
            startTime: new Date(),
          },
          {
            slotId: 'slot-2',
            status: SlotStatus.BOOKED,
            startTime: addDays(new Date(), 1),
          },
        ];

        mockDermatologistsService.findByUserId.mockResolvedValue(
          mockDermatologist,
        );
        mockAvailabilitySlotsService.getMySlots.mockResolvedValue(mockSlots);

        const result = await controller.getSlots(mockUser);

        expect(result.statusCode).toBe(200);
        expect(result.data).toEqual(mockSlots);
        expect(availabilitySlotsService.getMySlots).toHaveBeenCalledWith(
          mockDermatologist.dermatologistId,
          undefined,
          undefined,
          undefined,
        );
      });

      it('should retrieve slots with date range filter', async () => {
        const startDate = new Date().toISOString();
        const endDate = addDays(new Date(), 7).toISOString();

        mockDermatologistsService.findByUserId.mockResolvedValue(
          mockDermatologist,
        );
        mockAvailabilitySlotsService.getMySlots.mockResolvedValue([]);

        await controller.getSlots(mockUser, startDate, endDate);

        expect(availabilitySlotsService.getMySlots).toHaveBeenCalledWith(
          mockDermatologist.dermatologistId,
          startDate,
          endDate,
          undefined,
        );
      });

      it('should retrieve slots with status filter', async () => {
        mockDermatologistsService.findByUserId.mockResolvedValue(
          mockDermatologist,
        );
        mockAvailabilitySlotsService.getMySlots.mockResolvedValue([]);

        await controller.getSlots(
          mockUser,
          undefined,
          undefined,
          SlotStatus.AVAILABLE,
        );

        expect(availabilitySlotsService.getMySlots).toHaveBeenCalledWith(
          mockDermatologist.dermatologistId,
          undefined,
          undefined,
          SlotStatus.AVAILABLE,
        );
      });

      it('should retrieve slots with all filters', async () => {
        const startDate = new Date().toISOString();
        const endDate = addDays(new Date(), 7).toISOString();

        mockDermatologistsService.findByUserId.mockResolvedValue(
          mockDermatologist,
        );
        mockAvailabilitySlotsService.getMySlots.mockResolvedValue([]);

        await controller.getSlots(
          mockUser,
          startDate,
          endDate,
          SlotStatus.AVAILABLE,
        );

        expect(availabilitySlotsService.getMySlots).toHaveBeenCalledWith(
          mockDermatologist.dermatologistId,
          startDate,
          endDate,
          SlotStatus.AVAILABLE,
        );
      });
    });
  });

  describe('cancelSlot', () => {
    const slotId = 'slot-123';

    describe('Normal cases', () => {
      it('should cancel a slot successfully', async () => {
        mockDermatologistsService.findByUserId.mockResolvedValue(
          mockDermatologist,
        );
        mockAvailabilitySlotsService.cancelMySlot.mockResolvedValue({
          message: 'Availability slot successfully cancelled.',
        });

        await controller.cancelSlot(mockUser, slotId);

        expect(dermatologistsService.findByUserId).toHaveBeenCalledWith(
          mockUser.userId,
        );
        expect(availabilitySlotsService.cancelMySlot).toHaveBeenCalledWith(
          mockDermatologist.dermatologistId,
          slotId,
        );
      });
    });

    describe('Abnormal cases', () => {
      it('should throw error when slot does not exist', async () => {
        mockDermatologistsService.findByUserId.mockResolvedValue(
          mockDermatologist,
        );
        mockAvailabilitySlotsService.cancelMySlot.mockRejectedValue(
          new Error('Slot not found'),
        );

        await expect(controller.cancelSlot(mockUser, slotId)).rejects.toThrow(
          'Slot not found',
        );
      });

      it('should throw error when dermatologist not found', async () => {
        mockDermatologistsService.findByUserId.mockRejectedValue(
          new Error('Dermatologist not found'),
        );

        await expect(controller.cancelSlot(mockUser, slotId)).rejects.toThrow(
          'Dermatologist not found',
        );
      });
    });
  });

  describe('Integration with DermatologistsService', () => {
    it('should retrieve dermatologist ID for all operations', async () => {
      const now = new Date();
      const dto: CreateAvailabilityDto = {
        blocks: [
          {
            startTime: addDays(now, 1).toISOString(),
            endTime: addMinutes(addDays(now, 1), 60).toISOString(),
            slotDurationInMinutes: 60,
          },
        ],
      };

      mockDermatologistsService.findByUserId.mockResolvedValue(
        mockDermatologist,
      );
      mockAvailabilitySlotsService.createMySlots.mockResolvedValue({
        message: 'Success',
      });
      mockAvailabilitySlotsService.getMySlots.mockResolvedValue([]);
      mockAvailabilitySlotsService.cancelMySlot.mockResolvedValue({
        message: 'Success',
      });

      // Test createSlots
      await controller.createSlots(mockUser, dto);
      expect(dermatologistsService.findByUserId).toHaveBeenCalledWith(
        mockUser.userId,
      );

      jest.clearAllMocks();
      mockDermatologistsService.findByUserId.mockResolvedValue(
        mockDermatologist,
      );

      // Test getSlots
      await controller.getSlots(mockUser);
      expect(dermatologistsService.findByUserId).toHaveBeenCalledWith(
        mockUser.userId,
      );

      jest.clearAllMocks();
      mockDermatologistsService.findByUserId.mockResolvedValue(
        mockDermatologist,
      );

      // Test cancelSlot
      await controller.cancelSlot(mockUser, 'slot-123');
      expect(dermatologistsService.findByUserId).toHaveBeenCalledWith(
        mockUser.userId,
      );
    });
  });
});
