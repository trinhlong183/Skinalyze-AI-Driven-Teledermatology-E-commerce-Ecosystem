import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Dermatologist } from '../../dermatologists/entities/dermatologist.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

export enum SlotStatus {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
}

@Entity('availability_slots')
@Unique(['dermatologistId', 'startTime'])
export class AvailabilitySlot {
  @PrimaryGeneratedColumn('uuid')
  slotId: string;

  @Column({ type: 'uuid' })
  dermatologistId: string;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: SlotStatus,
    default: SlotStatus.AVAILABLE,
  })
  status: SlotStatus;

  @Column({ type: 'uuid', nullable: true })
  appointmentId: string | null;

  @Column({
    // type: 'decimal',
    // precision: 10,
    // scale: 2,
    default: 0,
  })
  price: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Dermatologist, (dermatologist) => dermatologist.slots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dermatologistId' })
  dermatologist: Dermatologist;

  @OneToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;
}
