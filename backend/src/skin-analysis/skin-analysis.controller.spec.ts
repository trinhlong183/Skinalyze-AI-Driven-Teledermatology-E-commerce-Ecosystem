import { Test, TestingModule } from '@nestjs/testing';
import { SkinAnalysisController } from './skin-analysis.controller';
import { SkinAnalysisService } from './skin-analysis.service';
import { CreateManualAnalysisDto } from './dto/create-manual-analysis.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { SkinAnalysis } from './entities/skin-analysis.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SkinAnalysisController', () => {
  let controller: SkinAnalysisController;
  let service: jest.Mocked<SkinAnalysisService>;

  // ==================== MOCK SETUP ====================
  const mockSkinAnalysisService = {
    diseaseDetection: jest.fn(),
    createManualEntry: jest.fn(),
    classifyDisease: jest.fn(),
    segmentDisease: jest.fn(),
    findOne: jest.fn(),
    findByCustomerId: jest.fn(),
    findAll: jest.fn(),
  };

  // ==================== TEST DATA ====================
  const mockUser: User = {
    userId: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    fullName: 'Test User',
    balance: 0,
    dob: undefined as any,
    photoUrl: undefined as any,
    phone: undefined as any,
    gender: true,
    role: UserRole.CUSTOMER,
    addresses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isVerified: true,
    emailVerificationToken: undefined as any,
    emailVerificationTokenExpiry: undefined as any,
    chatSessions: [],
    reviews: [],
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
    customer: {} as any,
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

  const mockManualDto: CreateManualAnalysisDto = {
    chiefComplaint: 'Itchy skin',
    patientSymptoms: 'Redness, swelling',
    notes: 'Started yesterday',
  };

  // ==================== BEFORE EACH ====================
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkinAnalysisController],
      providers: [
        {
          provide: SkinAnalysisService,
          useValue: mockSkinAnalysisService,
        },
      ],
    }).compile();

    controller = module.get<SkinAnalysisController>(SkinAnalysisController);
    service = module.get(SkinAnalysisService);
  });

  // ==================== AFTER EACH ====================
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== BASIC TEST ====================
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== ENDPOINT: diseaseDetection (001) ====================
  describe('diseaseDetection', () => {
    // TC-SKINC-001-01: Normal case - Successful disease detection
    it('TC-SKINC-001-01: should detect disease successfully', async () => {
      // Arrange
      mockSkinAnalysisService.diseaseDetection.mockResolvedValue(mockAnalysis);

      // Act
      const result = await controller.diseaseDetection(
        'customer-123',
        'facial',
        mockFile,
      );

      // Assert
      expect(result).toEqual(mockAnalysis);
      expect(mockSkinAnalysisService.diseaseDetection).toHaveBeenCalledWith(
        mockFile,
        'customer-123',
        'facial',
      );
    });

    // TC-SKINC-001-02: Normal case - Detection without notes
    it('TC-SKINC-001-02: should detect disease without notes', async () => {
      // Arrange
      mockSkinAnalysisService.diseaseDetection.mockResolvedValue(mockAnalysis);

      // Act
      const result = await controller.diseaseDetection(
        'customer-123',
        null as any,
        mockFile,
      );

      // Assert
      expect(result).toEqual(mockAnalysis);
      expect(mockSkinAnalysisService.diseaseDetection).toHaveBeenCalledWith(
        mockFile,
        'customer-123',
        null,
      );
    });

    // TC-SKINC-001-03: Normal case - Detection with facial notes
    it('TC-SKINC-001-03: should detect disease with facial notes', async () => {
      // Arrange
      const facialAnalysis = { ...mockAnalysis, notes: 'facial' };
      mockSkinAnalysisService.diseaseDetection.mockResolvedValue(
        facialAnalysis,
      );

      // Act
      const result = await controller.diseaseDetection(
        'customer-123',
        'facial',
        mockFile,
      );

      // Assert
      expect(result).toEqual(facialAnalysis);
    });

    // TC-SKINC-001-04: Abnormal case - Customer not found
    it('TC-SKINC-001-04: should throw NotFoundException when customer not found', async () => {
      // Arrange
      mockSkinAnalysisService.diseaseDetection.mockRejectedValue(
        new NotFoundException('Customer ID customer-123 not found'),
      );

      // Act & Assert
      await expect(
        controller.diseaseDetection('customer-123', 'facial', mockFile),
      ).rejects.toThrow(NotFoundException);
    });

    // TC-SKINC-001-05: Abnormal case - No face detected
    it('TC-SKINC-001-05: should throw BadRequestException when no face detected', async () => {
      // Arrange
      mockSkinAnalysisService.diseaseDetection.mockRejectedValue(
        new BadRequestException('No face detected'),
      );

      // Act & Assert
      await expect(
        controller.diseaseDetection('customer-123', 'facial', mockFile),
      ).rejects.toThrow(BadRequestException);
    });

    // TC-SKINC-001-06: Abnormal case - Service error
    it('TC-SKINC-001-06: should propagate service errors', async () => {
      // Arrange
      mockSkinAnalysisService.diseaseDetection.mockRejectedValue(
        new Error('Service error'),
      );

      // Act & Assert
      await expect(
        controller.diseaseDetection('customer-123', 'facial', mockFile),
      ).rejects.toThrow('Service error');
    });
  });

  // ==================== ENDPOINT: manualEntry (002) ====================
  describe('manualEntry', () => {
    // TC-SKINC-002-01: Normal case - Create manual entry without files
    it('TC-SKINC-002-01: should create manual entry without files', async () => {
      // Arrange
      const manualAnalysis = { ...mockAnalysis, source: 'MANUAL' as const };
      mockSkinAnalysisService.createManualEntry.mockResolvedValue(
        manualAnalysis,
      );

      // Act
      const result = await controller.manualEntry(
        mockUser,
        mockManualDto,
        undefined,
      );

      // Assert
      expect(result).toEqual(manualAnalysis);
      expect(mockSkinAnalysisService.createManualEntry).toHaveBeenCalledWith(
        'user-123',
        mockManualDto,
        undefined,
      );
    });

    // TC-SKINC-002-02: Normal case - Create manual entry with single file
    it('TC-SKINC-002-02: should create manual entry with single file', async () => {
      // Arrange
      const manualAnalysis = { ...mockAnalysis, source: 'MANUAL' as const };
      mockSkinAnalysisService.createManualEntry.mockResolvedValue(
        manualAnalysis,
      );

      // Act
      const result = await controller.manualEntry(mockUser, mockManualDto, [
        mockFile,
      ]);

      // Assert
      expect(result).toEqual(manualAnalysis);
      expect(mockSkinAnalysisService.createManualEntry).toHaveBeenCalledWith(
        'user-123',
        mockManualDto,
        [mockFile],
      );
    });

    // TC-SKINC-002-03: Normal case - Create manual entry with multiple files
    it('TC-SKINC-002-03: should create manual entry with multiple files', async () => {
      // Arrange
      const manualAnalysis = { ...mockAnalysis, source: 'MANUAL' as const };
      mockSkinAnalysisService.createManualEntry.mockResolvedValue(
        manualAnalysis,
      );
      const files = [mockFile, mockFile, mockFile];

      // Act
      const result = await controller.manualEntry(
        mockUser,
        mockManualDto,
        files,
      );

      // Assert
      expect(result).toEqual(manualAnalysis);
      expect(mockSkinAnalysisService.createManualEntry).toHaveBeenCalledWith(
        'user-123',
        mockManualDto,
        files,
      );
    });

    // TC-SKINC-002-04: Normal case - Manual entry with empty notes
    it('TC-SKINC-002-04: should create manual entry with empty notes', async () => {
      // Arrange
      const dtoWithoutNotes = {
        chiefComplaint: 'Itchy skin',
        patientSymptoms: 'Redness',
      };
      const manualAnalysis = { ...mockAnalysis, source: 'MANUAL' as const };
      mockSkinAnalysisService.createManualEntry.mockResolvedValue(
        manualAnalysis,
      );

      // Act
      const result = await controller.manualEntry(
        mockUser,
        dtoWithoutNotes as any,
        undefined,
      );

      // Assert
      expect(result).toEqual(manualAnalysis);
    });

    // TC-SKINC-002-05: Abnormal case - User not authenticated
    it('TC-SKINC-002-05: should handle missing user', async () => {
      // Arrange
      const invalidUser = { userId: undefined } as any;
      mockSkinAnalysisService.createManualEntry.mockRejectedValue(
        new Error('User not found'),
      );

      // Act & Assert
      await expect(
        controller.manualEntry(invalidUser, mockManualDto, undefined),
      ).rejects.toThrow();
    });

    // TC-SKINC-002-06: Abnormal case - Service error
    it('TC-SKINC-002-06: should propagate service errors', async () => {
      // Arrange
      mockSkinAnalysisService.createManualEntry.mockRejectedValue(
        new Error('Service error'),
      );

      // Act & Assert
      await expect(
        controller.manualEntry(mockUser, mockManualDto, undefined),
      ).rejects.toThrow('Service error');
    });
  });

  // ==================== ENDPOINT: classifyImage (003) ====================
  describe('classifyImage', () => {
    const mockClassificationResult = {
      predicted_class: 'Acne',
      confidence: 0.95,
      all_predictions: { Acne: 0.95, Eczema: 0.05 },
      product_suggestions: ['Acne Treatment'],
    };

    // TC-SKINC-003-01: Normal case - Classify image without notes
    it('TC-SKINC-003-01: should classify image successfully', async () => {
      // Arrange
      mockSkinAnalysisService.classifyDisease.mockResolvedValue(
        mockClassificationResult,
      );

      // Act
      const result = await controller.classifyImage(mockFile, null as any);

      // Assert
      expect(result).toEqual(mockClassificationResult);
      expect(mockSkinAnalysisService.classifyDisease).toHaveBeenCalledWith(
        mockFile,
        null,
      );
    });

    // TC-SKINC-003-02: Normal case - Classify image with notes
    it('TC-SKINC-003-02: should classify image with notes', async () => {
      // Arrange
      mockSkinAnalysisService.classifyDisease.mockResolvedValue(
        mockClassificationResult,
      );

      // Act
      const result = await controller.classifyImage(mockFile, 'facial');

      // Assert
      expect(result).toEqual(mockClassificationResult);
      expect(mockSkinAnalysisService.classifyDisease).toHaveBeenCalledWith(
        mockFile,
        'facial',
      );
    });

    // TC-SKINC-003-03: Abnormal case - Classification fails
    it('TC-SKINC-003-03: should handle classification errors', async () => {
      // Arrange
      mockSkinAnalysisService.classifyDisease.mockRejectedValue(
        new Error('Classification failed'),
      );

      // Act & Assert
      await expect(
        controller.classifyImage(mockFile, null as any),
      ).rejects.toThrow('Classification failed');
    });
  });

  // ==================== ENDPOINT: segmentImage (004) ====================
  describe('segmentImage', () => {
    const mockSegmentationResult = {
      mask: 'base64EncodedMask',
      lesion_on_black: 'base64EncodedLesion',
    };

    // TC-SKINC-004-01: Normal case - Segment image successfully
    it('TC-SKINC-004-01: should segment image successfully', async () => {
      // Arrange
      mockSkinAnalysisService.segmentDisease.mockResolvedValue(
        mockSegmentationResult,
      );

      // Act
      const result = await controller.segmentImage(mockFile);

      // Assert
      expect(result).toEqual(mockSegmentationResult);
      expect(mockSkinAnalysisService.segmentDisease).toHaveBeenCalledWith(
        mockFile,
      );
    });

    // TC-SKINC-004-02: Abnormal case - Segmentation fails
    it('TC-SKINC-004-02: should handle segmentation errors', async () => {
      // Arrange
      mockSkinAnalysisService.segmentDisease.mockRejectedValue(
        new Error('Segmentation failed'),
      );

      // Act & Assert
      await expect(controller.segmentImage(mockFile)).rejects.toThrow(
        'Segmentation failed',
      );
    });
  });

  // ==================== ENDPOINT: findOne (005) ====================
  describe('findOne', () => {
    // TC-SKINC-005-01: Normal case - Find analysis by ID
    it('TC-SKINC-005-01: should return analysis when id exists', async () => {
      // Arrange
      mockSkinAnalysisService.findOne.mockResolvedValue(mockAnalysis);

      // Act
      const result = await controller.findOne('analysis-123');

      // Assert
      expect(result).toEqual(mockAnalysis);
      expect(mockSkinAnalysisService.findOne).toHaveBeenCalledWith(
        'analysis-123',
      );
    });

    // TC-SKINC-005-02: Abnormal case - Analysis not found
    it('TC-SKINC-005-02: should throw NotFoundException when analysis not found', async () => {
      // Arrange
      mockSkinAnalysisService.findOne.mockRejectedValue(
        new NotFoundException('Analysis with ID "invalid-id" not found'),
      );

      // Act & Assert
      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    // TC-SKINC-005-03: Boundary case - Empty string ID
    it('TC-SKINC-005-03: should handle empty string ID', async () => {
      // Arrange
      mockSkinAnalysisService.findOne.mockRejectedValue(
        new NotFoundException('Analysis with ID "" not found'),
      );

      // Act & Assert
      await expect(controller.findOne('')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== ENDPOINT: findByCustomerId (006) ====================
  describe('findByCustomerId', () => {
    // TC-SKINC-006-01: Normal case - Find analyses by customer ID
    it('TC-SKINC-006-01: should return all analyses for customer', async () => {
      // Arrange
      const analyses = [mockAnalysis, mockAnalysis];
      mockSkinAnalysisService.findByCustomerId.mockResolvedValue(analyses);

      // Act
      const result = await controller.findByCustomerId('customer-123');

      // Assert
      expect(result).toEqual(analyses);
      expect(result).toHaveLength(2);
      expect(mockSkinAnalysisService.findByCustomerId).toHaveBeenCalledWith(
        'customer-123',
      );
    });

    // TC-SKINC-006-02: Normal case - Empty result for valid customer
    it('TC-SKINC-006-02: should return empty array when no analyses found', async () => {
      // Arrange
      mockSkinAnalysisService.findByCustomerId.mockResolvedValue([]);

      // Act
      const result = await controller.findByCustomerId('customer-123');

      // Assert
      expect(result).toEqual([]);
    });

    // TC-SKINC-006-03: Abnormal case - Customer not found
    it('TC-SKINC-006-03: should throw NotFoundException when customer not found', async () => {
      // Arrange
      mockSkinAnalysisService.findByCustomerId.mockRejectedValue(
        new NotFoundException('Customer ID invalid-customer not found'),
      );

      // Act & Assert
      await expect(
        controller.findByCustomerId('invalid-customer'),
      ).rejects.toThrow(NotFoundException);
    });

    // TC-SKINC-006-04: Normal case - Multiple analyses sorted by date
    it('TC-SKINC-006-04: should return analyses sorted by date', async () => {
      // Arrange
      const analysis1 = {
        ...mockAnalysis,
        createdAt: new Date('2024-01-01'),
      };
      const analysis2 = {
        ...mockAnalysis,
        createdAt: new Date('2024-01-02'),
      };
      mockSkinAnalysisService.findByCustomerId.mockResolvedValue([
        analysis2,
        analysis1,
      ]);

      // Act
      const result = await controller.findByCustomerId('customer-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].createdAt > result[1].createdAt).toBe(true);
    });
  });

  // ==================== ENDPOINT: findAll (007) ====================
  describe('findAll', () => {
    // TC-SKINC-007-01: Normal case - Find all analyses
    it('TC-SKINC-007-01: should return all analyses', async () => {
      // Arrange
      const analyses = [mockAnalysis, mockAnalysis, mockAnalysis];
      mockSkinAnalysisService.findAll.mockResolvedValue(analyses);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual(analyses);
      expect(result).toHaveLength(3);
      expect(mockSkinAnalysisService.findAll).toHaveBeenCalled();
    });

    // TC-SKINC-007-02: Normal case - Empty database
    it('TC-SKINC-007-02: should return empty array when no analyses exist', async () => {
      // Arrange
      mockSkinAnalysisService.findAll.mockResolvedValue([]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual([]);
    });

    // TC-SKINC-007-03: Normal case - Multiple analyses from different customers
    it('TC-SKINC-007-03: should return analyses from all customers', async () => {
      // Arrange
      const analysis1 = { ...mockAnalysis, customerId: 'customer-1' };
      const analysis2 = { ...mockAnalysis, customerId: 'customer-2' };
      const analysis3 = { ...mockAnalysis, customerId: 'customer-3' };
      mockSkinAnalysisService.findAll.mockResolvedValue([
        analysis1,
        analysis2,
        analysis3,
      ]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map((a) => a.customerId)).toEqual([
        'customer-1',
        'customer-2',
        'customer-3',
      ]);
    });

    // TC-SKINC-007-04: Abnormal case - Service error
    it('TC-SKINC-007-04: should handle service errors', async () => {
      // Arrange
      mockSkinAnalysisService.findAll.mockRejectedValue(
        new Error('Database error'),
      );

      // Act & Assert
      await expect(controller.findAll()).rejects.toThrow('Database error');
    });
  });
});
