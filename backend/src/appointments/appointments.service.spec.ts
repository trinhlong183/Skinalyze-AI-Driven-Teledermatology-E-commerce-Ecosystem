import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { Repository, EntityManager } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { CustomersService } from '../customers/customers.service';
import { DermatologistsService } from '../dermatologists/dermatologists.service';
import { AvailabilitySlotsService } from '../availability-slots/availability-slots.service';
import { PaymentsService } from '../payments/payments.service';
import { GoogleMeetService } from '../google-meet/google-meet.service';
import { CustomerSubscriptionService } from '../customer-subscription/customer-subscription.service';
import { UsersService } from '../users/users.service';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AppointmentStatus, TerminationReason } from './types/appointment.types';
import { UserRole } from '../users/entities/user.entity';
import { PaymentMethod, PaymentStatus, PaymentType } from '../payments/entities/payment.entity';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let appointmentRepository: jest.Mocked<Repository<Appointment>>;
  let customersService: jest.Mocked<CustomersService>;
  let dermatologistsService: jest.Mocked<DermatologistsService>;
  let availabilitySlotsService: jest.Mocked<AvailabilitySlotsService>;
  let paymentsService: jest.Mocked<PaymentsService>;
  let googleMeetService: jest.Mocked<GoogleMeetService>;
  let entityManager: jest.Mocked<EntityManager>;
  let customerSubscriptionService: jest.Mocked<CustomerSubscriptionService>;
  let usersService: jest.Mocked<UsersService>;

  // ==================== MOCK SETUP ====================
  const mockAppointmentRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockCustomersService = {
    findByUserId: jest.fn(),
  };

  const mockDermatologistsService = {
    findByUserId: jest.fn(),
  };

  const mockAvailabilitySlotsService = {
    reserveSlot: jest.fn(),
    linkSlotToAppointment: jest.fn(),
    releaseSlot: jest.fn(),
  };

  const mockPaymentsService = {
    createPayment: jest.fn(),
  };

  const mockGoogleMeetService = {
    createMeetLinkFromDates: jest.fn(),
  };

  const mockCustomerSubscriptionService = {
    useSession: jest.fn(),
    refundSession: jest.fn(),
  };

  const mockUsersService = {
    updateBalance: jest.fn(),
  };

  const mockEntityManager = {
    transaction: jest.fn((callback) => callback(mockEntityManager)),
    getRepository: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  // ==================== TEST DATA ====================
  const mockCustomer = {
    customerId: 'customer-uuid-1',
    user: { userId: 'user-uuid-1' },
  };

  const mockDermatologist = {
    dermatologistId: 'derma-uuid-1',
    user: { userId: 'derma-user-uuid-1' },
  };

  const mockSlot = {
    slotId: 'slot-uuid-1',
    price: 300000,
    startTime: new Date('2025-12-10T10:00:00Z'),
    endTime: new Date('2025-12-10T11:00:00Z'),
    dermatologist: mockDermatologist,
  };

  const mockPayment = {
    paymentId: 'payment-uuid-1',
    paymentCode: 'SKB20251210001',
    amount: 300000,
    paymentMethod: PaymentMethod.BANKING,
    paymentType: PaymentType.BOOKING,
    status: PaymentStatus.PENDING,
    expiredAt: new Date('2025-12-10T10:05:00Z'),
  };

  const mockAppointment = {
    appointmentId: 'appt-uuid-1',
    appointmentStatus: AppointmentStatus.PENDING_PAYMENT,
    startTime: mockSlot.startTime,
    endTime: mockSlot.endTime,
    price: 300000,
    customer: mockCustomer,
    dermatologist: mockDermatologist,
    payment: mockPayment,
    availabilitySlot: mockSlot,
  };

  // ==================== BEFORE EACH ====================
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: mockAppointmentRepository,
        },
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
        {
          provide: DermatologistsService,
          useValue: mockDermatologistsService,
        },
        {
          provide: AvailabilitySlotsService,
          useValue: mockAvailabilitySlotsService,
        },
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: GoogleMeetService,
          useValue: mockGoogleMeetService,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
        {
          provide: CustomerSubscriptionService,
          useValue: mockCustomerSubscriptionService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    appointmentRepository = module.get(getRepositoryToken(Appointment));
    customersService = module.get(CustomersService);
    dermatologistsService = module.get(DermatologistsService);
    availabilitySlotsService = module.get(AvailabilitySlotsService);
    paymentsService = module.get(PaymentsService);
    googleMeetService = module.get(GoogleMeetService);
    entityManager = module.get(EntityManager);
    customerSubscriptionService = module.get(CustomerSubscriptionService);
    usersService = module.get(UsersService);
  });

  // ==================== AFTER EACH ====================
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== BASIC TEST ====================
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== PART 1: BOOKING PHASE TESTS ====================
  describe('createReservation (Banking Payment)', () => {
    const createDto: any = {
      dermatologistId: 'derma-uuid-1',
      startTime: '2025-12-10T10:00:00Z',
      endTime: '2025-12-10T11:00:00Z',
      analysisId: 'analysis-uuid-1',
      appointmentType: 'NEW_PROBLEM' as any,
      note: 'Test booking',
    };

    const mockSkinAnalysis = { analysisId: 'analysis-uuid-1' };

    beforeEach(() => {
      mockCustomersService.findByUserId.mockResolvedValue(mockCustomer as any);
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockSkinAnalysis),
        create: jest.fn().mockReturnValue(mockAppointment),
        save: jest.fn().mockResolvedValue(mockAppointment),
      } as any);
      mockAvailabilitySlotsService.reserveSlot.mockResolvedValue(mockSlot as any);
      mockPaymentsService.createPayment.mockResolvedValue(mockPayment as any);
      mockAvailabilitySlotsService.linkSlotToAppointment.mockResolvedValue(undefined);
    });

    // TC-APPT-001-01: Normal case
    it('TC-APPT-001-01: should create reservation with QR code when valid data', async () => {
      // Act
      const result = await service.createReservation('user-uuid-1', createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.appointmentId).toBe('appt-uuid-1');
      expect(result.paymentCode).toBe('SKB20251210001');
      expect(result.paymentMethod).toBe(PaymentMethod.BANKING);
      expect(result.bankingInfo).toBeDefined();
      expect(result.bankingInfo.qrCodeUrl).toContain('vietqr.io');
      expect(mockCustomersService.findByUserId).toHaveBeenCalledWith('user-uuid-1');
      expect(mockAvailabilitySlotsService.reserveSlot).toHaveBeenCalled();
      expect(mockPaymentsService.createPayment).toHaveBeenCalled();
    });

    // TC-APPT-001-02: Normal case - Return banking info
    it('TC-APPT-001-02: should return correct banking information', async () => {
      // Act
      const result = await service.createReservation('user-uuid-1', createDto);

      // Assert
      expect(result.bankingInfo.bankName).toBe('MBBank');
      expect(result.bankingInfo.accountNumber).toBe('0347178790');
      expect(result.bankingInfo.accountName).toBe('CHU PHAN NHAT LONG');
      expect(result.bankingInfo.amount).toBe(300000);
    });

    // TC-APPT-001-03: Abnormal case - Invalid skin analysis
    it('TC-APPT-001-03: should throw error when skin analysis not found', async () => {
      // Arrange
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      } as any);

      // Act & Assert
      await expect(
        service.createReservation('user-uuid-1', createDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createReservation('user-uuid-1', createDto),
      ).rejects.toThrow('Invalid or non-existent SkinAnalysis ID');
    });

    // TC-APPT-001-04: Abnormal case - Customer not found
    it('TC-APPT-001-04: should throw error when customer not found', async () => {
      // Arrange
      mockCustomersService.findByUserId.mockRejectedValue(
        new NotFoundException('Customer not found'),
      );

      // Act & Assert
      await expect(
        service.createReservation('invalid-user-id', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    // TC-APPT-001-05: Abnormal case - Slot not available
    it('TC-APPT-001-05: should throw error when slot is not available', async () => {
      // Arrange
      mockAvailabilitySlotsService.reserveSlot.mockRejectedValue(
        new BadRequestException('Slot is no longer available'),
      );

      // Act & Assert
      await expect(
        service.createReservation('user-uuid-1', createDto),
      ).rejects.toThrow('Slot is no longer available');
    });
  });

  describe('createWalletAppointment (Wallet Payment)', () => {
    const createDto: any = {
      dermatologistId: 'derma-uuid-1',
      startTime: '2025-12-10T10:00:00Z',
      endTime: '2025-12-10T11:00:00Z',
      analysisId: 'analysis-uuid-1',
      appointmentType: 'NEW_PROBLEM' as any,
    };

    const mockSkinAnalysis = { analysisId: 'analysis-uuid-1' };
    const mockScheduledAppointment = {
      ...mockAppointment,
      appointmentStatus: AppointmentStatus.SCHEDULED,
    };

    beforeEach(() => {
      mockCustomersService.findByUserId.mockResolvedValue(mockCustomer as any);
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockSkinAnalysis),
        create: jest.fn().mockReturnValue(mockScheduledAppointment),
        save: jest.fn().mockResolvedValue(mockScheduledAppointment),
      } as any);
      mockAvailabilitySlotsService.reserveSlot.mockResolvedValue(mockSlot as any);
      mockUsersService.updateBalance.mockResolvedValue(undefined);
      mockAvailabilitySlotsService.linkSlotToAppointment.mockResolvedValue(undefined);
    });

    // TC-APPT-002-01: Normal case
    it('TC-APPT-002-01: should create appointment with wallet when balance sufficient', async () => {
      // Act
      const result = await service.createWalletAppointment('user-uuid-1', createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.appointmentStatus).toBe(AppointmentStatus.SCHEDULED);
      expect(mockUsersService.updateBalance).toHaveBeenCalledWith(
        'user-uuid-1',
        -300000,
        mockEntityManager,
      );
    });

    // TC-APPT-002-02: Abnormal case - Insufficient balance
    it('TC-APPT-002-02: should throw error when wallet balance insufficient', async () => {
      // Arrange
      mockUsersService.updateBalance.mockRejectedValue(
        new BadRequestException('Insufficient wallet balance'),
      );

      // Act & Assert
      await expect(
        service.createWalletAppointment('user-uuid-1', createDto),
      ).rejects.toThrow('Insufficient wallet balance');
    });

    // TC-APPT-002-03: Normal case - Immediate confirmation
    it('TC-APPT-002-03: should auto-confirm appointment when using wallet', async () => {
      // Act
      const result = await service.createWalletAppointment('user-uuid-1', createDto);

      // Assert
      expect(result.appointmentStatus).toBe(AppointmentStatus.SCHEDULED);
      expect(result.payment).toBeDefined();
    });
  });

  describe('createSubscriptionAppointment (Subscription Payment)', () => {
    const createDto: any = {
      dermatologistId: 'derma-uuid-1',
      startTime: '2025-12-10T10:00:00Z',
      endTime: '2025-12-10T11:00:00Z',
      analysisId: 'analysis-uuid-1',
      appointmentType: 'NEW_PROBLEM' as any,
      customerSubscriptionId: 'sub-uuid-1',
    };

    const mockSubscription = { id: 'sub-uuid-1', remainingSessions: 5 };
    const mockSkinAnalysis = { analysisId: 'analysis-uuid-1' };
    const mockScheduledAppointment = {
      ...mockAppointment,
      appointmentStatus: AppointmentStatus.SCHEDULED,
      price: 0,
      customerSubscription: mockSubscription,
    };

    beforeEach(() => {
      mockCustomersService.findByUserId.mockResolvedValue(mockCustomer as any);
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockSkinAnalysis),
        create: jest.fn().mockReturnValue(mockScheduledAppointment),
        save: jest.fn().mockResolvedValue(mockScheduledAppointment),
      } as any);
      mockAvailabilitySlotsService.reserveSlot.mockResolvedValue(mockSlot as any);
      mockCustomerSubscriptionService.useSession.mockResolvedValue(mockSubscription as any);
      mockAvailabilitySlotsService.linkSlotToAppointment.mockResolvedValue(undefined);
    });

    // TC-APPT-003-01: Normal case
    it('TC-APPT-003-01: should create appointment using subscription', async () => {
      // Act
      const result = await service.createSubscriptionAppointment('user-uuid-1', createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.appointmentStatus).toBe(AppointmentStatus.SCHEDULED);
      expect(result.price).toBe(0);
      expect(mockCustomerSubscriptionService.useSession).toHaveBeenCalledWith(
        'sub-uuid-1',
        'customer-uuid-1',
        mockEntityManager,
      );
    });

    // TC-APPT-003-02: Abnormal case - No sessions remaining
    it('TC-APPT-003-02: should throw error when subscription has no sessions', async () => {
      // Arrange
      mockCustomerSubscriptionService.useSession.mockRejectedValue(
        new BadRequestException('No sessions remaining'),
      );

      // Act & Assert
      await expect(
        service.createSubscriptionAppointment('user-uuid-1', createDto),
      ).rejects.toThrow('No sessions remaining');
    });
  });

  // ==================== PART 2: SESSION PHASE TESTS ====================
  describe('recordCheckIn', () => {
    const scheduledAppointment = {
      appointmentId: 'appt-uuid-1',
      appointmentStatus: AppointmentStatus.SCHEDULED,
      startTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      customer: {
        user: { userId: 'customer-user-uuid-1' },
      },
      dermatologist: {
        user: { userId: 'derma-user-uuid-1' },
      },
      customerJoinedAt: null,
      dermatologistJoinedAt: null,
    };

    beforeEach(() => {
      mockAppointmentRepository.findOne.mockResolvedValue(scheduledAppointment as any);
      mockAppointmentRepository.save.mockResolvedValue(scheduledAppointment as any);
    });

    // TC-APPT-004-01: Normal case - Customer check-in
    it('TC-APPT-004-01: should record customer check-in successfully', async () => {
      // Act
      await service.recordCheckIn('appt-uuid-1', 'customer-user-uuid-1', UserRole.CUSTOMER);

      // Assert
      expect(mockAppointmentRepository.findOne).toHaveBeenCalledWith({
        where: { appointmentId: 'appt-uuid-1' },
        relations: expect.any(Array),
      });
      expect(mockAppointmentRepository.save).toHaveBeenCalled();
    });

    // TC-APPT-004-02: Normal case - Dermatologist check-in
    it('TC-APPT-004-02: should record dermatologist check-in successfully', async () => {
      // Act
      await service.recordCheckIn('appt-uuid-1', 'derma-user-uuid-1', UserRole.DERMATOLOGIST);

      // Assert
      expect(mockAppointmentRepository.save).toHaveBeenCalled();
    });

    // TC-APPT-004-03: Normal case - Status changes to IN_PROGRESS
    it('TC-APPT-004-03: should change status to IN_PROGRESS on first check-in', async () => {
      // Arrange
      const savedAppointment = {
        ...scheduledAppointment,
        appointmentStatus: AppointmentStatus.IN_PROGRESS,
        customerJoinedAt: new Date(),
      };
      mockAppointmentRepository.save.mockResolvedValue(savedAppointment as any);

      // Act
      await service.recordCheckIn('appt-uuid-1', 'customer-user-uuid-1', UserRole.CUSTOMER);

      // Assert
      expect(mockAppointmentRepository.save).toHaveBeenCalled();
    });

    // TC-APPT-004-04: Abnormal case - Appointment not found
    it('TC-APPT-004-04: should throw error when appointment not found', async () => {
      // Arrange
      mockAppointmentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.recordCheckIn('invalid-id', 'user-uuid-1', UserRole.CUSTOMER),
      ).rejects.toThrow(NotFoundException);
    });

    // TC-APPT-004-05: Abnormal case - Wrong user
    it('TC-APPT-004-05: should throw error when user does not own appointment', async () => {
      // Act & Assert
      await expect(
        service.recordCheckIn('appt-uuid-1', 'wrong-user-uuid', UserRole.CUSTOMER),
      ).rejects.toThrow(ForbiddenException);
    });

    // TC-APPT-004-06: Abnormal case - Too early to check-in
    it('TC-APPT-004-06: should throw error when checking in too early', async () => {
      // Arrange
      const futureAppointment = {
        ...scheduledAppointment,
        startTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now (more than 10 min window)
      };
      mockAppointmentRepository.findOne.mockResolvedValue(futureAppointment as any);

      // Act & Assert
      await expect(
        service.recordCheckIn('appt-uuid-1', 'customer-user-uuid-1', UserRole.CUSTOMER),
      ).rejects.toThrow('Too early to check-in');
    });

    // TC-APPT-004-07: Boundary case - Check-in exactly 10 minutes before
    it('TC-APPT-004-07: should allow check-in exactly 10 minutes before start', async () => {
      // Arrange
      const boundaryAppointment = {
        ...scheduledAppointment,
        startTime: new Date(Date.now() + 10 * 60 * 1000), // Exactly 10 minutes from now
      };
      mockAppointmentRepository.findOne.mockResolvedValue(boundaryAppointment as any);

      // Act
      await service.recordCheckIn('appt-uuid-1', 'customer-user-uuid-1', UserRole.CUSTOMER);

      // Assert
      expect(mockAppointmentRepository.save).toHaveBeenCalled();
    });
  });

  describe('completeAppointment', () => {
    const inProgressAppointment = {
      appointmentId: 'appt-uuid-1',
      appointmentStatus: AppointmentStatus.IN_PROGRESS,
      customerJoinedAt: new Date(),
      dermatologistJoinedAt: new Date(),
      dermatologist: {
        dermatologistId: 'derma-uuid-1',
      },
    };

    beforeEach(() => {
      mockDermatologistsService.findByUserId.mockResolvedValue(mockDermatologist as any);
      mockAppointmentRepository.findOne.mockResolvedValue(inProgressAppointment as any);
      mockAppointmentRepository.save.mockResolvedValue({
        ...inProgressAppointment,
        appointmentStatus: AppointmentStatus.COMPLETED,
      } as any);
    });

    // TC-APPT-005-01: Normal case
    it('TC-APPT-005-01: should complete appointment when valid', async () => {
      // Act
      const result = await service.completeAppointment('derma-user-uuid-1', 'appt-uuid-1', {
        medicalNote: 'Session completed successfully',
      });

      // Assert
      expect(result.appointmentStatus).toBe(AppointmentStatus.COMPLETED);
      expect(mockAppointmentRepository.save).toHaveBeenCalled();
    });

    // TC-APPT-005-02: Abnormal case - Not IN_PROGRESS
    it('TC-APPT-005-02: should throw error when appointment not IN_PROGRESS', async () => {
      // Arrange
      mockAppointmentRepository.findOne.mockResolvedValue({
        ...inProgressAppointment,
        appointmentStatus: AppointmentStatus.SCHEDULED,
      } as any);

      // Act & Assert
      await expect(
        service.completeAppointment('derma-user-uuid-1', 'appt-uuid-1', {
          medicalNote: 'Test note',
        }),
      ).rejects.toThrow('Appointment is not in a state to be completed');
    });

    // TC-APPT-005-03: Abnormal case - Customer not joined
    it('TC-APPT-005-03: should throw error when customer has not joined', async () => {
      // Arrange
      mockAppointmentRepository.findOne.mockResolvedValue({
        ...inProgressAppointment,
        customerJoinedAt: null,
      } as any);

      // Act & Assert
      await expect(
        service.completeAppointment('derma-user-uuid-1', 'appt-uuid-1', {
          medicalNote: 'Test note',
        }),
      ).rejects.toThrow('Customer has not joined the appointment');
    });

    // TC-APPT-005-04: Abnormal case - Not owned by dermatologist
    it('TC-APPT-005-04: should throw error when dermatologist does not own appointment', async () => {
      // Arrange
      mockAppointmentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.completeAppointment('derma-user-uuid-1', 'appt-uuid-1', {
          medicalNote: 'Test note',
        }),
      ).rejects.toThrow('Appointment not found or you do not own it');
    });
  });

  describe('reportCustomerNoShow (Dermatologist reports)', () => {
    const inProgressAppointment = {
      appointmentId: 'appt-uuid-1',
      appointmentStatus: AppointmentStatus.IN_PROGRESS,
      startTime: new Date(Date.now() - 20 * 60 * 1000), // Started 20 minutes ago
      customerJoinedAt: null,
      dermatologistJoinedAt: new Date(),
      customer: {
        customerId: 'customer-uuid-1',
      },
      dermatologist: {
        dermatologistId: 'derma-uuid-1',
      },
    };

    beforeEach(() => {
      mockDermatologistsService.findByUserId.mockResolvedValue(mockDermatologist as any);
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(inProgressAppointment),
        save: jest.fn().mockResolvedValue({
          ...inProgressAppointment,
          appointmentStatus: AppointmentStatus.NO_SHOW,
          terminatedReason: TerminationReason.CUSTOMER_NO_SHOW,
        }),
      } as any);
    });

    // TC-APPT-006-01: Normal case - Customer did not join
    it('TC-APPT-006-01: should mark as NO_SHOW when customer did not join', async () => {
      // Act
      const result = await service.reportCustomerNoShow('derma-user-uuid-1', 'appt-uuid-1', {
        note: 'Customer did not join after 15 minutes',
      });

      // Assert
      expect(result.message).toContain('No-Show');
    });

    // TC-APPT-006-02: Abnormal case - Before grace period
    it('TC-APPT-006-02: should throw error when reporting before grace period ends', async () => {
      // Arrange
      const recentAppointment = {
        ...inProgressAppointment,
        startTime: new Date(Date.now() - 5 * 60 * 1000), // Started only 5 minutes ago
      };
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(recentAppointment),
      } as any);

      // Act & Assert
      await expect(
        service.reportCustomerNoShow('derma-user-uuid-1', 'appt-uuid-1', {}),
      ).rejects.toThrow('Please wait until Grace Period');
    });

    // TC-APPT-006-03: Abnormal case - Customer has joined (Dispute)
    it('TC-APPT-006-03: should create dispute when customer has check-in record', async () => {
      // Arrange
      const joinedAppointment = {
        ...inProgressAppointment,
        customerJoinedAt: new Date(),
      };
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(joinedAppointment),
        save: jest.fn().mockResolvedValue({
          ...joinedAppointment,
          appointmentStatus: AppointmentStatus.DISPUTED,
        }),
      } as any);

      // Act
      const result = await service.reportCustomerNoShow('derma-user-uuid-1', 'appt-uuid-1', {});

      // Assert
      expect(result.message).toContain('Admin will review');
    });
  });

  describe('reportDoctorNoShow (Customer reports)', () => {
    const inProgressAppointment = {
      appointmentId: 'appt-uuid-1',
      appointmentStatus: AppointmentStatus.IN_PROGRESS,
      startTime: new Date(Date.now() - 20 * 60 * 1000),
      customerJoinedAt: new Date(),
      dermatologistJoinedAt: null,
      payment: { amount: 300000 },
      customer: {
        customerId: 'customer-uuid-1',
        user: { userId: 'customer-user-uuid-1' },
      },
      dermatologist: {
        dermatologistId: 'derma-uuid-1',
      },
    };

    beforeEach(() => {
      mockCustomersService.findByUserId.mockResolvedValue(mockCustomer as any);
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(inProgressAppointment),
        save: jest.fn().mockResolvedValue({
          ...inProgressAppointment,
          appointmentStatus: AppointmentStatus.NO_SHOW,
        }),
      } as any);
      mockUsersService.updateBalance.mockResolvedValue(undefined);
    });

    // TC-APPT-007-01: Normal case - Doctor did not join, refund issued
    it('TC-APPT-007-01: should refund customer when doctor did not join', async () => {
      // Act
      const result = await service.reportDoctorNoShow('customer-user-uuid-1', 'appt-uuid-1', {});

      // Assert
      expect(result.message).toContain('Refund processed');
      expect(mockUsersService.updateBalance).toHaveBeenCalledWith(
        'customer-user-uuid-1',
        300000,
        mockEntityManager,
      );
    });

    // TC-APPT-007-02: Abnormal case - Doctor has joined (Dispute)
    it('TC-APPT-007-02: should create dispute when doctor has check-in record', async () => {
      // Arrange
      const joinedAppointment = {
        ...inProgressAppointment,
        dermatologistJoinedAt: new Date(),
      };
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(joinedAppointment),
        save: jest.fn().mockResolvedValue({
          ...joinedAppointment,
          appointmentStatus: AppointmentStatus.DISPUTED,
        }),
      } as any);

      // Act
      const result = await service.reportDoctorNoShow('customer-user-uuid-1', 'appt-uuid-1', {});

      // Assert
      expect(result.message).toContain('Admin will review');
    });

    // TC-APPT-007-03: Abnormal case - Customer did not check-in first
    it('TC-APPT-007-03: should throw error when customer did not check-in', async () => {
      // Arrange
      const noCheckInAppointment = {
        ...inProgressAppointment,
        customerJoinedAt: null,
      };
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(noCheckInAppointment),
      } as any);

      // Act & Assert
      await expect(
        service.reportDoctorNoShow('customer-user-uuid-1', 'appt-uuid-1', {}),
      ).rejects.toThrow('You must check-in first');
    });
  });

  describe('interruptAppointment', () => {
    const inProgressAppointment = {
      appointmentId: 'appt-uuid-1',
      appointmentStatus: AppointmentStatus.IN_PROGRESS,
      endTime: new Date(),
      customer: {
        user: { userId: 'customer-user-uuid-1' },
      },
      dermatologist: {
        user: { userId: 'derma-user-uuid-1' },
      },
      customerReportReason: null,
      dermatologistReportReason: null,
    };

    beforeEach(() => {
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(inProgressAppointment),
        save: jest.fn().mockResolvedValue({
          ...inProgressAppointment,
          appointmentStatus: AppointmentStatus.INTERRUPTED,
        }),
      } as any);
    });

    // TC-APPT-008-01: Normal case - Customer reports technical issue
    it('TC-APPT-008-01: should record interruption when customer reports issue', async () => {
      // Act
      const result = await service.interruptAppointment(
        'customer-user-uuid-1',
        UserRole.CUSTOMER,
        'appt-uuid-1',
        {
          reason: TerminationReason.CUSTOMER_ISSUE,
          terminationNote: 'Connection lost',
        },
      );

      // Assert
      expect(result.message).toContain('Interruption recorded');
      expect(result.refundTriggered).toBe(false);
    });

    // TC-APPT-008-02: Normal case - Doctor admits fault, auto-refund
    it('TC-APPT-008-02: should auto-refund when doctor admits fault', async () => {
      // Arrange
      const appointmentWithPayment = {
        ...inProgressAppointment,
        payment: { amount: 300000 },
        customer: {
          user: { userId: 'customer-user-uuid-1' },
        },
      };
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(appointmentWithPayment),
        save: jest.fn().mockResolvedValue({
          ...appointmentWithPayment,
          appointmentStatus: AppointmentStatus.CANCELLED,
        }),
      } as any);
      mockUsersService.updateBalance.mockResolvedValue(undefined);

      // Act
      const result = await service.interruptAppointment(
        'derma-user-uuid-1',
        UserRole.DERMATOLOGIST,
        'appt-uuid-1',
        {
          reason: TerminationReason.DOCTOR_ISSUE,
          terminationNote: 'My equipment failed',
        },
      );

      // Assert
      expect(result.message).toContain('Refunded to customer');
      expect(result.refundTriggered).toBe(true);
    });

    // TC-APPT-008-03: Abnormal case - Already reported
    it('TC-APPT-008-03: should throw error when already submitted report', async () => {
      // Arrange
      const reportedAppointment = {
        ...inProgressAppointment,
        customerReportReason: TerminationReason.CUSTOMER_ISSUE,
      };
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(reportedAppointment),
      } as any);

      // Act & Assert
      await expect(
        service.interruptAppointment(
          'customer-user-uuid-1',
          UserRole.CUSTOMER,
          'appt-uuid-1',
          { reason: TerminationReason.CUSTOMER_ISSUE },
        ),
      ).rejects.toThrow('You have already submitted a report');
    });

    // TC-APPT-008-04: Normal case - Report on completed appointment (Dispute)
    it('TC-APPT-008-04: should create dispute when reporting on completed appointment', async () => {
      // Arrange
      const completedAppointment = {
        ...inProgressAppointment,
        appointmentStatus: AppointmentStatus.COMPLETED,
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(completedAppointment),
        save: jest.fn().mockResolvedValue({
          ...completedAppointment,
          appointmentStatus: AppointmentStatus.DISPUTED,
        }),
      } as any);

      // Act
      const result = await service.interruptAppointment(
        'customer-user-uuid-1',
        UserRole.CUSTOMER,
        'appt-uuid-1',
        { reason: TerminationReason.CUSTOMER_ISSUE },
      );

      // Assert
      expect(result.message).toContain('Dispute raised');
    });

    // TC-APPT-008-05: Boundary case - Report window expired
    it('TC-APPT-008-05: should throw error when report window expired', async () => {
      // Arrange
      const oldAppointment = {
        ...inProgressAppointment,
        appointmentStatus: AppointmentStatus.COMPLETED,
        endTime: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago (> 24h limit)
      };
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(oldAppointment),
      } as any);

      // Act & Assert
      await expect(
        service.interruptAppointment(
          'customer-user-uuid-1',
          UserRole.CUSTOMER,
          'appt-uuid-1',
          { reason: TerminationReason.CUSTOMER_ISSUE },
        ),
      ).rejects.toThrow('Report window');
    });
  });

  // ==================== PART 3: CANCELLATION TESTS ====================
  describe('cancelMyAppointment (Customer cancellation)', () => {
    const scheduledAppointment = {
      appointmentId: 'appt-uuid-1',
      appointmentStatus: AppointmentStatus.SCHEDULED,
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      payment: { amount: 300000 },
      customer: {
        customerId: 'customer-uuid-1',
        user: { userId: 'customer-user-uuid-1' },
      },
      availabilitySlot: { slotId: 'slot-uuid-1' },
    };

    beforeEach(() => {
      mockCustomersService.findByUserId.mockResolvedValue(mockCustomer as any);
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(scheduledAppointment),
        save: jest.fn().mockResolvedValue({
          ...scheduledAppointment,
          appointmentStatus: AppointmentStatus.CANCELLED,
        }),
      } as any);
      mockUsersService.updateBalance.mockResolvedValue(undefined);
      mockAvailabilitySlotsService.releaseSlot.mockResolvedValue(undefined);
    });

    // TC-APPT-009-01: Normal case - Early cancellation (>24h), full refund
    it('TC-APPT-009-01: should refund 100% when cancelling more than 24h in advance', async () => {
      // Act
      const result = await service.cancelMyAppointment('customer-user-uuid-1', 'appt-uuid-1');

      // Assert
      expect(mockUsersService.updateBalance).toHaveBeenCalledWith(
        'customer-user-uuid-1',
        300000,
        mockEntityManager,
      );
    });

    // TC-APPT-009-02: Boundary case - Late cancellation (<24h), no refund
    it('TC-APPT-009-02: should not refund when cancelling less than 24h in advance', async () => {
      // Arrange
      const lateAppointment = {
        ...scheduledAppointment,
        startTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
        dermatologist: {
          user: { userId: 'derma-user-uuid-1' },
        },
      };
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(lateAppointment),
        save: jest.fn().mockResolvedValue({
          ...lateAppointment,
          appointmentStatus: AppointmentStatus.CANCELLED,
        }),
      } as any);

      // Act
      await service.cancelMyAppointment('customer-user-uuid-1', 'appt-uuid-1');

      // Assert - updateBalance called for doctor, not customer (late cancel compensation)
      expect(mockUsersService.updateBalance).toHaveBeenCalled();
    });

    // TC-APPT-009-03: Abnormal case - Cannot cancel non-SCHEDULED appointment
    it('TC-APPT-009-03: should throw error when appointment is not SCHEDULED', async () => {
      // Arrange
      const inProgressAppointment = {
        ...scheduledAppointment,
        appointmentStatus: AppointmentStatus.IN_PROGRESS,
      };
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(inProgressAppointment),
      } as any);

      // Act & Assert
      await expect(
        service.cancelMyAppointment('customer-user-uuid-1', 'appt-uuid-1'),
      ).rejects.toThrow('Cannot cancel an appointment with status');
    });

    // TC-APPT-009-04: Boundary case - Exactly 24 hours before
    it('TC-APPT-009-04: should refund when cancelling exactly 24h 1 minute before', async () => {
      // Arrange
      const boundaryAppointment = {
        ...scheduledAppointment,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 1000), // 24h 1min from now
      };
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(boundaryAppointment),
        save: jest.fn().mockResolvedValue({
          ...boundaryAppointment,
          appointmentStatus: AppointmentStatus.CANCELLED,
        }),
      } as any);

      // Act
      await service.cancelMyAppointment('customer-user-uuid-1', 'appt-uuid-1');

      // Assert
      expect(mockUsersService.updateBalance).toHaveBeenCalledWith(
        'customer-user-uuid-1',
        300000,
        mockEntityManager,
      );
    });
  });

  describe('cancelByDermatologist', () => {
    const scheduledAppointment = {
      appointmentId: 'appt-uuid-1',
      appointmentStatus: AppointmentStatus.SCHEDULED,
      payment: { amount: 300000 },
      customer: {
        user: { userId: 'customer-user-uuid-1' },
      },
      dermatologist: {
        dermatologistId: 'derma-uuid-1',
      },
      availabilitySlot: { slotId: 'slot-uuid-1' },
    };

    beforeEach(() => {
      mockDermatologistsService.findByUserId.mockResolvedValue(mockDermatologist as any);
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(scheduledAppointment),
        save: jest.fn().mockResolvedValue({
          ...scheduledAppointment,
          appointmentStatus: AppointmentStatus.CANCELLED,
        }),
      } as any);
      mockUsersService.updateBalance.mockResolvedValue(undefined);
    });

    // TC-APPT-010-01: Normal case - Always full refund to customer
    it('TC-APPT-010-01: should always refund 100% to customer when doctor cancels', async () => {
      // Act
      await service.cancelByDermatologist('derma-user-uuid-1', 'appt-uuid-1');

      // Assert
      expect(mockUsersService.updateBalance).toHaveBeenCalledWith(
        'customer-user-uuid-1',
        300000,
        mockEntityManager,
      );
    });

    // TC-APPT-010-02: Abnormal case - Not owned by dermatologist
    it('TC-APPT-010-02: should throw error when dermatologist does not own appointment', async () => {
      // Arrange
      mockEntityManager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      } as any);

      // Act & Assert
      await expect(
        service.cancelByDermatologist('derma-user-uuid-1', 'appt-uuid-1'),
      ).rejects.toThrow('Appointment not found or you do not own it');
    });
  });

  // ==================== PART 4: SETTLEMENT TESTS ====================
  describe('settleAppointment (Automatic settlement)', () => {
    const completedAppointment = {
      appointmentId: 'appt-uuid-1',
      appointmentStatus: AppointmentStatus.COMPLETED,
      payment: { amount: 300000 },
      dermatologist: {
        user: { userId: 'derma-user-uuid-1' },
      },
    };

    beforeEach(() => {
      mockUsersService.updateBalance.mockResolvedValue(undefined);
      mockEntityManager.save.mockResolvedValue({
        ...completedAppointment,
        appointmentStatus: AppointmentStatus.SETTLED,
      });
    });

    // TC-APPT-011-01: Normal case - Transfer 75% to doctor (25% fee)
    it('TC-APPT-011-01: should transfer 75% of payment to doctor wallet', async () => {
      // Act
      await service.settleAppointment(completedAppointment as any, mockEntityManager);

      // Assert
      const expectedAmount = 300000 * 0.75; // 25% platform fee
      expect(mockUsersService.updateBalance).toHaveBeenCalledWith(
        'derma-user-uuid-1',
        expectedAmount,
        mockEntityManager,
      );
    });

    // TC-APPT-011-02: Normal case - Update status to SETTLED
    it('TC-APPT-011-02: should update appointment status to SETTLED', async () => {
      // Act
      await service.settleAppointment(completedAppointment as any, mockEntityManager);

      // Assert
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    // TC-APPT-011-03: Normal case - Subscription appointment, skip payment
    it('TC-APPT-011-03: should skip wallet credit for subscription appointments', async () => {
      // Arrange
      const subscriptionAppointment = {
        ...completedAppointment,
        payment: null,
        customerSubscription: { id: 'sub-uuid-1' },
      };

      // Act
      await service.settleAppointment(subscriptionAppointment as any, mockEntityManager);

      // Assert
      expect(mockUsersService.updateBalance).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const mockDetailAppointment = {
      appointmentId: 'appt-uuid-1',
      appointmentStatus: AppointmentStatus.SCHEDULED,
      customer: { user: {} },
      dermatologist: { user: {} },
      payment: {},
    };

    beforeEach(() => {
      mockAppointmentRepository.findOne.mockResolvedValue(mockDetailAppointment as any);
    });

    // TC-APPT-012-01: Normal case
    it('TC-APPT-012-01: should return appointment details when found', async () => {
      // Act
      const result = await service.findOne('appt-uuid-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.appointmentId).toBe('appt-uuid-1');
    });

    // TC-APPT-012-02: Abnormal case - Not found
    it('TC-APPT-012-02: should throw error when appointment not found', async () => {
      // Arrange
      mockAppointmentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateManualMeetLink', () => {
    const scheduledAppointment = {
      appointmentId: 'appt-uuid-1',
      appointmentStatus: AppointmentStatus.SCHEDULED,
      meetingUrl: null,
      startTime: new Date(),
      endTime: new Date(),
      dermatologist: {
        dermatologistId: 'derma-uuid-1',
      },
    };

    beforeEach(() => {
      mockDermatologistsService.findByUserId.mockResolvedValue(mockDermatologist as any);
      mockAppointmentRepository.findOne.mockResolvedValue(scheduledAppointment as any);
      mockGoogleMeetService.createMeetLinkFromDates.mockResolvedValue(
        'https://meet.google.com/abc-defg-hij',
      );
      mockAppointmentRepository.update.mockResolvedValue({ affected: 1 } as any);
    });

    // TC-APPT-013-01: Normal case
    it('TC-APPT-013-01: should generate Google Meet link when valid', async () => {
      // Act
      const result = await service.generateManualMeetLink('derma-user-uuid-1', 'appt-uuid-1');

      // Assert
      expect(result).toBe('https://meet.google.com/abc-defg-hij');
      expect(mockGoogleMeetService.createMeetLinkFromDates).toHaveBeenCalled();
      expect(mockAppointmentRepository.update).toHaveBeenCalledWith('appt-uuid-1', {
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
      });
    });

    // TC-APPT-013-02: Normal case - Return existing link
    it('TC-APPT-013-02: should return existing link if already generated', async () => {
      // Arrange
      const appointmentWithLink = {
        ...scheduledAppointment,
        meetingUrl: 'https://meet.google.com/existing-link',
      };
      mockAppointmentRepository.findOne.mockResolvedValue(appointmentWithLink as any);

      // Act
      const result = await service.generateManualMeetLink('derma-user-uuid-1', 'appt-uuid-1');

      // Assert
      expect(result).toBe('https://meet.google.com/existing-link');
      expect(mockGoogleMeetService.createMeetLinkFromDates).not.toHaveBeenCalled();
    });

    // TC-APPT-013-03: Abnormal case - Not SCHEDULED
    it('TC-APPT-013-03: should throw error when appointment not SCHEDULED', async () => {
      // Arrange
      mockAppointmentRepository.findOne.mockResolvedValue({
        ...scheduledAppointment,
        appointmentStatus: AppointmentStatus.COMPLETED,
      } as any);

      // Act & Assert
      await expect(
        service.generateManualMeetLink('derma-user-uuid-1', 'appt-uuid-1'),
      ).rejects.toThrow('Cannot create link for a non-scheduled appointment');
    });
  });
});
