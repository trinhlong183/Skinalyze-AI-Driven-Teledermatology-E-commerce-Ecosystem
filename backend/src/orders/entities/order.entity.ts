import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Customer } from '../../customers/entities/customer.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { OrderItem } from './order-item.entity';
import { ShippingLog } from '../../shipping-logs/entities/shipping-log.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  orderId: string;

  // Many-to-One with Customer (Customer has many Orders)
  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Exclude()
  @Column({ type: 'uuid' })
  customerId: string;

  // One-to-One with Payment (thay vì Transaction)
  @OneToOne(() => Payment, (payment) => payment.order, {
    cascade: true,
  })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @Exclude()
  @Column({ type: 'int', nullable: true })
  paymentId: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'text' })
  shippingAddress: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'GHN Ward Code',
  })
  toWardCode: string;

  @Column({ type: 'int', nullable: true, comment: 'GHN District ID' })
  toDistrictId: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'uuid', nullable: true })
  processedBy: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    default: 'INTERNAL',
    comment: 'Preferred shipping method from checkout',
  })
  preferredShippingMethod: string;

  // One-to-Many with OrderItems
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  orderItems: OrderItem[];

  // One-to-Many with ShippingLogs
  @OneToMany(() => ShippingLog, (log) => log.order)
  shippingLogs: ShippingLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
