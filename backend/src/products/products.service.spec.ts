import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { InventoryService } from '../inventory/inventory.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: Repository<Product>;
  let categoryRepository: Repository<Category>;
  let orderItemRepository: Repository<OrderItem>;
  let inventoryService: InventoryService;
  let cloudinaryService: CloudinaryService;

  const mockProduct: Product = {
    productId: '1',
    productName: 'Test Product',
    productDescription: 'Test Description',
    productPrice: 100000,
    productImages: ['https://example.com/image1.jpg'],
    categoryTags: 'skincare',
    usageInstructions: 'Apply daily',
    isActive: true,
    categories: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Product;

  const mockCategory: Category = {
    categoryId: '1',
    categoryName: 'Skincare',
    categoryDescription: 'Skincare products',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Category;

  const mockProductRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findBy: jest.fn(),
  };

  const mockCategoryRepository = {
    findBy: jest.fn(),
    findOne: jest.fn(),
  };

  const mockOrderItemRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockInventoryService = {
    setStock: jest.fn(),
    checkAvailability: jest.fn(),
    deductStock: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
    orderItemRepository = module.get<Repository<OrderItem>>(getRepositoryToken(OrderItem));
    inventoryService = module.get<InventoryService>(InventoryService);
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      // Arrange
      const createProductDto: CreateProductDto = {
        productName: 'New Product',
        productDescription: 'New Description',
        productPrice: 150000,
        productImages: ['https://example.com/new-image.jpg'],
        categoryIds: ['1'],
        stock: 100,
        originalPrice: 120000,
      };

      mockCategoryRepository.findBy.mockResolvedValue([mockCategory]);
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);
      mockInventoryService.setStock.mockResolvedValue(undefined);

      // Act
      const result = await service.create(createProductDto);

      // Assert
      expect(categoryRepository.findBy).toHaveBeenCalledWith({
        categoryId: expect.anything(),
      });
      expect(productRepository.create).toHaveBeenCalled();
      expect(productRepository.save).toHaveBeenCalled();
      expect(inventoryService.setStock).toHaveBeenCalledWith(
        mockProduct.productId,
        createProductDto.stock,
        createProductDto.originalPrice,
      );
      expect(result).toEqual(mockProduct);
    });

    it('should create product with default stock of 0 when not provided', async () => {
      // Arrange
      const createProductDto: CreateProductDto = {
        productName: 'New Product',
        productDescription: 'New Description',
        productPrice: 150000,
        productImages: ['https://example.com/new-image.jpg'],
        categoryIds: ['1'],
      };

      mockCategoryRepository.findBy.mockResolvedValue([mockCategory]);
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);
      mockInventoryService.setStock.mockResolvedValue(undefined);

      // Act
      await service.create(createProductDto);

      // Assert
      expect(inventoryService.setStock).toHaveBeenCalledWith(mockProduct.productId, 0, 0);
    });
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      // Arrange
      const mockProducts = [mockProduct, { ...mockProduct, productId: '2' }];
      mockProductRepository.find.mockResolvedValue(mockProducts);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(mockProducts);
      expect(productRepository.find).toHaveBeenCalledWith({
        relations: ['categories'],
      });
    });

    it('should return empty array when no products exist', async () => {
      // Arrange
      mockProductRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a product when found by ID', async () => {
      // Arrange
      mockProductRepository.findOne.mockResolvedValue(mockProduct);

      // Act
      const result = await service.findOne('1');

      // Assert
      expect(result).toEqual(mockProduct);
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { productId: '1' },
        relations: ['categories'],
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      mockProductRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('999')).rejects.toThrow('Product with ID 999 not found');
    });
  });

  describe('update', () => {
    it('should update product successfully', async () => {
      // Arrange
      const updateDto: UpdateProductDto = {
        productName: 'Updated Product',
        productPrice: 200000,
      };

      const updatedProduct = { ...mockProduct, ...updateDto };
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockCategoryRepository.findBy.mockResolvedValue([mockCategory]);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      // Act
      const result = await service.update('1', updateDto);

      // Assert
      expect(result.productName).toBe(updateDto.productName);
      expect(result.productPrice).toBe(updateDto.productPrice);
    });

    it('should throw NotFoundException when updating non-existent product', async () => {
      // Arrange
      mockProductRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('999', { productName: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update categories when categoryIds provided', async () => {
      // Arrange
      const updateDto: UpdateProductDto = {
        productName: 'Updated Product',
        categoryIds: ['1', '2'],
      };

      const newCategories = [mockCategory, { ...mockCategory, categoryId: '2' }];
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockCategoryRepository.findBy.mockResolvedValue(newCategories);
      mockProductRepository.save.mockResolvedValue({
        ...mockProduct,
        ...updateDto,
        categories: newCategories,
      });

      // Act
      const result = await service.update('1', updateDto);

      // Assert
      expect(categoryRepository.findBy).toHaveBeenCalledWith({
        categoryId: expect.anything(),
      });
      expect(result.categories).toEqual(newCategories);
    });
  });

  describe('remove', () => {
    it('should remove product successfully', async () => {
      // Arrange
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      // Act
      await service.remove('1');

      // Assert
      expect(productRepository.findOne).toHaveBeenCalled();
      expect(productRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when removing non-existent product', async () => {
      // Arrange
      mockProductRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('edge cases', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockProductRepository.save.mockRejectedValue(new Error('Database error'));
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockCategoryRepository.findBy.mockResolvedValue([mockCategory]);

      // Act & Assert
      await expect(
        service.create({
          productName: 'Test',
          productPrice: 100,
          categoryIds: ['1'],
        }),
      ).rejects.toThrow('Database error');
    });
  });
});
