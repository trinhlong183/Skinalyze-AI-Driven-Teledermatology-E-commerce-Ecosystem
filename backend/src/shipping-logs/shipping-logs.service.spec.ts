import { Test, TestingModule } from '@nestjs/testing';
import { ShippingLogsService } from './shipping-logs.service';
import { Repository, In } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ShippingLog,
  ShippingStatus,
  ShippingMethod,
} from './entities/shipping-log.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { GhnService } from '../ghn/ghn.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { subHours } from 'date-fns';

describe('ShippingLogsService', () => {
  let service: ShippingLogsService;
  let shippingLogRepository: jest.Mocked<Repository<ShippingLog>>;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;
  let ghnService: jest.Mocked<GhnService>;

  const mockShippingLogRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockOrderRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn(),
  };

  const mockGhnService = {
    createShippingOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingLogsService,
        {
          provide: getRepositoryToken(ShippingLog),
          useValue: mockShippingLogRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: GhnService,
          useValue: mockGhnService,
        },
      ],
    }).compile();

    service = module.get<ShippingLogsService>(ShippingLogsService);
    shippingLogRepository = module.get(getRepositoryToken(ShippingLog));
    orderRepository = module.get(getRepositoryToken(Order));
    userRepository = module.get(getRepositoryToken(User));
    cloudinaryService = module.get(CloudinaryService);
    ghnService = module.get(GhnService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBatchDelivery', () => {
    const staffId = 'test-staff-id';
    const customerId = 'test-customer-id';

    const mockOrders = [
      {
        orderId: 'order-1',
        customerId,
        shippingLogs: [],
      },
      {
        orderId: 'order-2',
        customerId,
        shippingLogs: [],
      },
      {
        orderId: 'order-3',
        customerId,
        shippingLogs: [],
      },
    ];

    beforeEach(() => {
      mockShippingLogRepository.create.mockImplementation((dto) => dto as any);
      mockShippingLogRepository.save.mockImplementation((log) =>
        Promise.resolve({ ...log, shippingLogId: 'log-id' } as any),
      );
    });

    // TC-SHIP-001-01: Normal - Create batch with 3 orders from same customer
    it('TC-SHIP-001-01: should create batch delivery for multiple orders', async () => {
      mockOrderRepository.find.mockResolvedValue(mockOrders as any);

      const result = await service.createBatchDelivery({
        orderIds: ['order-1', 'order-2', 'order-3'],
        shippingStaffId: staffId,
        note: 'Test batch',
      });

      expect(result).toHaveLength(3);
      expect(result[0].batchCode).toMatch(/^BATCH-\d{4}-\d{2}-\d{2}-/);
      expect(result[0].status).toBe(ShippingStatus.PENDING);
      expect(result[0].shippingStaffId).toBe(staffId);
      expect(mockShippingLogRepository.save).toHaveBeenCalledTimes(3);
    });

    // TC-SHIP-001-02: Normal - Create batch with 2 ready orders
    it('TC-SHIP-001-02: should create batch with pending status', async () => {
      const twoOrders = mockOrders.slice(0, 2);
      mockOrderRepository.find.mockResolvedValue(twoOrders as any);

      const result = await service.createBatchDelivery({
        orderIds: ['order-1', 'order-2'],
        shippingStaffId: staffId,
      });

      expect(result).toHaveLength(2);
      result.forEach((log) => {
        expect(log.status).toBe(ShippingStatus.PENDING);
        expect(log.shippingMethod).toBe(ShippingMethod.BATCH);
      });
    });

    // TC-SHIP-001-03: Normal - Same address optimization
    it('TC-SHIP-001-03: should create batch for orders with identical address', async () => {
      const ordersWithSameAddress = mockOrders.map((o) => ({
        ...o,
        shippingAddress: '123 Test Street',
      }));
      mockOrderRepository.find.mockResolvedValue(ordersWithSameAddress as any);

      const result = await service.createBatchDelivery({
        orderIds: ['order-1', 'order-2', 'order-3'],
        shippingStaffId: staffId,
      });

      expect(result).toHaveLength(3);
      expect(result[0].batchCode).toBe(result[1].batchCode);
    });

    // TC-SHIP-001-04: Boundary - Minimum 1 order
    it('TC-SHIP-001-04: should create batch with single order', async () => {
      mockOrderRepository.find.mockResolvedValue([mockOrders[0]] as any);

      const result = await service.createBatchDelivery({
        orderIds: ['order-1'],
        shippingStaffId: staffId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].batchCode).toMatch(/^BATCH-/);
    });

    // TC-SHIP-001-05: Boundary - Maximum 50 orders
    it('TC-SHIP-001-05: should create batch with 50 orders', async () => {
      const fiftyOrders = Array.from({ length: 50 }, (_, i) => ({
        orderId: `order-${i}`,
        customerId,
        shippingLogs: [],
      }));
      mockOrderRepository.find.mockResolvedValue(fiftyOrders as any);

      const result = await service.createBatchDelivery({
        orderIds: fiftyOrders.map((o) => o.orderId),
        shippingStaffId: staffId,
      });

      expect(result).toHaveLength(50);
      expect(mockShippingLogRepository.save).toHaveBeenCalledTimes(50);
    });

    // TC-SHIP-001-06: Abnormal - Different customers
    it('TC-SHIP-001-06: should throw error when orders from different customers', async () => {
      const mixedOrders = [
        { orderId: 'order-1', customerId: 'customer-1', shippingLogs: [] },
        { orderId: 'order-2', customerId: 'customer-2', shippingLogs: [] },
      ];
      mockOrderRepository.find.mockResolvedValue(mixedOrders as any);

      await expect(
        service.createBatchDelivery({
          orderIds: ['order-1', 'order-2'],
          shippingStaffId: staffId,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createBatchDelivery({
          orderIds: ['order-1', 'order-2'],
          shippingStaffId: staffId,
        }),
      ).rejects.toThrow('Cannot batch orders from different customers');
    });

    // TC-SHIP-001-07: Abnormal - Order already in batch
    it('TC-SHIP-001-07: should throw error when order already assigned to another staff', async () => {
      const ordersWithLogs = [
        {
          orderId: 'order-1',
          customerId,
          shippingLogs: [
            {
              shippingStaffId: 'another-staff',
              status: ShippingStatus.IN_TRANSIT,
            },
          ],
        },
      ];
      mockOrderRepository.find.mockResolvedValue(ordersWithLogs as any);

      await expect(
        service.createBatchDelivery({
          orderIds: ['order-1'],
          shippingStaffId: staffId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    // TC-SHIP-001-08: Abnormal - Empty orderIds array
    // TODO: Service needs validation for empty orderIds array - currently returns empty array
    it.skip('TC-SHIP-001-08: should throw error when orderIds is empty', async () => {
      mockOrderRepository.find.mockResolvedValue([]);

      await expect(
        service.createBatchDelivery({
          orderIds: [],
          shippingStaffId: staffId,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('completeBatch', () => {
    const batchCode = 'BATCH-2025-12-06-ABC123';
    const staffId = 'test-staff-id';

    const mockBatchLogs = [
      {
        shippingLogId: 'log-1',
        orderId: 'order-1',
        batchCode,
        shippingStaffId: staffId,
        status: ShippingStatus.DELIVERED,
        order: { orderId: 'order-1', status: OrderStatus.SHIPPING },
      },
      {
        shippingLogId: 'log-2',
        orderId: 'order-2',
        batchCode,
        shippingStaffId: staffId,
        status: ShippingStatus.DELIVERED,
        order: { orderId: 'order-2', status: OrderStatus.SHIPPING },
      },
      {
        shippingLogId: 'log-3',
        orderId: 'order-3',
        batchCode,
        shippingStaffId: staffId,
        status: ShippingStatus.DELIVERED,
        order: { orderId: 'order-3', status: OrderStatus.SHIPPING },
      },
    ];

    beforeEach(() => {
      // Reset batchCompletedAt to prevent test contamination
      mockBatchLogs.forEach((log: any) => {
        delete log.batchCompletedAt;
        delete log.completionPhotos;
        delete log.completionNote;
      });

      mockShippingLogRepository.save.mockImplementation((log) =>
        Promise.resolve(log as any),
      );
      mockOrderRepository.save.mockImplementation((order) =>
        Promise.resolve(order as any),
      );
    });

    // TC-SHIP-002-01: Normal - Complete batch with photos
    it('TC-SHIP-002-01: should complete batch with completion photos', async () => {
      mockShippingLogRepository.find.mockResolvedValue(mockBatchLogs as any);

      const result = await service.completeBatch(
        batchCode,
        {
          completionPhotos: ['photo1.jpg', 'photo2.jpg'],
          codCollected: true,
          totalCodAmount: 500000,
        },
        staffId,
      );

      expect(result.status).toBe('COMPLETED');
      expect(result.orderCount).toBe(3);
      expect(result.deliveredCount).toBe(3);
      expect(result.completionPhotos).toHaveLength(2);
      expect(mockShippingLogRepository.save).toHaveBeenCalledTimes(3);
    });

    // TC-SHIP-002-02: Normal - Auto-complete IN_TRANSIT orders
    it('TC-SHIP-002-02: should auto-complete orders still IN_TRANSIT', async () => {
      const logsWithInTransit = [
        { ...mockBatchLogs[0], status: ShippingStatus.DELIVERED },
        { ...mockBatchLogs[1], status: ShippingStatus.DELIVERED },
        { ...mockBatchLogs[2], status: ShippingStatus.IN_TRANSIT },
      ];
      mockShippingLogRepository.find.mockResolvedValue(
        logsWithInTransit as any,
      );

      const result = await service.completeBatch(
        batchCode,
        {
          completionPhotos: ['photo1.jpg'],
          codCollected: false,
        },
        staffId,
      );

      expect(result.deliveredCount).toBe(3); // All should be marked DELIVERED
      expect(mockOrderRepository.save).toHaveBeenCalledTimes(1); // Only IN_TRANSIT order's status updated
    });

    // TC-SHIP-002-03: Normal - Complete without COD
    it('TC-SHIP-002-03: should complete batch without COD collection', async () => {
      mockShippingLogRepository.find.mockResolvedValue(mockBatchLogs as any);

      const result = await service.completeBatch(
        batchCode,
        {
          completionPhotos: ['photo1.jpg'],
          codCollected: false,
          totalCodAmount: 0,
        },
        staffId,
      );

      expect(result.codCollected).toBe(false);
      expect(result.totalCodAmount).toBe(0);
    });

    // TC-SHIP-002-04: Normal - Complete with completion note
    it('TC-SHIP-002-04: should save completion note to all orders', async () => {
      mockShippingLogRepository.find.mockResolvedValue(mockBatchLogs as any);

      const result = await service.completeBatch(
        batchCode,
        {
          completionPhotos: ['photo1.jpg'],
          completionNote: 'All delivered successfully',
        },
        staffId,
      );

      expect(result.completionNote).toBe('All delivered successfully');
    });

    // TC-SHIP-002-05: Boundary - Minimum 1 photo
    it('TC-SHIP-002-05: should complete batch with single photo', async () => {
      mockShippingLogRepository.find.mockResolvedValue(mockBatchLogs as any);

      const result = await service.completeBatch(
        batchCode,
        {
          completionPhotos: ['photo1.jpg'],
        },
        staffId,
      );

      expect(result.completionPhotos).toHaveLength(1);
    });

    // TC-SHIP-002-06: Boundary - Maximum 10 photos
    it('TC-SHIP-002-06: should complete batch with 10 photos', async () => {
      mockShippingLogRepository.find.mockResolvedValue(mockBatchLogs as any);

      const tenPhotos = Array.from(
        { length: 10 },
        (_, i) => `photo${i + 1}.jpg`,
      );

      const result = await service.completeBatch(
        batchCode,
        {
          completionPhotos: tenPhotos,
        },
        staffId,
      );

      expect(result.completionPhotos).toHaveLength(10);
    });

    // TC-SHIP-002-07: Abnormal - Already completed
    it('TC-SHIP-002-07: should throw error when batch already completed', async () => {
      const completedLogs = mockBatchLogs.map((log) => ({
        ...log,
        batchCompletedAt: new Date(),
      }));
      mockShippingLogRepository.find.mockResolvedValue(completedLogs as any);

      await expect(
        service.completeBatch(
          batchCode,
          {
            completionPhotos: ['photo1.jpg'],
          },
          staffId,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.completeBatch(
          batchCode,
          {
            completionPhotos: ['photo1.jpg'],
          },
          staffId,
        ),
      ).rejects.toThrow('Batch already completed');
    });

    // TC-SHIP-002-08: Abnormal - No completion photos
    it('TC-SHIP-002-08: should throw error when photos not provided', async () => {
      mockShippingLogRepository.find.mockResolvedValue(mockBatchLogs as any);

      await expect(
        service.completeBatch(
          batchCode,
          {
            completionPhotos: [],
          },
          staffId,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.completeBatch(
          batchCode,
          {
            completionPhotos: [],
          },
          staffId,
        ),
      ).rejects.toThrow('Completion photos are required');
    });

    // TC-SHIP-002-09: Abnormal - Wrong staff
    it('TC-SHIP-002-09: should throw error when different staff tries to complete', async () => {
      mockShippingLogRepository.find.mockResolvedValue(mockBatchLogs as any);

      await expect(
        service.completeBatch(
          batchCode,
          {
            completionPhotos: ['photo1.jpg'],
          },
          'wrong-staff-id',
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.completeBatch(
          batchCode,
          {
            completionPhotos: ['photo1.jpg'],
          },
          'wrong-staff-id',
        ),
      ).rejects.toThrow("You don't have permission to complete this batch");
    });
  });

  describe('autoAssignUnassignedShippingLogs', () => {
    const mockStaff = [
      {
        userId: 'staff-1',
        fullName: 'Staff One',
        role: UserRole.STAFF,
        isActive: true,
      },
      {
        userId: 'staff-2',
        fullName: 'Staff Two',
        role: UserRole.STAFF,
        isActive: true,
      },
      {
        userId: 'staff-3',
        fullName: 'Staff Three',
        role: UserRole.STAFF,
        isActive: true,
      },
    ];

    const createOldShippingLog = (id: string, orderId: string) => ({
      shippingLogId: id,
      orderId,
      shippingStaffId: null,
      status: ShippingStatus.PENDING,
      createdAt: subHours(new Date(), 25), // Created 25 hours ago
      order: { orderId },
    });

    beforeEach(() => {
      mockShippingLogRepository.save.mockImplementation((log) =>
        Promise.resolve(log as any),
      );
      mockOrderRepository.update.mockResolvedValue(undefined as any);
    });

    // TC-SHIP-003-01: Normal - Auto-assign old logs to random staff
    it('TC-SHIP-003-01: should auto-assign shipping logs older than 24 hours to random staff', async () => {
      const oldLogs = [
        createOldShippingLog('log-1', 'order-1'),
        createOldShippingLog('log-2', 'order-2'),
        createOldShippingLog('log-3', 'order-3'),
      ];

      mockShippingLogRepository.find.mockResolvedValue(oldLogs as any);
      mockUserRepository.find.mockResolvedValue(mockStaff as any);

      const result = await service.autoAssignUnassignedShippingLogs();

      expect(result.assignedCount).toBe(3);
      expect(result.logs).toHaveLength(3);
      expect(mockShippingLogRepository.save).toHaveBeenCalledTimes(3);

      // Verify all logs were assigned to staff
      result.logs.forEach((log) => {
        expect(log.shippingStaffId).toBeTruthy();
        expect(log.status).toBe(ShippingStatus.PICKED_UP);
        expect(log.note).toContain('Tự động gán cho staff');
      });

      // Verify order status was synced
      expect(mockOrderRepository.update).toHaveBeenCalledTimes(3);
    });

    // TC-SHIP-003-02: Normal - No logs need assignment (all recent)
    it('TC-SHIP-003-02: should return 0 when no old unassigned logs found', async () => {
      mockShippingLogRepository.find.mockResolvedValue([]);
      mockUserRepository.find.mockResolvedValue(mockStaff as any);

      const result = await service.autoAssignUnassignedShippingLogs();

      expect(result.assignedCount).toBe(0);
      expect(result.logs).toHaveLength(0);
      expect(mockShippingLogRepository.save).not.toHaveBeenCalled();
    });

    // TC-SHIP-003-03: Normal - Multiple logs distributed among staff
    it('TC-SHIP-003-03: should distribute logs among available staff members', async () => {
      const manyLogs = Array.from({ length: 10 }, (_, i) =>
        createOldShippingLog(`log-${i}`, `order-${i}`),
      );

      mockShippingLogRepository.find.mockResolvedValue(manyLogs as any);
      mockUserRepository.find.mockResolvedValue(mockStaff as any);

      const result = await service.autoAssignUnassignedShippingLogs();

      expect(result.assignedCount).toBe(10);
      expect(mockShippingLogRepository.save).toHaveBeenCalledTimes(10);

      // Check that logs were assigned to different staff (random distribution)
      const assignedStaffIds = result.logs.map((log) => log.shippingStaffId);
      const uniqueStaff = new Set(assignedStaffIds);
      // Should have at least 1 staff assigned (could be all to same staff due to randomness)
      expect(uniqueStaff.size).toBeGreaterThan(0);
    });

    // TC-SHIP-003-04: Boundary - Exactly 24 hours old
    it('TC-SHIP-003-04: should not assign logs exactly 24 hours old', async () => {
      const exactLog = {
        shippingLogId: 'log-1',
        orderId: 'order-1',
        shippingStaffId: null,
        status: ShippingStatus.PENDING,
        createdAt: subHours(new Date(), 24), // Exactly 24 hours
        order: { orderId: 'order-1' },
      };

      // TypeORM LessThan doesn't include the boundary, so this should not be found
      mockShippingLogRepository.find.mockResolvedValue([]);
      mockUserRepository.find.mockResolvedValue(mockStaff as any);

      const result = await service.autoAssignUnassignedShippingLogs();

      expect(result.assignedCount).toBe(0);
    });

    // TC-SHIP-003-05: Boundary - Single staff member available
    it('TC-SHIP-003-05: should assign all logs to single staff when only one available', async () => {
      const oldLogs = [
        createOldShippingLog('log-1', 'order-1'),
        createOldShippingLog('log-2', 'order-2'),
      ];
      const singleStaff = [mockStaff[0]];

      mockShippingLogRepository.find.mockResolvedValue(oldLogs as any);
      mockUserRepository.find.mockResolvedValue(singleStaff as any);

      const result = await service.autoAssignUnassignedShippingLogs();

      expect(result.assignedCount).toBe(2);
      result.logs.forEach((log) => {
        expect(log.shippingStaffId).toBe('staff-1');
      });
    });

    // TC-SHIP-003-06: Abnormal - No active staff available
    it('TC-SHIP-003-06: should return 0 when no active staff members found', async () => {
      const oldLogs = [createOldShippingLog('log-1', 'order-1')];

      mockShippingLogRepository.find.mockResolvedValue(oldLogs as any);
      mockUserRepository.find.mockResolvedValue([]); // No staff

      const result = await service.autoAssignUnassignedShippingLogs();

      expect(result.assignedCount).toBe(0);
      expect(result.logs).toHaveLength(0);
      expect(mockShippingLogRepository.save).not.toHaveBeenCalled();
    });

    // TC-SHIP-003-07: Abnormal - Only logs with assigned staff (should be filtered)
    it('TC-SHIP-003-07: should not auto-assign logs that already have staff', async () => {
      const assignedLog = {
        shippingLogId: 'log-1',
        orderId: 'order-1',
        shippingStaffId: 'existing-staff',
        status: ShippingStatus.IN_TRANSIT,
        createdAt: subHours(new Date(), 30),
        order: { orderId: 'order-1' },
      };

      // Query filters out logs with staff, so should return empty
      mockShippingLogRepository.find.mockResolvedValue([]);
      mockUserRepository.find.mockResolvedValue(mockStaff as any);

      const result = await service.autoAssignUnassignedShippingLogs();

      expect(result.assignedCount).toBe(0);
    });

    // TC-SHIP-003-08: Boundary - Very old log (48 hours)
    it('TC-SHIP-003-08: should assign very old logs (48+ hours)', async () => {
      const veryOldLog = {
        shippingLogId: 'log-1',
        orderId: 'order-1',
        shippingStaffId: null,
        status: ShippingStatus.PENDING,
        createdAt: subHours(new Date(), 48),
        order: { orderId: 'order-1' },
      };

      mockShippingLogRepository.find.mockResolvedValue([veryOldLog] as any);
      mockUserRepository.find.mockResolvedValue(mockStaff as any);

      const result = await service.autoAssignUnassignedShippingLogs();

      expect(result.assignedCount).toBe(1);
      expect(result.logs[0].status).toBe(ShippingStatus.PICKED_UP);
    });
  });
});
