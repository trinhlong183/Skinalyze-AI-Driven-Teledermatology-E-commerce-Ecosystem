import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';

import { CustomerSubscription } from '../../customer-subscription/entities/customer-subscription.entity';
import { Dermatologist } from '../../dermatologists/entities/dermatologist.entity';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  planId: string;

  @Column({ type: 'varchar', length: 255 })
  planName: string;

  @Column({ type: 'text', nullable: true })
  planDescription: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'int' })
  totalSessions: number;

  @Column({ type: 'int' })
  durationInDays: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(
    () => CustomerSubscription,
    (customer) => customer.subscriptionPlan,
  )
  customerSubscriptions: CustomerSubscription[];

  @ManyToOne(
    () => Dermatologist,
    (dermatologist) => dermatologist.subscriptionPlans,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'dermatologistId' })
  dermatologist: Dermatologist;
}
