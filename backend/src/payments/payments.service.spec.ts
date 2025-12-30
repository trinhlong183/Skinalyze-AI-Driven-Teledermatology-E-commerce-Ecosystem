import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { Repository, EntityManager } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
} from './entities/payment.entity';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';
import { CartService } from '../cart/cart.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CustomerSubscriptionService } from '../customer-subscription/customer-subscription.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: jest.Mocked<Repository<Payment>>;
  let ordersService: jest.Mocked<OrdersService>;
  let usersService: jest.Mocked<UsersService>;
  let entityManager: jest.Mocked<EntityManager>;

  const mockPaymentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockOrdersService = {
    findOne: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockEntityManager = {
    getRepository: jest.fn(),
  };

  const mockCartService = {};
  const mockAppointmentsService = {};
  const mockCustomerSubscriptionService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: CartService,
          useValue: mockCartService,
        },
        {
          provide: AppointmentsService,
          useValue: mockAppointmentsService,
        },
        {
          provide: CustomerSubscriptionService,
          useValue: mockCustomerSubscriptionService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentRepository = module.get(getRepositoryToken(Payment));
    ordersService = module.get(OrdersService);
    usersService = module.get(UsersService);
    entityManager = module.get(EntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    const userId = 'test-user-id';
    const customerId = 'test-customer-id';
    const orderId = 'test-order-id';

    beforeEach(() => {
      mockPaymentRepository.create.mockImplementation((data: any) => ({
        paymentId: 'payment-id',
        paymentCode: 'PAY-123',
        amount: data.amount,
        status: PaymentStatus.PENDING,
        expiredAt: new Date(),
        ...data,
      }));
      mockPaymentRepository.save.mockImplementation((payment: any) =>
        Promise.resolve(payment),
      );
    });

    // TC-PAY-001-01: Normal - Create order payment with cart data
    it('TC-PAY-001-01: should create payment for order with cart data', async () => {
      const cartData = {
        items: [{ productId: 'product-1', quantity: 2, price: 100000 }],
      };

      const result = await service.createPayment({
        paymentType: PaymentType.ORDER,
        customerId,
        userId,
        cartData,
        shippingAddress: '123 Test St',
        amount: 500000,
        paymentMethod: PaymentMethod.BANKING,
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(500000);
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(mockPaymentRepository.create).toHaveBeenCalled();
    });

    // TC-PAY-001-02: Normal - Create topup payment
    it('TC-PAY-001-02: should create payment for wallet topup', async () => {
      mockUsersService.findOne.mockResolvedValue({ userId } as any);

      const result = await service.createPayment({
        paymentType: PaymentType.TOPUP,
        userId,
        amount: 1000000,
        paymentMethod: PaymentMethod.BANKING,
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(1000000);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
    });

    // TC-PAY-001-03: Normal - Create booking payment
    it('TC-PAY-001-03: should create payment for appointment booking', async () => {
      const result = await service.createPayment({
        paymentType: PaymentType.BOOKING,
        customerId,
        userId,
        amount: 300000,
        paymentMethod: PaymentMethod.BANKING,
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(300000);
    });

    // TC-PAY-001-04: Normal - Create subscription payment
    it('TC-PAY-001-04: should create payment for subscription', async () => {
      const result = await service.createPayment({
        paymentType: PaymentType.SUBSCRIPTION,
        customerId,
        planId: 'plan-id',
        amount: 500000,
        paymentMethod: PaymentMethod.BANKING,
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(500000);
    });

    // TC-PAY-001-05: Boundary - Minimum topup amount (10,000 VND)
    it('TC-PAY-001-05: should create payment with minimum topup amount', async () => {
      mockUsersService.findOne.mockResolvedValue({ userId } as any);

      const result = await service.createPayment({
        paymentType: PaymentType.TOPUP,
        userId,
        amount: 10000,
        paymentMethod: PaymentMethod.BANKING,
      });

      expect(result.amount).toBe(10000);
    });

    // TC-PAY-001-06: Boundary - Maximum topup amount (50,000,000 VND)
    it('TC-PAY-001-06: should create payment with maximum topup amount', async () => {
      mockUsersService.findOne.mockResolvedValue({ userId } as any);

      const result = await service.createPayment({
        paymentType: PaymentType.TOPUP,
        userId,
        amount: 50000000,
        paymentMethod: PaymentMethod.BANKING,
      });

      expect(result.amount).toBe(50000000);
    });

    // TC-PAY-001-07: Abnormal - Order payment without cart data or orderId
    it('TC-PAY-001-07: should throw error when order payment missing required data', async () => {
      await expect(
        service.createPayment({
          paymentType: PaymentType.ORDER,
          amount: 500000,
          paymentMethod: PaymentMethod.BANKING,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createPayment({
          paymentType: PaymentType.ORDER,
          amount: 500000,
          paymentMethod: PaymentMethod.BANKING,
        }),
      ).rejects.toThrow('Cart data and customer ID are required');
    });

    // TC-PAY-001-08: Abnormal - Topup below minimum (< 10,000 VND)
    it('TC-PAY-001-08: should throw error when topup amount below minimum', async () => {
      mockUsersService.findOne.mockResolvedValue({ userId } as any);

      await expect(
        service.createPayment({
          paymentType: PaymentType.TOPUP,
          userId,
          amount: 5000,
          paymentMethod: PaymentMethod.BANKING,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createPayment({
          paymentType: PaymentType.TOPUP,
          userId,
          amount: 5000,
          paymentMethod: PaymentMethod.BANKING,
        }),
      ).rejects.toThrow('Số tiền nạp tối thiểu là 10,000 VND');
    });

    // TC-PAY-001-09: Abnormal - Topup above maximum (> 50,000,000 VND)
    it('TC-PAY-001-09: should throw error when topup amount above maximum', async () => {
      mockUsersService.findOne.mockResolvedValue({ userId } as any);

      await expect(
        service.createPayment({
          paymentType: PaymentType.TOPUP,
          userId,
          amount: 60000000,
          paymentMethod: PaymentMethod.BANKING,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createPayment({
          paymentType: PaymentType.TOPUP,
          userId,
          amount: 60000000,
          paymentMethod: PaymentMethod.BANKING,
        }),
      ).rejects.toThrow('Số tiền nạp tối đa là 50,000,000 VND');
    });

    // TC-PAY-001-10: Abnormal - User not found for topup
    it('TC-PAY-001-10: should throw error when user not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(
        service.createPayment({
          paymentType: PaymentType.TOPUP,
          userId: 'non-existent',
          amount: 100000,
          paymentMethod: PaymentMethod.BANKING,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
