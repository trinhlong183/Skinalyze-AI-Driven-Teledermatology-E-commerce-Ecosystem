import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

export enum ShippingStatus {
  PENDING = 'PENDING',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNING = 'RETURNING',
  RETURNED = 'RETURNED',
}

export enum ShippingMethod {
  INTERNAL = 'INTERNAL', // Shipper nội bộ giao đơn lẻ
  GHN = 'GHN', // Giao qua GHN
  BATCH = 'BATCH', // Gom nhiều đơn giao cùng lúc
}

@Entity('shipping_logs')
export class ShippingLog {
  @PrimaryGeneratedColumn('uuid')
  shippingLogId: string;

  // Many-to-One with Order (Order has many ShippingLogs)
  @ManyToOne(() => Order, (order) => order.shippingLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  shippingFee: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  carrierName: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'text', nullable: true })
  unexpectedCase: string;

  @Column({ type: 'boolean', default: false })
  isCodCollected: boolean;

  @Column({ type: 'boolean', default: false })
  isCodTransferred: boolean;

  @Column({
    type: 'enum',
    enum: ShippingStatus,
    default: ShippingStatus.PENDING,
  })
  status: ShippingStatus;

  @Column({
    type: 'enum',
    enum: ShippingMethod,
    default: ShippingMethod.INTERNAL,
  })
  shippingMethod: ShippingMethod;

  // GHN tracking information
  @Column({ type: 'varchar', length: 255, nullable: true })
  ghnOrderCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ghnSortCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ghnShippingFee: number;

  @Column({ type: 'json', nullable: true })
  ghnTrackingData: any;

  // Batch delivery information (gom nhiều đơn cùng customer)
  @Column({ type: 'varchar', length: 100, nullable: true })
  batchCode: string; // Mã lô giao hàng (ví dụ: BATCH-20251201-001)

  @Column({ type: 'json', nullable: true })
  batchOrderIds: string[]; // Array of order IDs in the same batch

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalAmount: number;

  @Column({ type: 'datetime', nullable: true })
  codCollectDate: Date;

  @Column({ type: 'datetime', nullable: true })
  codTransferDate: Date;

  @Column({ type: 'datetime', nullable: true })
  estimatedDeliveryDate: Date;

  @Column({ type: 'datetime', nullable: true })
  returnedDate: Date;

  @Column({ type: 'datetime', nullable: true })
  deliveredDate: Date;

  // 📸 Ảnh bằng chứng hoàn thành giao hàng (multiple images)
  @Column({ type: 'json', nullable: true })
  finishedPictures: string[];

  // 📦 Batch completion information
  @Column({ name: 'batch_completion_photos', type: 'json', nullable: true })
  batchCompletionPhotos?: string[]; // Ảnh bằng chứng hoàn thành cả batch

  @Column({ name: 'batch_completion_note', type: 'text', nullable: true })
  batchCompletionNote?: string; // Ghi chú khi hoàn thành batch

  @Column({ name: 'batch_completed_at', type: 'datetime', nullable: true })
  batchCompletedAt?: Date; // Thời điểm hoàn thành batch

  @Column({ name: 'cod_collected', type: 'boolean', default: false })
  codCollected?: boolean; // Đã thu COD chưa

  @Column({
    name: 'total_cod_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalCodAmount?: number; // Tổng số tiền COD thu được

  // Staff người thực hiện ship
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'shippingStaffId' })
  shippingStaff: User;

  @Column({ type: 'uuid', nullable: true })
  shippingStaffId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
