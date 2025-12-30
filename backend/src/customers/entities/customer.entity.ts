import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { CustomerSubscription } from '../../customer-subscription/entities/customer-subscription.entity';
import { User } from '../../users/entities/user.entity';
import { TreatmentRoutine } from '../../treatment-routines/entities/treatment-routine.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { SkinAnalysis } from '../../skin-analysis/entities/skin-analysis.entity';
import { Rating } from '../../ratings/entities/rating.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  customerId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int', default: 0 })
  aiUsageAmount: number;

  @Column({ type: 'json', nullable: true })
  pastDermatologicalHistory: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Danh sách các gói khách đã mua
  @OneToMany(
    () => CustomerSubscription,
    (subscription) => subscription.customer,
  )
  customerSubscriptions: CustomerSubscription[];

  @OneToMany(() => TreatmentRoutine, (routine) => routine.customer)
  treatmentRoutines: TreatmentRoutine[];

  @OneToMany(() => Appointment, (appointment) => appointment.customer)
  appointments: Appointment[];

  @OneToMany(() => SkinAnalysis, (analysis) => analysis.customer)
  skinAnalyses: SkinAnalysis[];

  @OneToMany(() => Rating, (rating) => rating.customer)
  ratings: Rating[];
}
