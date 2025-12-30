import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Dermatologist } from '../../dermatologists/entities/dermatologist.entity';
import { TreatmentRoutine } from '../../treatment-routines/entities/treatment-routine.entity';
import { SkinAnalysis } from '../../skin-analysis/entities/skin-analysis.entity'; // Import SkinAnalysis
import { AvailabilitySlot } from '../../availability-slots/entities/availability-slot.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { CustomerSubscription } from '../../customer-subscription/entities/customer-subscription.entity';
import {
  AppointmentStatus,
  AppointmentType,
  TerminationReason,
} from '../types/appointment.types';
import { Rating } from '../../ratings/entities/rating.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  appointmentId: string;

  @Column({ type: 'varchar', nullable: true })
  paymentId: string;

  @Column({ type: 'datetime', nullable: true })
  customerJoinedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  dermatologistJoinedAt: Date;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  price: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'text', nullable: true })
  medicalNote: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  meetingUrl: string;

  @Column({
    type: 'enum',
    enum: AppointmentType,
  })
  appointmentType: AppointmentType;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING_PAYMENT,
  })
  appointmentStatus: AppointmentStatus;

  @Column({
    type: 'enum',
    enum: TerminationReason,
    nullable: true,
  })
  terminatedReason: TerminationReason;

  @Column({ type: 'text', nullable: true })
  terminationNote?: string;

  @Column({ type: 'datetime', nullable: true })
  actualEndTime: Date;

  @Column({ type: 'enum', enum: TerminationReason, nullable: true })
  customerReportReason: TerminationReason;

  @Column({ type: 'text', nullable: true })
  customerReportNote: string;

  @Column({ type: 'enum', enum: TerminationReason, nullable: true })
  dermatologistReportReason: TerminationReason;

  @Column({ type: 'text', nullable: true })
  dermatologistReportNote: string;

  // Admin note for handle issues (Refund/Payout)
  @Column({ type: 'text', nullable: true })
  adminNote: string;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  resolvedBy: string;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;

  // RELATIONSHIPS

  @ManyToOne(() => Dermatologist, (dermatologist) => dermatologist.appointments)
  @JoinColumn({ name: 'dermatologistId' })
  dermatologist: Dermatologist;

  @ManyToOne(() => Customer, (customer) => customer.appointments)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @OneToOne(() => Payment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @ManyToOne(() => SkinAnalysis, { nullable: true })
  @JoinColumn({ name: 'analysisId' })
  skinAnalysis: SkinAnalysis;

  @OneToOne(() => TreatmentRoutine, (routine) => routine.createdFromAppointment)
  createdRoutine: TreatmentRoutine;

  @OneToOne(() => Rating, (rating) => rating.appointment)
  rating: Rating;

  // Keep: follow-up relationship remains Many-to-One.
  // "Which routine is this appointment tracking?"
  @ManyToOne(
    () => TreatmentRoutine,
    (routine) => routine.followUpAppointments,
    {
      nullable: true,
    },
  )
  @JoinColumn({ name: 'trackingRoutineId' })
  trackingRoutine: TreatmentRoutine;

  @ManyToOne(() => CustomerSubscription, { nullable: true })
  @JoinColumn({ name: 'customerSubscriptionId' })
  customerSubscription: CustomerSubscription;

  @OneToOne(() => AvailabilitySlot, (slot) => slot.appointment)
  availabilitySlot: AvailabilitySlot;
}
