import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

export enum AdjustmentType {
  INCREASE = 'INCREASE', // Add stock (restock, return)
  DECREASE = 'DECREASE', // Remove stock (damage, loss)
  SET = 'SET', // Set absolute value
}

export enum AdjustmentStatus {
  PENDING = 'PENDING', // Waiting for approval
  APPROVED = 'APPROVED', // Approved and applied
  REJECTED = 'REJECTED', // Rejected
}

@Entity('inventory_adjustments')
export class InventoryAdjustment {
  @PrimaryGeneratedColumn('uuid')
  adjustmentId: string;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({
    type: 'enum',
    enum: AdjustmentType,
  })
  adjustmentType: AdjustmentType;

  @Column({ type: 'int' })
  quantity: number; // Amount to adjust

  @Column({ type: 'int', nullable: true })
  previousStock: number; // Stock before adjustment

  @Column({ type: 'int', nullable: true })
  newStock: number; // Stock after adjustment (for SET type)

  @Column({ type: 'text', nullable: true })
  reason: string; // Reason for adjustment

  @Column({
    type: 'enum',
    enum: AdjustmentStatus,
    default: AdjustmentStatus.PENDING,
  })
  status: AdjustmentStatus;

  // Requested by (Staff/Admin who created the request)
  @Column({ type: 'uuid' })
  requestedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedBy' })
  requestedByUser: User;

  // Approved/Rejected by (Admin who reviewed)
  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewedBy' })
  reviewedByUser: User;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string; // Reason for rejection

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalPrice: number; // New cost price (optional - only if updating)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
