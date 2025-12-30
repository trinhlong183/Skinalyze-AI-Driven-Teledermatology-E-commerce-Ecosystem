import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TreatmentRoutine } from '../../treatment-routines/entities/treatment-routine.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { SubscriptionPlan } from '../../subscription-plans/entities/subscription-plan.entity';
import { AvailabilitySlot } from '../../availability-slots/entities/availability-slot.entity';
import { Specialization } from '../../specializations/entities/specialization.entity';
import { Rating } from '../../ratings/entities/rating.entity';

@Entity('dermatologists')
export class Dermatologist {
  @PrimaryGeneratedColumn('uuid')
  dermatologistId: string;

  @Column({ type: 'int', nullable: true })
  yearsOfExp: number;

  @Column({ type: 'text', nullable: true })
  about: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  defaultSlotPrice: number;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  @Index() // Index for faster sorting/filtering
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  totalReviews: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Appointment, (appointment) => appointment.dermatologist)
  appointments: Appointment[];

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => TreatmentRoutine, (routine) => routine.dermatologist)
  treatmentRoutines: TreatmentRoutine[];

  @OneToMany(() => SubscriptionPlan, (plan) => plan.dermatologist)
  subscriptionPlans: SubscriptionPlan[];

  @OneToMany(() => AvailabilitySlot, (slot) => slot.dermatologist)
  slots: AvailabilitySlot[];

  @OneToMany(
    () => Specialization,
    (specialization) => specialization.dermatologist,
  )
  specializations: Specialization[];

  @OneToMany(() => Rating, (rating) => rating.dermatologist)
  ratings: Rating[];
}
