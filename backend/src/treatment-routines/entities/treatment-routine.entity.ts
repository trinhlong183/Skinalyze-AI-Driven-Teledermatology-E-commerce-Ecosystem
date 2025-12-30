import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Dermatologist } from '../../dermatologists/entities/dermatologist.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { RoutineDetail } from '../../routine-details/entities/routine-detail.entity';
import { SkinAnalysis } from '../../skin-analysis/entities/skin-analysis.entity';

export enum RoutineStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('treatment_routines')
export class TreatmentRoutine {
  @PrimaryGeneratedColumn('uuid')
  routineId: string;

  @Column({ type: 'varchar', length: 255 })
  routineName: string;

  // Status
  @Column({
    type: 'enum',
    enum: RoutineStatus,
    default: RoutineStatus.ACTIVE,
  })
  status: RoutineStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships

  @ManyToOne(() => Dermatologist, (d) => d.treatmentRoutines)
  @JoinColumn({ name: 'dermatologistId' })
  dermatologist: Dermatologist;

  @ManyToOne(() => Customer, (c) => c.treatmentRoutines)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => SkinAnalysis, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'originalAnalysisId' })
  originalAnalysis: SkinAnalysis;

  @OneToMany(() => RoutineDetail, (detail) => detail.treatmentRoutine)
  routineDetails: RoutineDetail[];

  // Updated: identifies which appointment created this routine.
  @OneToOne(() => Appointment, (appointment) => appointment.createdRoutine, {
    nullable: true, // Keep nullable to allow manual routine creation.
  })
  @JoinColumn({ name: 'createdFromAppointmentId' })
  createdFromAppointment: Appointment;

  // Keep: this relationship gathers the follow-up appointments.
  @OneToMany(() => Appointment, (appointment) => appointment.trackingRoutine)
  followUpAppointments: Appointment[];
}
