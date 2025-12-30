import { Test, TestingModule } from '@nestjs/testing';
import { SkinAnalysisService } from './skin-analysis.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import { SkinAnalysis } from './entities/skin-analysis.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CustomersService } from '../customers/customers.service';
import { CreateManualAnalysisDto } from './dto/create-manual-analysis.dto';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SkinAnalysisService', () => {
  let service: SkinAnalysisService;
  let skinAnalysisRepository: jest.Mocked<Repository<SkinAnalysis>>;
  let customerRepository: jest.Mocked<Repository<Customer>>;
  let productRepository: jest.Mocked<any>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;
  let customersService: jest.Mocked<CustomersService>;
  let configService: jest.Mocked<ConfigService>;

  // ==================== MOCK SETUP ====================
  const mockSkinAnalysisRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockCustomerRepository = {
    findOne: jest.fn(),
  };

  const mockProductRepository = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn(),
  };

  const mockCustomersService = {
    findByUserId: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  // ==================== TEST DATA ====================
  const mockCustomer: Customer = {
    customerId: 'customer-123',
    user: {} as any,
    aiUsageAmount: 0,
    pastDermatologicalHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    customerSubscriptions: [],
    appointments: [],
    skinAnalyses: [],
    treatmentRoutines: [],
  };

  const mockAnalysis: SkinAnalysis = {
    analysisId: 'analysis-123',
    customerId: 'customer-123',
    source: 'AI_SCAN',
    chiefComplaint: null,
    patientSymptoms: null,
    notes: 'facial',
    imageUrls: ['https://cloudinary.com/image.jpg'],
    aiDetectedDisease: 'Acne',
    aiDetectedCondition: null,
    aiRecommendedProducts: ['prod-1', 'prod-2'],
    mask: ['https://cloudinary.com/mask.jpg'],
    confidence: 0.95,
    allPredictions: { Acne: 0.95, Eczema: 0.05 },
    customer: mockCustomer,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('test-image-data'),
    size: 1024,
    stream: {} as any,
    destination: '',
    filename: '',
    path: '',
  };

  const mockProduct: Product = {
    productId: 'prod-1',
    productName: 'Acne Treatment',
    productDescription: 'Treatment for acne',
    stock: 50,
    categories: [],
    brand: 'Test Brand',
    sellingPrice: 100000,
    productImages: [],
    ingredients: 'test ingredients',
    suitableFor: [],
    reviews: [],
    salePercentage: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ==================== BEFORE EACH ====================
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkinAnalysisService,
        {
          provide: getRepositoryToken(SkinAnalysis),
          useValue: mockSkinAnalysisRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SkinAnalysisService>(SkinAnalysisService);
    skinAnalysisRepository = module.get(getRepositoryToken(SkinAnalysis));
    customerRepository = module.get(getRepositoryToken(Customer));
    productRepository = module.get(getRepositoryToken(Product));
    cloudinaryService = module.get(CloudinaryService);
    customersService = module.get(CustomersService);
    configService = module.get(ConfigService);

    // Set default AI service URL
    mockConfigService.get.mockReturnValue('http://localhost:8000');
  });

  // ==================== AFTER EACH ====================
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== BASIC TEST ====================
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== FUNCTION: detectFace (001) ====================
  describe('detectFace', () => {
    // TC-SKIN-001-01: Normal case - Face detected
    it('TC-SKIN-001-01: should return true when face is detected', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({
        data: { has_face: true },
      });

      // Act
      const result = await service.detectFace(mockFile);

      // Assert
      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/face-detection',
        expect.any(Object),
        expect.any(Object),
      );
    });

    // TC-SKIN-001-02: Normal case - No face detected
    it('TC-SKIN-001-02: should return false when no face is detected', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({
        data: { has_face: false },
      });

      // Act
      const result = await service.detectFace(mockFile);

      // Assert
      expect(result).toBe(false);
    });

    // TC-SKIN-001-03: Abnormal case - AI service error (defaults to true)
    it('TC-SKIN-001-03: should return true when AI service fails', async () => {
      // Arrange
      mockedAxios.post.mockRejectedValue(new Error('AI Service unavailable'));

      // Act
      const result = await service.detectFace(mockFile);

      // Assert
      expect(result).toBe(true);
    });
  });

  // ==================== FUNCTION: classifyDisease (002) ====================
  describe('classifyDisease', () => {
    const mockClassificationResult = {
      predicted_class: 'Acne',
      confidence: 0.95,
      all_predictions: { Acne: 0.95, Eczema: 0.05 },
      product_suggestions: ['Acne Treatment', 'Cleanser'],
    };

    // TC-SKIN-002-01: Normal case - Successful classification
    it('TC-SKIN-002-01: should classify disease successfully', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({
        data: mockClassificationResult,
      });

      // Act
      const result = await service.classifyDisease(mockFile);

      // Assert
      expect(result).toEqual(mockClassificationResult);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/classification-disease',
        expect.any(Object),
        expect.any(Object),
      );
    });

    // TC-SKIN-002-02: Normal case - Classification with notes
    it('TC-SKIN-002-02: should classify disease with notes', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({
        data: mockClassificationResult,
      });

      // Act
      const result = await service.classifyDisease(mockFile, 'facial');

      // Assert
      expect(result).toEqual(mockClassificationResult);
    });

    // TC-SKIN-002-03: Abnormal case - AI service returns 500
    it('TC-SKIN-002-03: should throw HttpException when AI service returns error', async () => {
      // Arrange
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      });

      // Act & Assert
      await expect(service.classifyDisease(mockFile)).rejects.toThrow(
        'Internal server error',
      );
    });

    // TC-SKIN-002-04: Abnormal case - Cannot connect to AI service
    it('TC-SKIN-002-04: should throw BadGatewayException when cannot connect', async () => {
      // Arrange
      mockedAxios.post.mockRejectedValue({
        request: {},
      });

      // Act & Assert
      await expect(service.classifyDisease(mockFile)).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  // ==================== FUNCTION: segmentDisease (003) ====================
  describe('segmentDisease', () => {
    const mockSegmentationResult = {
      mask: 'base64EncodedMask',
      lesion_on_black: 'base64EncodedLesion',
    };

    // TC-SKIN-003-01: Normal case - Successful segmentation
    it('TC-SKIN-003-01: should segment disease successfully', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({
        data: mockSegmentationResult,
      });

      // Act
      const result = await service.segmentDisease(mockFile);

      // Assert
      expect(result).toEqual(mockSegmentationResult);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/segmentation-disease',
        expect.any(Object),
        expect.any(Object),
      );
    });

    // TC-SKIN-003-02: Abnormal case - Segmentation service error
    it('TC-SKIN-003-02: should throw exception when segmentation fails', async () => {
      // Arrange
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Invalid image format' },
        },
      });

      // Act & Assert
      await expect(service.segmentDisease(mockFile)).rejects.toThrow();
    });
  });

  // ==================== FUNCTION: createManualEntry (004) ====================
  describe('createManualEntry', () => {
    const mockDto: CreateManualAnalysisDto = {
      chiefComplaint: 'Itchy skin',
      patientSymptoms: 'Redness, swelling',
      notes: 'Started yesterday',
    };

    // TC-SKIN-004-01: Normal case - Create manual entry without files
    it('TC-SKIN-004-01: should create manual entry without files', async () => {
      // Arrange
      mockCustomersService.findByUserId.mockResolvedValue(mockCustomer);
      mockSkinAnalysisRepository.create.mockReturnValue(mockAnalysis);
      mockSkinAnalysisRepository.save.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.createManualEntry('user-123', mockDto);

      // Assert
      expect(result).toBeDefined();
      expect(mockCustomersService.findByUserId).toHaveBeenCalledWith(
        'user-123',
      );
      expect(mockSkinAnalysisRepository.save).toHaveBeenCalled();
    });

    // TC-SKIN-004-02: Normal case - Create manual entry with files
    it('TC-SKIN-004-02: should create manual entry with files', async () => {
      // Arrange
      mockCustomersService.findByUserId.mockResolvedValue(mockCustomer);
      mockCloudinaryService.uploadImage.mockResolvedValue({
        secure_url: 'https://cloudinary.com/uploaded.jpg',
        public_id: 'public-id',
      });
      mockSkinAnalysisRepository.create.mockReturnValue(mockAnalysis);
      mockSkinAnalysisRepository.save.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.createManualEntry('user-123', mockDto, [
        mockFile,
      ]);

      // Assert
      expect(result).toBeDefined();
      expect(mockCloudinaryService.uploadImage).toHaveBeenCalledTimes(1);
    });

    // TC-SKIN-004-03: Normal case - Create manual entry with multiple files
    it('TC-SKIN-004-03: should create manual entry with multiple files', async () => {
      // Arrange
      mockCustomersService.findByUserId.mockResolvedValue(mockCustomer);
      mockCloudinaryService.uploadImage.mockResolvedValue({
        secure_url: 'https://cloudinary.com/uploaded.jpg',
        public_id: 'public-id',
      });
      mockSkinAnalysisRepository.create.mockReturnValue(mockAnalysis);
      mockSkinAnalysisRepository.save.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.createManualEntry('user-123', mockDto, [
        mockFile,
        mockFile,
      ]);

      // Assert
      expect(result).toBeDefined();
      expect(mockCloudinaryService.uploadImage).toHaveBeenCalledTimes(2);
    });

    // TC-SKIN-004-04: Abnormal case - Customer not found
    it('TC-SKIN-004-04: should throw error when customer not found', async () => {
      // Arrange
      mockCustomersService.findByUserId.mockRejectedValue(
        new NotFoundException('Customer not found'),
      );

      // Act & Assert
      await expect(
        service.createManualEntry('invalid-user', mockDto),
      ).rejects.toThrow(NotFoundException);
    });

    // TC-SKIN-004-05: Abnormal case - Cloudinary upload fails
    it('TC-SKIN-004-05: should throw BadGatewayException when upload fails', async () => {
      // Arrange
      mockCustomersService.findByUserId.mockResolvedValue(mockCustomer);
      mockCloudinaryService.uploadImage.mockRejectedValue(
        new Error('Upload failed'),
      );

      // Act & Assert
      await expect(
        service.createManualEntry('user-123', mockDto, [mockFile]),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  // ==================== FUNCTION: diseaseDetection (005) ====================
  describe('diseaseDetection', () => {
    const mockClassificationResult = {
      predicted_class: 'Acne',
      confidence: 0.95,
      all_predictions: { Acne: 0.95, Eczema: 0.05 },
      product_suggestions: ['Acne Treatment'],
    };

    const mockSegmentationResult = {
      mask: 'base64EncodedMask',
      lesion_on_black: 'base64EncodedLesion',
    };

    // TC-SKIN-005-01: Normal case - Successful disease detection
    it('TC-SKIN-005-01: should detect disease successfully', async () => {
      // Arrange
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      mockCloudinaryService.uploadImage.mockResolvedValue({
        secure_url: 'https://cloudinary.com/image.jpg',
        public_id: 'public-id',
      });
      mockedAxios.post.mockImplementation((url: string) => {
        if (url.includes('classification')) {
          return Promise.resolve({ data: mockClassificationResult });
        }
        if (url.includes('segmentation')) {
          return Promise.resolve({ data: mockSegmentationResult });
        }
        return Promise.resolve({ data: {} });
      });
      mockProductRepository.createQueryBuilder().getMany.mockResolvedValue([
        mockProduct,
      ]);
      mockSkinAnalysisRepository.create.mockReturnValue(mockAnalysis);
      mockSkinAnalysisRepository.save.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.diseaseDetection(
        mockFile,
        'customer-123',
        undefined,
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockCustomerRepository.findOne).toHaveBeenCalledWith({
        where: { customerId: 'customer-123' },
      });
      expect(mockCloudinaryService.uploadImage).toHaveBeenCalled();
      expect(mockSkinAnalysisRepository.save).toHaveBeenCalled();
    });

    // TC-SKIN-005-02: Normal case - Detection with facial notes and face check
    it('TC-SKIN-005-02: should check face when notes is facial', async () => {
      // Arrange
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      mockedAxios.post.mockImplementation((url: string) => {
        if (url.includes('face-detection')) {
          return Promise.resolve({ data: { has_face: true } });
        }
        if (url.includes('classification')) {
          return Promise.resolve({ data: mockClassificationResult });
        }
        if (url.includes('segmentation')) {
          return Promise.resolve({ data: mockSegmentationResult });
        }
        return Promise.resolve({ data: {} });
      });
      mockCloudinaryService.uploadImage.mockResolvedValue({
        secure_url: 'https://cloudinary.com/image.jpg',
        public_id: 'public-id',
      });
      mockProductRepository.createQueryBuilder().getMany.mockResolvedValue([]);
      mockSkinAnalysisRepository.create.mockReturnValue(mockAnalysis);
      mockSkinAnalysisRepository.save.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.diseaseDetection(
        mockFile,
        'customer-123',
        'facial',
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('face-detection'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    // TC-SKIN-005-03: Abnormal case - Customer not found
    it('TC-SKIN-005-03: should throw NotFoundException when customer not found', async () => {
      // Arrange
      mockCustomerRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.diseaseDetection(mockFile, 'invalid-customer'),
      ).rejects.toThrow(NotFoundException);
    });

    // TC-SKIN-005-04: Abnormal case - No face detected for facial analysis
    it('TC-SKIN-005-04: should throw BadRequestException when no face detected', async () => {
      // Arrange
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      mockedAxios.post.mockResolvedValue({
        data: { has_face: false },
      });

      // Act & Assert
      await expect(
        service.diseaseDetection(mockFile, 'customer-123', 'facial'),
      ).rejects.toThrow(BadRequestException);
    });

    // TC-SKIN-005-05: Abnormal case - Cloudinary upload fails
    it('TC-SKIN-005-05: should throw error when image upload fails', async () => {
      // Arrange
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      mockedAxios.post.mockResolvedValue({
        data: { has_face: true },
      });
      mockCloudinaryService.uploadImage.mockRejectedValue(
        new Error('Upload failed'),
      );

      // Act & Assert
      await expect(
        service.diseaseDetection(mockFile, 'customer-123', 'facial'),
      ).rejects.toThrow();
    });

    // TC-SKIN-005-06: Normal case - No products found for suggestions
    it('TC-SKIN-005-06: should handle case when no products found', async () => {
      // Arrange
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      mockCloudinaryService.uploadImage.mockResolvedValue({
        secure_url: 'https://cloudinary.com/image.jpg',
        public_id: 'public-id',
      });
      mockedAxios.post.mockImplementation((url: string) => {
        if (url.includes('classification')) {
          return Promise.resolve({ data: mockClassificationResult });
        }
        if (url.includes('segmentation')) {
          return Promise.resolve({ data: mockSegmentationResult });
        }
        return Promise.resolve({ data: {} });
      });
      mockProductRepository.createQueryBuilder().getMany.mockResolvedValue([]);
      const analysisWithoutProducts = { ...mockAnalysis, aiRecommendedProducts: null };
      mockSkinAnalysisRepository.create.mockReturnValue(analysisWithoutProducts);
      mockSkinAnalysisRepository.save.mockResolvedValue(analysisWithoutProducts);

      // Act
      const result = await service.diseaseDetection(
        mockFile,
        'customer-123',
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.aiRecommendedProducts).toBeNull();
    });
  });

  // ==================== FUNCTION: findOne (006) ====================
  describe('findOne', () => {
    // TC-SKIN-006-01: Normal case - Find analysis by ID
    it('TC-SKIN-006-01: should return analysis when id exists', async () => {
      // Arrange
      mockSkinAnalysisRepository.findOne.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.findOne('analysis-123');

      // Assert
      expect(result).toEqual(mockAnalysis);
      expect(mockSkinAnalysisRepository.findOne).toHaveBeenCalledWith({
        where: { analysisId: 'analysis-123' },
        relations: ['customer'],
      });
    });

    // TC-SKIN-006-02: Abnormal case - Analysis not found
    it('TC-SKIN-006-02: should throw NotFoundException when analysis not found', async () => {
      // Arrange
      mockSkinAnalysisRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Analysis with ID "invalid-id" not found',
      );
    });
  });

  // ==================== FUNCTION: findByCustomerId (007) ====================
  describe('findByCustomerId', () => {
    // TC-SKIN-007-01: Normal case - Find analyses by customer ID
    it('TC-SKIN-007-01: should return all analyses for customer', async () => {
      // Arrange
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      mockSkinAnalysisRepository.find.mockResolvedValue([
        mockAnalysis,
        mockAnalysis,
      ]);

      // Act
      const result = await service.findByCustomerId('customer-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(mockCustomerRepository.findOne).toHaveBeenCalledWith({
        where: { customerId: 'customer-123' },
      });
      expect(mockSkinAnalysisRepository.find).toHaveBeenCalledWith({
        where: { customerId: 'customer-123' },
        order: { createdAt: 'DESC' },
      });
    });

    // TC-SKIN-007-02: Normal case - Empty result for valid customer
    it('TC-SKIN-007-02: should return empty array when no analyses found', async () => {
      // Arrange
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      mockSkinAnalysisRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findByCustomerId('customer-123');

      // Assert
      expect(result).toEqual([]);
    });

    // TC-SKIN-007-03: Abnormal case - Customer not found
    it('TC-SKIN-007-03: should throw NotFoundException when customer not found', async () => {
      // Arrange
      mockCustomerRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findByCustomerId('invalid-customer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== FUNCTION: findAll (008) ====================
  describe('findAll', () => {
    // TC-SKIN-008-01: Normal case - Find all analyses
    it('TC-SKIN-008-01: should return all analyses', async () => {
      // Arrange
      mockSkinAnalysisRepository.find.mockResolvedValue([
        mockAnalysis,
        mockAnalysis,
      ]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(mockSkinAnalysisRepository.find).toHaveBeenCalledWith({
        relations: ['customer'],
        order: { createdAt: 'DESC' },
      });
    });

    // TC-SKIN-008-02: Normal case - Empty database
    it('TC-SKIN-008-02: should return empty array when no analyses exist', async () => {
      // Arrange
      mockSkinAnalysisRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });
});
