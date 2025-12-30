import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('skin_analysis')
export class SkinAnalysis {
  @PrimaryGeneratedColumn('uuid')
  analysisId: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({
    type: 'enum',
    enum: ['MANUAL', 'AI_SCAN'],
    default: 'AI_SCAN',
  })
  source: 'MANUAL' | 'AI_SCAN';

  @Column({ type: 'text', nullable: true })
  chiefComplaint: string | null;

  @Column({ type: 'text', nullable: true })
  patientSymptoms: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'json', nullable: true })
  imageUrls: string[] | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  aiDetectedDisease: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  aiDetectedCondition: string | null;

  @Column({ type: 'json', nullable: true })
  aiRecommendedProducts: any | null;

  @Column({ type: 'json', nullable: true })
  mask: string[] | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  confidence: number | null;

  @Column({ type: 'json', nullable: true })
  allPredictions: Record<string, number> | null;

  @ManyToOne(() => Customer, (customer) => customer.skinAnalyses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}