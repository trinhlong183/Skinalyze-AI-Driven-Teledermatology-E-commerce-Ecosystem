import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { SubscriptionPlan } from '../../subscription-plans/entities/subscription-plan.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('customer_subscription')
export class CustomerSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  paymentId: string;

  @Column({ type: 'int' })
  sessionsRemaining: number;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Customer, (customer) => customer.customerSubscriptions)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.customerSubscriptions)
  @JoinColumn({ name: 'planId' })
  subscriptionPlan: SubscriptionPlan;

  @OneToOne(() => Payment, { nullable: true })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;
}
