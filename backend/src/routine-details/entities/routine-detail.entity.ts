import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TreatmentRoutine } from '../../treatment-routines/entities/treatment-routine.entity';

export class RoutineProductItem {
  productId?: string; // Optional: Product ID if exists in DB
  productName: string; // Required: Product name (from DB or manual input)
  usage?: string; // Ex: "1 drop", "2 pumps"
  frequency?: string; // Ex: "Morning/Evening", "2 times/week"
  isExternal: boolean; // flag if the product is external (not in DB)
  externalLink?: string; // Link to buy the external product
  note?: string; // Additional notes (e.g., "Bought at pharmacy")
}

export enum RoutineStepType {
  MORNING = 'morning',
  NOON = 'noon',
  EVENING = 'evening',
  ORAL = 'oral',
  OTHER = 'other',
}

@Entity('routine_details')
export class RoutineDetail {
  @PrimaryGeneratedColumn('uuid')
  routineDetailId: string;

  @Column({
    type: 'json',
    nullable: true,
  })
  products: RoutineProductItem[];

  @Column({
    type: 'varchar',
    nullable: true,
    default: 'other',
  })
  stepType: RoutineStepType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => TreatmentRoutine, (routine) => routine.routineDetails)
  @JoinColumn({ name: 'routineId' })
  treatmentRoutine: TreatmentRoutine;
}
