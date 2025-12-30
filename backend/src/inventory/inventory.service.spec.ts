import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Inventory } from './entities/inventory.entity';
import { InventoryAdjustment } from './entities/inventory-adjustment.entity';
import { Product } from '../products/entities/product.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepository: jest.Mocked<Repository<Inventory>>;
  let inventoryAdjustmentRepository: jest.Mocked<
    Repository<InventoryAdjustment>
  >;
  let productRepository: jest.Mocked<Repository<Product>>;

  const mockInventoryRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockInventoryAdjustmentRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  };

  const mockProductRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(Inventory),
          useValue: mockInventoryRepository,
        },
        {
          provide: getRepositoryToken(InventoryAdjustment),
          useValue: mockInventoryAdjustmentRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepository = module.get(getRepositoryToken(Inventory));
    inventoryAdjustmentRepository = module.get(
      getRepositoryToken(InventoryAdjustment),
    );
    productRepository = module.get(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reserveStock', () => {
    const productId = 'test-product-id';

    // TC-INV-001-01: Normal - Reserve stock with sufficient availability
    it('TC-INV-001-01: should reserve stock when sufficient available', async () => {
      const inventory = {
        inventoryId: 'inv-id',
        productId,
        currentStock: 100,
        reservedStock: 20,
      };

      mockInventoryRepository.findOne.mockResolvedValue(inventory as any);
      mockInventoryRepository.save.mockResolvedValue({
        ...inventory,
        reservedStock: 25,
      } as any);
      mockProductRepository.findOne.mockResolvedValue({ productId } as any);
      mockProductRepository.save.mockResolvedValue({} as any);

      const result = await service.reserveStock(productId, 5);

      expect(result.success).toBe(true);
      expect(mockInventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reservedStock: 25,
        }),
      );
    });

    // TC-INV-001-02: Normal - Reserve from available stock (not reserved)
    it('TC-INV-001-02: should calculate available stock correctly', async () => {
      const inventory = {
        inventoryId: 'inv-id',
        productId,
        currentStock: 100,
        reservedStock: 80, // 20 available
      };

      mockInventoryRepository.findOne.mockResolvedValue(inventory as any);
      mockInventoryRepository.save.mockResolvedValue({
        ...inventory,
        reservedStock: 90,
      } as any);
      mockProductRepository.findOne.mockResolvedValue({ productId } as any);
      mockProductRepository.save.mockResolvedValue({} as any);

      const result = await service.reserveStock(productId, 10);

      expect(result.success).toBe(true);
    });

    // TC-INV-001-03: Normal - Multiple reservations
    it('TC-INV-001-03: should handle multiple consecutive reservations', async () => {
      const inventory = {
        inventoryId: 'inv-id',
        productId,
        currentStock: 100,
        reservedStock: 0,
      };

      mockInventoryRepository.findOne.mockResolvedValue(inventory as any);
      mockProductRepository.findOne.mockResolvedValue({ productId } as any);

      // First reservation
      mockInventoryRepository.save.mockResolvedValueOnce({
        ...inventory,
        reservedStock: 10,
      } as any);

      const result1 = await service.reserveStock(productId, 10);
      expect(result1.success).toBe(true);

      // Second reservation
      mockInventoryRepository.findOne.mockResolvedValue({
        ...inventory,
        reservedStock: 10,
      } as any);
      mockInventoryRepository.save.mockResolvedValueOnce({
        ...inventory,
        reservedStock: 20,
      } as any);

      const result2 = await service.reserveStock(productId, 10);
      expect(result2.success).toBe(true);
    });

    // TC-INV-001-04: Boundary - Reserve exactly all available stock
    it('TC-INV-001-04: should reserve all available stock', async () => {
      const inventory = {
        inventoryId: 'inv-id',
        productId,
        currentStock: 100,
        reservedStock: 50, // 50 available
      };

      mockInventoryRepository.findOne.mockResolvedValue(inventory as any);
      mockInventoryRepository.save.mockResolvedValue({
        ...inventory,
        reservedStock: 100,
      } as any);
      mockProductRepository.findOne.mockResolvedValue({ productId } as any);
      mockProductRepository.save.mockResolvedValue({} as any);

      const result = await service.reserveStock(productId, 50);

      expect(result.success).toBe(true);
      expect(mockInventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reservedStock: 100,
        }),
      );
    });

    // TC-INV-001-05: Boundary - Reserve minimum quantity (1)
    it('TC-INV-001-05: should reserve minimum quantity of 1', async () => {
      const inventory = {
        inventoryId: 'inv-id',
        productId,
        currentStock: 10,
        reservedStock: 0,
      };

      mockInventoryRepository.findOne.mockResolvedValue(inventory as any);
      mockInventoryRepository.save.mockResolvedValue({
        ...inventory,
        reservedStock: 1,
      } as any);
      mockProductRepository.findOne.mockResolvedValue({ productId } as any);
      mockProductRepository.save.mockResolvedValue({} as any);

      const result = await service.reserveStock(productId, 1);

      expect(result.success).toBe(true);
    });

    // TC-INV-001-06: Abnormal - Insufficient stock
    it('TC-INV-001-06: should return false when stock insufficient', async () => {
      const inventory = {
        inventoryId: 'inv-id',
        productId,
        currentStock: 100,
        reservedStock: 95, // Only 5 available
      };

      mockInventoryRepository.findOne.mockResolvedValue(inventory as any);

      const result = await service.reserveStock(productId, 10);

      expect(result.success).toBe(false);
      expect(mockInventoryRepository.save).not.toHaveBeenCalled();
    });

    // TC-INV-001-07: Abnormal - Product not in inventory
    it('TC-INV-001-07: should return false when product not found', async () => {
      mockInventoryRepository.findOne.mockResolvedValue(null);

      const result = await service.reserveStock('non-existent', 10);

      expect(result.success).toBe(false);
      expect(mockInventoryRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('confirmSale', () => {
    const productId = 'test-product-id';

    // TC-INV-002-01: Normal - Confirm sale with sufficient reserved stock
    it('TC-INV-002-01: should confirm sale and reduce stocks', async () => {
      const inventory = {
        inventoryId: 'inv-id',
        productId,
        currentStock: 100,
        reservedStock: 20,
      };

      mockInventoryRepository.findOne.mockResolvedValue(inventory as any);
      mockInventoryRepository.save.mockResolvedValue({
        ...inventory,
        currentStock: 95,
        reservedStock: 15,
      } as any);
      mockProductRepository.findOne.mockResolvedValue({ productId } as any);
      mockProductRepository.save.mockResolvedValue({} as any);

      await service.confirmSale(productId, 5);

      expect(mockInventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStock: 95,
          reservedStock: 15,
        }),
      );
    });

    // TC-INV-002-02: Normal - Confirm sale for all reserved stock
    it('TC-INV-002-02: should confirm sale for entire reservation', async () => {
      const inventory = {
        inventoryId: 'inv-id',
        productId,
        currentStock: 100,
        reservedStock: 20,
      };

      mockInventoryRepository.findOne.mockResolvedValue(inventory as any);
      mockInventoryRepository.save.mockResolvedValue({
        ...inventory,
        currentStock: 80,
        reservedStock: 0,
      } as any);
      mockProductRepository.findOne.mockResolvedValue({ productId } as any);
      mockProductRepository.save.mockResolvedValue({} as any);

      await service.confirmSale(productId, 20);

      expect(mockInventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStock: 80,
          reservedStock: 0,
        }),
      );
    });

    // TC-INV-002-03: Normal - Multiple confirm sales
    it('TC-INV-002-03: should handle multiple sales from same reservation', async () => {
      const inventory = {
        inventoryId: 'inv-id',
        productId,
        currentStock: 100,
        reservedStock: 30,
      };

      mockInventoryRepository.findOne.mockResolvedValue(inventory as any);
      mockProductRepository.findOne.mockResolvedValue({ productId } as any);

      // First sale
      mockInventoryRepository.save.mockResolvedValueOnce({
        ...inventory,
        currentStock: 90,
        reservedStock: 20,
      } as any);

      await service.confirmSale(productId, 10);

      // Second sale
      mockInventoryRepository.findOne.mockResolvedValue({
        ...inventory,
        currentStock: 90,
        reservedStock: 20,
      } as any);
      mockInventoryRepository.save.mockResolvedValueOnce({
        ...inventory,
        currentStock: 85,
        reservedStock: 15,
      } as any);

      await service.confirmSale(productId, 5);

      expect(mockInventoryRepository.save).toHaveBeenCalledTimes(2);
    });

    // TC-INV-002-04: Boundary - Confirm minimum quantity (1)
    it('TC-INV-002-04: should confirm sale of 1 unit', async () => {
      const inventory = {
        inventoryId: 'inv-id',
        productId,
        currentStock: 100,
        reservedStock: 10,
      };

      mockInventoryRepository.findOne.mockResolvedValue(inventory as any);
      mockInventoryRepository.save.mockResolvedValue({
        ...inventory,
        currentStock: 99,
        reservedStock: 9,
      } as any);
      mockProductRepository.findOne.mockResolvedValue({ productId } as any);
      mockProductRepository.save.mockResolvedValue({} as any);

      await service.confirmSale(productId, 1);

      expect(mockInventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStock: 99,
          reservedStock: 9,
        }),
      );
    });

    // TC-INV-002-05: Boundary - Confirm exactly reserved amount
    it('TC-INV-002-05: should confirm sale equal to reserved stock', async () => {
      const inventory = {
        inventoryId: 'inv-id',
        productId,
        currentStock: 50,
        reservedStock: 50,
      };

      mockInventoryRepository.findOne.mockResolvedValue(inventory as any);
      mockInventoryRepository.save.mockResolvedValue({
        ...inventory,
        currentStock: 0,
        reservedStock: 0,
      } as any);
      mockProductRepository.findOne.mockResolvedValue({ productId } as any);
      mockProductRepository.save.mockResolvedValue({} as any);

      await service.confirmSale(productId, 50);

      expect(mockInventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStock: 0,
          reservedStock: 0,
        }),
      );
    });

    // TC-INV-002-06: Abnormal - Confirm more than reserved
    it('TC-INV-002-06: should throw error when confirming more than reserved', async () => {
      const inventory = {
        inventoryId: 'inv-id',
        productId,
        currentStock: 100,
        reservedStock: 5,
      };

      mockInventoryRepository.findOne.mockResolvedValue(inventory as any);

      await expect(service.confirmSale(productId, 10)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.confirmSale(productId, 10)).rejects.toThrow(
        'Cannot confirm sale for more than reserved',
      );
      expect(mockInventoryRepository.save).not.toHaveBeenCalled();
    });

    // TC-INV-002-07: Abnormal - Product not in inventory
    it('TC-INV-002-07: should throw error when product not found', async () => {
      mockInventoryRepository.findOne.mockResolvedValue(null);

      await expect(service.confirmSale('non-existent', 10)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.confirmSale('non-existent', 10)).rejects.toThrow(
        'Inventory not found',
      );
    });
  });
});
