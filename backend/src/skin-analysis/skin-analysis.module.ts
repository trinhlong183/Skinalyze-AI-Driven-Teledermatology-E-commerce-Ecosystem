import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SkinAnalysisController } from './skin-analysis.controller';
import { SkinAnalysisService } from './skin-analysis.service';
import { SkinAnalysis } from './entities/skin-analysis.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity'
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { CustomersModule } from 'src/customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SkinAnalysis, Customer, Product]),
    CustomersModule,
    ConfigModule,
    CloudinaryModule,
  ],
  controllers: [SkinAnalysisController],
  providers: [SkinAnalysisService],
  exports: [SkinAnalysisService],
})
export class SkinAnalysisModule {}
