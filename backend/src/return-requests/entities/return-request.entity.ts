import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { ShippingLog } from '../../shipping-logs/entities/shipping-log.entity';
import { Customer } from '../../customers/entities/customer.entity';

export enum ReturnRequestStatus {
  PENDING = 'PENDING', // Chờ duyệt
  APPROVED = 'APPROVED', // Staff đã duyệt, chờ nhận việc
  REJECTED = 'REJECTED', // Từ chối
  IN_PROGRESS = 'IN_PROGRESS', // Staff đang xử lý (RETURNING)
  COMPLETED = 'COMPLETED', // Đã về kho (RETURNED)
  CANCELLED = 'CANCELLED', // Khách hàng hủy
}

export enum ReturnReason {
  DAMAGED = 'DAMAGED', // Hàng bị hư hỏng
  WRONG_ITEM = 'WRONG_ITEM', // Giao sai hàng
  DEFECTIVE = 'DEFECTIVE', // Hàng lỗi
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED', // Không đúng mô tả
  CHANGE_MIND = 'CHANGE_MIND', // Đổi ý
  OTHER = 'OTHER', // Lý do khác
}

@Entity('return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn('uuid')
  returnRequestId: string;

  // Liên kết với Order
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid' })
  orderId: string;

  // Liên kết với ShippingLog
  @ManyToOne(() => ShippingLog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shippingLogId' })
  shippingLog: ShippingLog;

  @Column({ type: 'uuid' })
  shippingLogId: string;

  // Customer tạo request
  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ type: 'uuid' })
  customerId: string;

  // Lý do trả hàng
  @Column({
    type: 'enum',
    enum: ReturnReason,
  })
  reason: ReturnReason;

  @Column({ type: 'text', nullable: true })
  reasonDetail: string; // Mô tả chi tiết lý do

  // Ảnh bằng chứng từ khách hàng
  @Column({ type: 'json', nullable: true })
  evidencePhotos: string[];

  // Trạng thái request
  @Column({
    type: 'enum',
    enum: ReturnRequestStatus,
    default: ReturnRequestStatus.PENDING,
  })
  status: ReturnRequestStatus;

  // Staff xử lý (duyệt/từ chối)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedByStaffId' })
  reviewedByStaff: User;

  @Column({ type: 'uuid', nullable: true })
  reviewedByStaffId: string;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true })
  reviewNote: string; // Ghi chú của staff khi duyệt

  // Staff nhận việc lấy hàng về
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedStaffId' })
  assignedStaff: User;

  @Column({ type: 'uuid', nullable: true })
  assignedStaffId: string;

  @Column({ type: 'datetime', nullable: true })
  assignedAt: Date; // Thời điểm staff nhận việc

  // Thông tin hoàn thành
  @Column({ type: 'datetime', nullable: true })
  returnedToWarehouseAt: Date; // Thời điểm về tới kho

  @Column({ type: 'json', nullable: true })
  returnCompletionPhotos: string[]; // Ảnh bằng chứng về kho

  @Column({ type: 'text', nullable: true })
  completionNote: string; // Ghi chú khi hoàn thành

  // Thông tin hoàn tiền (nếu có)
  @Column({ type: 'boolean', default: false })
  isRefunded: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount: number;

  @Column({ type: 'datetime', nullable: true })
  refundedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
