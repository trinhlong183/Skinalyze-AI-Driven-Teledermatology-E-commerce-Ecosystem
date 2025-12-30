import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Dermatologist } from '../../dermatologists/entities/dermatologist.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity('ratings')
@Index(['dermatologist', 'rating'])
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  ratingId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Customer, (customer) => customer.ratings)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => Dermatologist, (dermatologist) => dermatologist.ratings)
  @JoinColumn({ name: 'dermatologistId' })
  dermatologist: Dermatologist;

  @OneToOne(() => Appointment, { nullable: false })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;
}
