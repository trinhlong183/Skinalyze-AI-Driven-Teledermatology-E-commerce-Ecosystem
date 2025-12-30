import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Dermatologist } from '../../dermatologists/entities/dermatologist.entity';

@Entity('specializations')
export class Specialization {
  @PrimaryGeneratedColumn('uuid')
  specializationId: string;

  @Column({ type: 'uuid' })
  dermatologistId: string;

  @Column({ type: 'varchar', length: 255 })
  specializationName: string;

  @Column({ type: 'varchar', length: 255 })
  specialty: string;

  @Column({ type: 'text', nullable: true })
  certificateImageUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  level: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  issuingAuthority: string;

  @Column({ type: 'date', nullable: true })
  issueDate: Date;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @ManyToOne(() => Dermatologist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dermatologistId' })
  dermatologist: Dermatologist;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
