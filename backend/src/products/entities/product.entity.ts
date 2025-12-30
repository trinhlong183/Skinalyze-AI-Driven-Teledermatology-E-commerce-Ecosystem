import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  productId: string;

  @Column({ type: 'varchar', length: 255 })
  productName: string;

  @Column({ type: 'text' })
  productDescription: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @ManyToMany(() => Category)
  @JoinTable({
    name: 'product_categories',
    joinColumn: { name: 'productId', referencedColumnName: 'productId' },
    inverseJoinColumn: {
      name: 'categoryId',
      referencedColumnName: 'categoryId',
    },
  })
  categories: Category[];

  @Column({ type: 'varchar', length: 100 })
  brand: string;

  @Column({ type: 'int' })
  sellingPrice: number;

  @Column({ type: 'simple-array' })
  productImages: string[];

  @Column({ type: 'text' })
  ingredients: string;

  @Column({ type: 'simple-array' })
  suitableFor: string[];

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: 0,
  })
  salePercentage: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
