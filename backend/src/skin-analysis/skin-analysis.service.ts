import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, In } from 'typeorm';
import { SkinAnalysis } from './entities/skin-analysis.entity';
import { CreateManualAnalysisDto } from './dto/create-manual-analysis.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import axios from 'axios';
import * as FormData from 'form-data';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class SkinAnalysisService {
  private readonly logger = new Logger(SkinAnalysisService.name);
  private readonly aiServiceUrl: string;

  private readonly DISEASE_TO_SKIN_TYPES: Record<string, string[]> = {
    warts: ['combination', 'dry', 'normal', 'oily', 'sensitive'],
    acne: ['combination', 'oily', 'sensitive'],
    actinic_keratosis: ['dry', 'normal'],
    drug_eruption: ['combination', 'dry', 'normal', 'oily', 'sensitive'],
    eczema: ['combination', 'dry', 'normal', 'oily', 'sensitive'],
    psoriasis: ['dry'],
    rosacea: ['combination', 'oily', 'sensitive'],
    seborrh_keratoses: ['normal', 'oily', 'sensitive'],
    sun_sunlight_damage: ['combination', 'dry', 'normal', 'sensitive'],
    tinea: ['combination', 'oily'],
    normal: ['normal'],
  };

  constructor(
    @InjectRepository(SkinAnalysis)
    private skinAnalysisRepository: Repository<SkinAnalysis>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private configService: ConfigService,
    private cloudinaryService: CloudinaryService,
    private readonly customersService: CustomersService,
  ) {
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      'http://localhost:8000';
  }

  private createFormData(file: Express.Multer.File): FormData {
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    return formData;
  }

  private handleAxiosError(error: any, context: string) {
    this.logger.error(`AI Service Error [${context}]:`, error.message);

    if (error.response) {
      throw new HttpException(
        error.response.data?.detail ||
          error.response.data?.message ||
          'AI Service Error',
        error.response.status,
      );
    } else if (error.request) {
      throw new BadGatewayException(
        'Cannot connect to AI Service. Please try again later.',
      );
    }
    throw new HttpException('Internal Error', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  // ✅ 1. Validate Customer & Load User Profile
  private async validateCustomer(customerId: string): Promise<Customer> {
    try {
      const customer = await this.customerRepository.findOne({
        where: { customerId },
        relations: ['user'], // Eager load User entity
      });
      if (!customer) {
        throw new NotFoundException(`Customer ID ${customerId} not found`);
      }
      return customer;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new BadRequestException('Invalid Customer ID format');
    }
  }

  // ✅ 2. Calculate Age Helper
  private calculateAge(dob: string | Date | null): number | null {
    if (!dob) return null;
    
    const birthDate = new Date(dob);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age > 0 ? age : null;
  }

  private async uploadBase64ToCloudinary(
    base64String: string,
    folder: string,
  ): Promise<string | null> {
    try {
      // Remove header if present
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const mockFile: any = {
        buffer: buffer,
        originalname: `mask_${Date.now()}.png`,
        mimetype: 'image/png',
      };

      const uploadResult = await this.cloudinaryService.uploadImage(
        mockFile,
        folder,
      );
      return uploadResult.secure_url;
    } catch (error) {
      this.logger.error('Failed to upload Base64 mask to Cloudinary', error);
      return null;
    }
  }

  // ✅ 3. NEW: Match Products & Return { productId, reason }
  private async matchProductsWithReasons(
    suggestions: { product_name: string; reason: string }[],
  ): Promise<{ productId: string; reason: string }[]> {
    if (!suggestions || suggestions.length === 0) {
      return [];
    }

    const productNames = suggestions.map((s) => s.product_name);

    try {
      this.logger.debug(`Matching products for: ${productNames.join(', ')}`);

      // Search DB for products matching names
      const products = await this.productRepository
        .createQueryBuilder('product')
        .where(
          productNames
            .map(
              (_, index) =>
                `LOWER(product.productName) LIKE LOWER(:name${index})`,
            )
            .join(' OR '),
          productNames.reduce((acc, name, index) => {
            acc[`name${index}`] = `%${name.trim()}%`;
            return acc;
          }, {}),
        )
        .select(['product.productId', 'product.productName']) // Only select necessary fields
        .getMany();

      const matchedResults: { productId: string; reason: string }[] = [];

      for (const suggestion of suggestions) {
        // Find DB product that matches AI suggestion
        const match = products.find(
          (p) =>
            p.productName
              .toLowerCase()
              .includes(suggestion.product_name.toLowerCase()) ||
            suggestion.product_name
              .toLowerCase()
              .includes(p.productName.toLowerCase()),
        );

        if (match) {
          // ✅ Construct object with ONLY productId and reason
          matchedResults.push({
            productId: match.productId,
            reason: suggestion.reason,
          });
        }
      }

      this.logger.debug(
        `Matched ${matchedResults.length} products with reasons.`,
      );
      return matchedResults;
    } catch (error) {
      this.logger.error('Error matching products with reasons:', error);
      return [];
    }
  }

  async detectFace(file: Express.Multer.File): Promise<boolean> {
    try {
      const formData = this.createFormData(file);
      const response = await axios.post(
        `${this.aiServiceUrl}/api/face-detection`,
        formData,
        { headers: { ...formData.getHeaders() } },
      );
      return response.data.has_face;
    } catch (error) {
      this.logger.warn(
        `Face detection service warning: ${error.message}. Defaulting to true.`,
      );
      return true;
    }
  }

  // ✅ 4. Updated: Pass metadata to FastAPI
  async classifyDisease(
    file: Express.Multer.File,
    notes?: string,
    age?: number,
    gender?: string,
    allergies?: string,
  ) {
    try {
      const formData = this.createFormData(file);

      if (notes) formData.append('notes', notes);

      // Append personalization parameters
      if (age !== null && age !== undefined) {
        formData.append('age', age.toString());
      }

      if (gender) {
        formData.append('gender', gender);
      }

      if (allergies) {
        formData.append('allergies', allergies);
      }

      const response = await axios.post(
        `${this.aiServiceUrl}/api/classification-disease`,
        formData,
        { headers: { ...formData.getHeaders() }, timeout: 60000 }, // 60 seconds timeout
      );
      return response.data;
    } catch (error) {
      this.handleAxiosError(error, 'disease classification');
    }
  }

  async segmentDisease(file: Express.Multer.File) {
    try {
      const formData = this.createFormData(file);
      const response = await axios.post(
        `${this.aiServiceUrl}/api/segmentation-disease`,
        formData,
        { headers: { ...formData.getHeaders() } },
      );
      return response.data;
    } catch (error) {
      this.handleAxiosError(error, 'segmentation');
    }
  }

  async createManualEntry(
    userId: string,
    dto: CreateManualAnalysisDto,
    files?: Express.Multer.File[],
  ): Promise<SkinAnalysis> {
    const customer = await this.customersService.findByUserId(userId);

    let imageUrls: string[] = [];
    if (files && files.length > 0) {
      this.logger.debug(
        `Uploading ${files.length} manual images to Cloudinary...`,
      );
      try {
        const uploadPromises = files.map((file) =>
          this.cloudinaryService.uploadImage(
            file,
            'skin-analysis/manual-uploads',
          ),
        );

        const uploadResults = await Promise.all(uploadPromises);

        imageUrls = uploadResults.map((result) => result.secure_url);
      } catch (error) {
        this.logger.error('Cloudinary Upload Failed', error);
        throw new BadGatewayException('Failed to upload one or more images');
      }
    }

    const analysisData: DeepPartial<SkinAnalysis> = {
      customerId: customer.customerId,
      source: 'MANUAL',
      chiefComplaint: dto.chiefComplaint,
      patientSymptoms: dto.patientSymptoms,
      notes: dto.notes ?? null,
      imageUrls: imageUrls,
      aiDetectedDisease: null,
      aiDetectedCondition: null,
      aiRecommendedProducts: null,
      mask: null,
      confidence: null,
      allPredictions: null,
    };

    const entity = this.skinAnalysisRepository.create(analysisData);
    const savedAnalysis = await this.skinAnalysisRepository.save(entity);

    return savedAnalysis;
  }

  async diseaseDetection(
    file: Express.Multer.File,
    customerId: string,
    notes?: string,
  ): Promise<SkinAnalysis> {
    this.logger.log(`Starting SEQUENTIAL disease detection for: ${customerId}`);

    // 1. Get User Context (Giữ nguyên)
    const customer = await this.validateCustomer(customerId);
    const user = customer.user;
    const age = this.calculateAge(user.dob);
    let genderStr = user.gender === true ? 'Male' : user.gender === false ? 'Female' : 'Other';
    const allergiesStr = user.allergies && Array.isArray(user.allergies) ? user.allergies.join(', ') : '';

    // 2. Upload Image (Giữ nguyên)
    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      'skin-analysis/disease-detection',
    );
    const imageUrl = uploadResult.secure_url;

    // 3. Call AI Service (CHỈ GỌI 1 API duy nhất)
    // API này giờ đã làm cả Segmentation -> Classification
    const analysisResult = await this.classifyDisease(file, notes, age as number, genderStr, allergiesStr);

    // 4. Xử lý Mask (Lấy từ kết quả analysisResult trả về)
    let maskUrls: string[] | null = null;
    
    // Kiểm tra xem backend Python trả về key nào (mask_base64 hay mask)
    // Trong code Python sửa đổi ở trên, tôi đặt tên là "mask_base64"
    if (analysisResult?.mask_base64) {
      this.logger.debug('Uploading segmentation mask from pipeline to Cloudinary...');
      const uploadedMaskUrl = await this.uploadBase64ToCloudinary(
        analysisResult.mask_base64,
        'skin-analysis/masks',
      );
      if (uploadedMaskUrl) {
        maskUrls = [uploadedMaskUrl];
      }
    }

    // 5. Xử lý Products (Giữ nguyên)
    let recommendedProductsData: any = null;
    if (
      analysisResult.product_suggestions &&
      Array.isArray(analysisResult.product_suggestions) &&
      analysisResult.product_suggestions.length > 0
    ) {
      recommendedProductsData = await this.matchProductsWithReasons(
        analysisResult.product_suggestions,
      );
    }

    // 6. Map Disease (Giữ nguyên)
    const detectedDisease = analysisResult.predicted_class;
    const skinConditions = this.mapDiseaseToConditions(detectedDisease);

    // 7. Save DB (Giữ nguyên)
    const skinAnalysisData: DeepPartial<SkinAnalysis> = {
      customerId,
      source: 'AI_SCAN',
      imageUrls: [imageUrl],
      notes: notes ?? null,
      aiDetectedDisease: detectedDisease,
      aiDetectedCondition: skinConditions ? skinConditions.join(', ') : null,
      confidence: analysisResult.confidence,
      allPredictions: analysisResult.all_predictions,
      aiRecommendedProducts: recommendedProductsData,
      mask: maskUrls, // Lưu URL mask đã upload
    };

    const entity = this.skinAnalysisRepository.create(skinAnalysisData);
    const savedAnalysis = await this.skinAnalysisRepository.save(entity);

    this.logger.log(`Disease analysis completed: ${savedAnalysis.analysisId}`);
    return savedAnalysis;
  }
  
  async findOne(analysisId: string): Promise<SkinAnalysis> {
    const analysis = await this.skinAnalysisRepository.findOne({
      where: { analysisId },
      relations: ['customer'],
    });

    if (!analysis) {
      throw new NotFoundException(`Analysis with ID "${analysisId}" not found`);
    }

    return analysis;
  }

  async findByCustomerId(customerId: string): Promise<SkinAnalysis[]> {
    await this.validateCustomer(customerId);
    return await this.skinAnalysisRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<SkinAnalysis[]> {
    return await this.skinAnalysisRepository.find({
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });
  }

  private mapDiseaseToConditions(disease: string | null): string[] | null {
    if (!disease) {
      return null;
    }

    const normalizedDisease = disease.toLowerCase().replace(/\s+/g, '_');

    if (this.DISEASE_TO_SKIN_TYPES[normalizedDisease]) {
      return this.DISEASE_TO_SKIN_TYPES[normalizedDisease];
    }

    for (const [key, conditions] of
      Object.entries(this.DISEASE_TO_SKIN_TYPES)) {
      if (
        normalizedDisease.includes(key) ||
        key.includes(normalizedDisease) ||
        normalizedDisease.replace(/_/g, '').includes(key.replace(/_/g, '')) ||
        key.replace(/_/g, '').includes(normalizedDisease.replace(/_/g, ''))
      ) {
        return conditions;
      }
    }

    this.logger.warn(`No skin condition mapping found for disease: ${disease}`);
    return null;
  }
}