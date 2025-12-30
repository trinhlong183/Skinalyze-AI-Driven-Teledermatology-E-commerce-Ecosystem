import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('addresses')
export class Address {
  @ApiProperty({
    description: 'Address unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  addressId: string;

  @ApiProperty({
    description: 'User ID who owns this address',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @Column()
  userId: string;

  @ApiProperty({
    description: 'Full street address',
    example: '123 Nguyen Hue Street',
  })
  @Column()
  street: string;

  @ApiProperty({
    description: 'Street address line 1',
    example: 'Building A, Floor 5',
    required: false,
  })
  @Column({ nullable: true })
  streetLine1: string;

  @ApiProperty({
    description: 'Street address line 2',
    example: 'Apartment 502',
    required: false,
  })
  @Column({ nullable: true })
  streetLine2: string;

  @ApiProperty({
    description: 'Ward or Sub-district',
    example: 'Ben Nghe Ward',
  })
  @Column()
  wardOrSubDistrict: string;

  @ApiProperty({
    description: 'District',
    example: 'District 1',
  })
  @Column()
  district: string;

  @ApiProperty({
    description: 'City or Province',
    example: 'Ho Chi Minh City',
  })
  @Column()
  city: string;

  @ApiProperty({
    description: 'GHN District ID (optional)',
    example: 1442,
    required: false,
  })
  @Column({ nullable: true, type: 'int' })
  districtId?: number;

  @ApiProperty({
    description: 'GHN Ward Code (optional)',
    example: '21211',
    required: false,
  })
  @Column({ nullable: true, length: 20 })
  wardCode?: string;

  @ApiProperty({
    description: 'Address creation timestamp',
    example: '2025-10-03T10:30:00.000Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Address last update timestamp',
    example: '2025-10-03T10:30:00.000Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relationship: Many addresses belong to one user
  @ManyToOne('User', 'addresses', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: any;
}
