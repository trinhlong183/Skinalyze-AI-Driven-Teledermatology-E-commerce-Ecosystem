import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentType, PaymentStatus, PaymentMethod } from '../payments/entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import {
  ReviewReturnRequestDto,
  CompleteReturnDto,
} from './dto/review-return-request.dto';
import {
  ReturnRequest,
  ReturnRequestStatus,
} from './entities/return-request.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import {
  ShippingLog,
  ShippingStatus,
} from '../shipping-logs/entities/shipping-log.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ReturnRequestsService {
  /**
   * 🔒 Valid state transitions for return request workflow
   * Đảm bảo không bị nhảy cóc trạng thái
   */
  private readonly validTransitions: Record<
    ReturnRequestStatus,
    ReturnRequestStatus[]
  > = {
    [ReturnRequestStatus.PENDING]: [
      ReturnRequestStatus.APPROVED,
      ReturnRequestStatus.REJECTED,
      ReturnRequestStatus.CANCELLED, // Customer cancel
    ],
    [ReturnRequestStatus.APPROVED]: [
      ReturnRequestStatus.IN_PROGRESS, // Staff assign
    ],
    [ReturnRequestStatus.REJECTED]: [], // Terminal state
    [ReturnRequestStatus.IN_PROGRESS]: [
      ReturnRequestStatus.COMPLETED, // Staff complete
    ],
    [ReturnRequestStatus.COMPLETED]: [], // Terminal state
    [ReturnRequestStatus.CANCELLED]: [], // Terminal state
  };

  /**
   * 🔍 Kiểm tra xem có thể chuyển từ currentStatus sang newStatus không
   */
  private validateStatusTransition(
    currentStatus: ReturnRequestStatus,
    newStatus: ReturnRequestStatus,
  ): void {
    if (currentStatus === newStatus) {
      return; // Same status is allowed
    }

    const allowedTransitions = this.validTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
          `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
      );
    }
  }

  constructor(
    @InjectRepository(ReturnRequest)
    private returnRequestRepository: Repository<ReturnRequest>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(ShippingLog)
    private shippingLogRepository: Repository<ShippingLog>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createReturnRequestDto: CreateReturnRequestDto,
    userId: string,
  ): Promise<ReturnRequest> {
    // Find customer from userId
    const customer = await this.customerRepository
      .createQueryBuilder('customer')
      .innerJoin('customer.user', 'user')
      .where('user.userId = :userId', { userId })
      .getOne();

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    // Validate order exists and belongs to customer
    const order = await this.orderRepository.findOne({
      where: { orderId: createReturnRequestDto.orderId },
      relations: ['customer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== customer.customerId) {
      throw new ForbiddenException(
        '[CREATE] You can only create return request for your own orders',
      );
    }

    // Validate order status is DELIVERED
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Can only create return request for delivered orders',
      );
    }

    // Validate shipping log exists and status is DELIVERED
    const shippingLog = await this.shippingLogRepository.findOne({
      where: { shippingLogId: createReturnRequestDto.shippingLogId },
    });

    if (!shippingLog) {
      throw new NotFoundException('Shipping log not found');
    }

    if (shippingLog.status !== ShippingStatus.DELIVERED) {
      throw new BadRequestException(
        'Can only create return request for delivered shipments',
      );
    }

    // Check if return request already exists
    const existingRequest = await this.returnRequestRepository.findOne({
      where: {
        orderId: createReturnRequestDto.orderId,
        shippingLogId: createReturnRequestDto.shippingLogId,
      },
    });

    if (
      existingRequest &&
      existingRequest.status !== ReturnRequestStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Return request already exists for this order',
      );
    }

    // Create return request
    const returnRequest = this.returnRequestRepository.create({
      ...createReturnRequestDto,
      customerId: customer.customerId,
      status: ReturnRequestStatus.PENDING,
    });

    return this.returnRequestRepository.save(returnRequest);
  }

  async findAll(): Promise<ReturnRequest[]> {
    return this.returnRequestRepository.find({
      relations: [
        'order',
        'shippingLog',
        'customer',
        'customer.user',
        'reviewedByStaff',
        'assignedStaff',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCustomer(userId: string): Promise<ReturnRequest[]> {
    console.log('🔍 findByCustomer - userId:', userId);

    // Find customer from userId
    const customer = await this.customerRepository
      .createQueryBuilder('customer')
      .innerJoin('customer.user', 'user')
      .where('user.userId = :userId', { userId })
      .getOne();

    console.log('🔍 findByCustomer - customer:', customer);

    if (!customer) {
      // Return empty array if user doesn't have customer profile
      console.log('⚠️ Customer not found, returning empty array');
      return [];
    }

    console.log(
      '🔍 findByCustomer - searching with customerId:',
      customer.customerId,
    );

    const requests = await this.returnRequestRepository.find({
      where: { customerId: customer.customerId },
      relations: [
        'order',
        'shippingLog',
        'customer',
        'customer.user',
        'reviewedByStaff',
        'assignedStaff',
      ],
      order: { createdAt: 'DESC' },
    });

    console.log('🔍 findByCustomer - found requests:', requests.length);

    return requests;
  }

  async findPending(): Promise<ReturnRequest[]> {
    return this.returnRequestRepository.find({
      where: { status: ReturnRequestStatus.PENDING },
      relations: ['order', 'shippingLog', 'customer', 'customer.user'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ReturnRequest> {
    const returnRequest = await this.returnRequestRepository.findOne({
      where: { returnRequestId: id },
      relations: [
        'order',
        'shippingLog',
        'customer',
        'customer.user',
        'reviewedByStaff',
        'assignedStaff',
      ],
    });

    if (!returnRequest) {
      throw new NotFoundException(`Return request with ID ${id} not found`);
    }

    return returnRequest;
  }

  // Staff approve return request
  async approve(
    id: string,
    staffId: string,
    reviewDto?: ReviewReturnRequestDto,
  ): Promise<ReturnRequest> {
    const returnRequest = await this.findOne(id);

    // 🔒 Validate state transition
    this.validateStatusTransition(
      returnRequest.status,
      ReturnRequestStatus.APPROVED,
    );

    returnRequest.status = ReturnRequestStatus.APPROVED;
    returnRequest.reviewedByStaffId = staffId;
    returnRequest.reviewedAt = new Date();
    if (reviewDto?.reviewNote) {
      returnRequest.reviewNote = reviewDto.reviewNote;
    }

    return this.returnRequestRepository.save(returnRequest);
  }

  // Staff reject return request
  async reject(
    id: string,
    staffId: string,
    reviewDto?: ReviewReturnRequestDto,
  ): Promise<ReturnRequest> {
    const returnRequest = await this.findOne(id);

    // 🔒 Validate state transition
    this.validateStatusTransition(
      returnRequest.status,
      ReturnRequestStatus.REJECTED,
    );

    returnRequest.status = ReturnRequestStatus.REJECTED;
    returnRequest.reviewedByStaffId = staffId;
    returnRequest.reviewedAt = new Date();
    if (reviewDto?.reviewNote) {
      returnRequest.reviewNote = reviewDto.reviewNote;
    }

    return this.returnRequestRepository.save(returnRequest);
  }

  // Staff assign themselves to handle return
  async assignStaff(id: string, staffId: string): Promise<ReturnRequest> {
    const returnRequest = await this.findOne(id);

    // 🔒 Validate state transition
    this.validateStatusTransition(
      returnRequest.status,
      ReturnRequestStatus.IN_PROGRESS,
    );

    returnRequest.status = ReturnRequestStatus.IN_PROGRESS;
    returnRequest.assignedStaffId = staffId;
    returnRequest.assignedAt = new Date();

    // Update shipping log status to RETURNING
    await this.shippingLogRepository.update(
      { shippingLogId: returnRequest.shippingLogId },
      { status: ShippingStatus.RETURNING },
    );

    return this.returnRequestRepository.save(returnRequest);
  }

  // Staff complete return (arrived at warehouse)
  async complete(
    id: string,
    staffId: string,
    completeDto: CompleteReturnDto,
  ): Promise<ReturnRequest> {
    const returnRequest = await this.findOne(id);

    // 🔒 Validate state transition
    this.validateStatusTransition(
      returnRequest.status,
      ReturnRequestStatus.COMPLETED,
    );

    if (returnRequest.assignedStaffId !== staffId) {
      throw new ForbiddenException(
        'Only assigned staff can complete this return',
      );
    }

    // Load order with payment to get refund amount
    const order = await this.orderRepository.findOne({
      where: { orderId: returnRequest.orderId },
      relations: ['payment', 'customer', 'customer.user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const refundAmount = order.payment?.amount || 0;
    const userId = order.customer?.user?.userId;

    if (!userId) {
      throw new NotFoundException('User not found for refund');
    }

    // 💰 Process refund: Update user wallet balance
    await this.userRepository.increment(
      { userId },
      'balance',
      refundAmount,
    );

    // 📝 Create payment record for refund (topup type)
    const paymentCode = `REFUND-${returnRequest.returnRequestId.substring(0, 8).toUpperCase()}`;
    const refundPayment = this.paymentRepository.create({
      paymentCode,
      paymentType: PaymentType.TOPUP,
      userId,
      amount: refundAmount,
      paidAmount: refundAmount,
      paymentMethod: PaymentMethod.WALLET,
      status: PaymentStatus.COMPLETED,
      transferContent: `Tiền đơn hàng #${order.orderId.substring(0, 8)} - Hoàn trả do trả hàng`,
    });
    await this.paymentRepository.save(refundPayment);

    // Update return request status
    returnRequest.status = ReturnRequestStatus.COMPLETED;
    returnRequest.returnedToWarehouseAt = new Date();
    if (completeDto.completionNote) {
      returnRequest.completionNote = completeDto.completionNote;
    }
    if (completeDto.returnCompletionPhotos) {
      returnRequest.returnCompletionPhotos = completeDto.returnCompletionPhotos;
    }

    // Update shipping log status to RETURNED
    await this.shippingLogRepository.update(
      { shippingLogId: returnRequest.shippingLogId },
      { status: ShippingStatus.RETURNED },
    );

    const savedReturnRequest = await this.returnRequestRepository.save(returnRequest);

    console.log(`✅ Refund processed: ${refundAmount} VND to user ${userId}`);
    console.log(`📝 Refund payment created: ${paymentCode}`);

    return savedReturnRequest;
  }

  // Customer cancel return request (only if PENDING)
  async cancel(id: string, userId: string): Promise<ReturnRequest> {
    // Find customer from userId
    const customer = await this.customerRepository
      .createQueryBuilder('customer')
      .innerJoin('customer.user', 'user')
      .where('user.userId = :userId', { userId })
      .getOne();

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const returnRequest = await this.findOne(id);

    if (returnRequest.customerId !== customer.customerId) {
      throw new ForbiddenException(
        'You can only cancel your own return requests',
      );
    }

    // 🔒 Validate state transition
    this.validateStatusTransition(
      returnRequest.status,
      ReturnRequestStatus.CANCELLED,
    );

    returnRequest.status = ReturnRequestStatus.CANCELLED;
    return this.returnRequestRepository.save(returnRequest);
  }

  async uploadCompletionPhotos(
    id: string,
    files: Express.Multer.File[],
    staffId: string,
  ) {
    const returnRequest = await this.returnRequestRepository.findOne({
      where: { returnRequestId: id },
      relations: ['assignedStaff'],
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnRequestStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Can only upload completion photos for completed returns',
      );
    }

    if (returnRequest.assignedStaffId !== staffId) {
      throw new ForbiddenException(
        'Only assigned staff can upload completion photos',
      );
    }

    // Upload files to Cloudinary
    const uploadResults = await this.cloudinaryService.uploadMultipleImages(
      files,
      'return-completion-photos',
    );

    const photoUrls = uploadResults.map((result) => result.secure_url);

    returnRequest.returnCompletionPhotos = [
      ...(returnRequest.returnCompletionPhotos || []),
      ...photoUrls,
    ];

    return this.returnRequestRepository.save(returnRequest);
  }

  async remove(id: string): Promise<void> {
    const returnRequest = await this.findOne(id);
    await this.returnRequestRepository.remove(returnRequest);
  }
}
