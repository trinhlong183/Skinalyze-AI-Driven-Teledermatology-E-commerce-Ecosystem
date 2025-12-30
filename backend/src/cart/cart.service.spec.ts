import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ProductsService } from '../products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import { AddressService } from '../address/address.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Cache } from 'cache-manager';

describe('CartService', () => {
  let service: CartService;
  let cacheManager: jest.Mocked<Cache>;
  let productsService: jest.Mocked<ProductsService>;
  let inventoryService: jest.Mocked<InventoryService>;
  let addressService: jest.Mocked<AddressService>;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockProductsService = {
    findOne: jest.fn(),
  };

  const mockInventoryService = {
    reserveStock: jest.fn(),
    releaseReservation: jest.fn(),
  };

  const mockAddressService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        {
          provide: AddressService,
          useValue: mockAddressService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    cacheManager = module.get(CACHE_MANAGER);
    productsService = module.get(ProductsService);
    inventoryService = module.get(InventoryService);
    addressService = module.get(AddressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToCart', () => {
    const userId = 'test-user-id';
    const productId = 'test-product-id';

    const mockProduct = {
      productId: productId,
      productName: 'Test Product',
      sellingPrice: 100000,
      salePercentage: null,
    };

    beforeEach(() => {
      mockCacheManager.set.mockResolvedValue(undefined);
    });

    // TC-CART-001-01: Normal - Add product with quantity 5
    it('TC-CART-001-01: should add product to cart with quantity 5 and reserve stock', async () => {
      const quantity = 5;
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockCacheManager.get.mockResolvedValue({
        userId,
        items: [],
        totalItems: 0,
        totalPrice: 0,
        updatedAt: new Date(),
      });
      mockInventoryService.reserveStock.mockResolvedValue({ success: true });

      const result = await service.addToCart(userId, { productId, quantity });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(5);
      expect(result.items[0].productId).toBe(productId);
      expect(inventoryService.reserveStock).toHaveBeenCalledWith(
        productId,
        quantity,
      );
      expect(result.totalItems).toBe(5);
    });

    // TC-CART-001-02: Normal - Update existing cart item
    it('TC-CART-001-02: should update quantity when product already exists in cart', async () => {
      const existingCart = {
        userId,
        items: [
          {
            productId,
            productName: 'Test Product',
            price: 100000,
            originalPrice: 100000,
            salePercentage: 0,
            quantity: 3,
            addedAt: new Date(),
            selected: true,
          },
        ],
        totalItems: 3,
        totalPrice: 300000,
        updatedAt: new Date(),
      };

      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockCacheManager.get.mockResolvedValue(existingCart);
      mockInventoryService.reserveStock.mockResolvedValue({ success: true });

      const result = await service.addToCart(userId, {
        productId,
        quantity: 2,
      });

      expect(result.items[0].quantity).toBe(5); // 3 + 2
      expect(result.totalItems).toBe(5);
      expect(inventoryService.reserveStock).toHaveBeenCalledWith(productId, 2);
    });

    // TC-CART-001-03: Normal - Create new cart with 1 item
    it('TC-CART-001-03: should create new cart when user has empty cart', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockCacheManager.get.mockResolvedValue(null);
      mockInventoryService.reserveStock.mockResolvedValue({ success: true });

      const result = await service.addToCart(userId, {
        productId,
        quantity: 1,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(1);
      expect(result.totalItems).toBe(1);
    });

    // TC-CART-001-04: Boundary - Minimum quantity (1)
    it('TC-CART-001-04: should add product with minimum quantity of 1', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockCacheManager.get.mockResolvedValue(null);
      mockInventoryService.reserveStock.mockResolvedValue({ success: true });

      const result = await service.addToCart(userId, {
        productId,
        quantity: 1,
      });

      expect(result.items[0].quantity).toBe(1);
    });

    // TC-CART-001-05: Boundary - Maximum quantity (999)
    it('TC-CART-001-05: should add product with maximum quantity of 999', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockCacheManager.get.mockResolvedValue(null);
      mockInventoryService.reserveStock.mockResolvedValue({ success: true });

      const result = await service.addToCart(userId, {
        productId,
        quantity: 999,
      });

      expect(result.items[0].quantity).toBe(999);
    });

    // TC-CART-001-06: Abnormal - Insufficient stock
    it('TC-CART-001-06: should throw error when stock is insufficient', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockCacheManager.get.mockResolvedValue(null);
      mockInventoryService.reserveStock.mockResolvedValue({ success: false });

      await expect(
        service.addToCart(userId, { productId, quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addToCart(userId, { productId, quantity: 10 }),
      ).rejects.toThrow('Không đủ hàng trong kho');
    });

    // TC-CART-001-07: Abnormal - Product not found
    it('TC-CART-001-07: should throw error when product does not exist', async () => {
      mockProductsService.findOne.mockResolvedValue(null);

      await expect(
        service.addToCart(userId, { productId: 'non-existent', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCartItem', () => {
    const userId = 'test-user-id';
    const productId = 'test-product-id';

    // TC-CART-002-01: Normal - Increase quantity
    it('TC-CART-002-01: should increase quantity and reserve additional stock', async () => {
      const existingCart = {
        userId,
        items: [
          {
            productId,
            productName: 'Test Product',
            price: 100000,
            originalPrice: 100000,
            salePercentage: 0,
            quantity: 2,
            addedAt: new Date(),
            selected: true,
          },
        ],
        totalItems: 2,
        totalPrice: 200000,
        updatedAt: new Date(),
      };

      mockCacheManager.get.mockResolvedValue(existingCart);
      mockInventoryService.reserveStock.mockResolvedValue({ success: true });

      const result = await service.updateCartItem(userId, productId, {
        quantity: 5,
      });

      expect(result.items[0].quantity).toBe(5);
      expect(inventoryService.reserveStock).toHaveBeenCalledWith(productId, 3); // Diff = 5 - 2
    });

    // TC-CART-002-02: Normal - Decrease quantity
    it('TC-CART-002-02: should decrease quantity and release reserved stock', async () => {
      const existingCart = {
        userId,
        items: [
          {
            productId,
            productName: 'Test Product',
            price: 100000,
            originalPrice: 100000,
            salePercentage: 0,
            quantity: 5,
            addedAt: new Date(),
            selected: true,
          },
        ],
        totalItems: 5,
        totalPrice: 500000,
        updatedAt: new Date(),
      };

      mockCacheManager.get.mockResolvedValue(existingCart);
      mockInventoryService.releaseReservation.mockResolvedValue(undefined);

      const result = await service.updateCartItem(userId, productId, {
        quantity: 2,
      });

      expect(result.items[0].quantity).toBe(2);
      expect(inventoryService.releaseReservation).toHaveBeenCalledWith(
        productId,
        3,
      ); // Diff = 5 - 2
    });

    // TC-CART-002-03: Boundary - Update to quantity 1 (minimum)
    it('TC-CART-002-03: should update to minimum quantity of 1', async () => {
      const existingCart = {
        userId,
        items: [
          {
            productId,
            productName: 'Test Product',
            price: 100000,
            originalPrice: 100000,
            salePercentage: 0,
            quantity: 5,
            addedAt: new Date(),
            selected: true,
          },
        ],
        totalItems: 5,
        totalPrice: 500000,
        updatedAt: new Date(),
      };

      mockCacheManager.get.mockResolvedValue(existingCart);
      mockInventoryService.releaseReservation.mockResolvedValue(undefined);

      const result = await service.updateCartItem(userId, productId, {
        quantity: 1,
      });

      expect(result.items[0].quantity).toBe(1);
    });

    // TC-CART-002-04: Boundary - Update to quantity 999 (maximum)
    it('TC-CART-002-04: should update to maximum quantity of 999', async () => {
      const existingCart = {
        userId,
        items: [
          {
            productId,
            productName: 'Test Product',
            price: 100000,
            originalPrice: 100000,
            salePercentage: 0,
            quantity: 1,
            addedAt: new Date(),
            selected: true,
          },
        ],
        totalItems: 1,
        totalPrice: 100000,
        updatedAt: new Date(),
      };

      mockCacheManager.get.mockResolvedValue(existingCart);
      mockInventoryService.reserveStock.mockResolvedValue({ success: true });

      const result = await service.updateCartItem(userId, productId, {
        quantity: 999,
      });

      expect(result.items[0].quantity).toBe(999);
    });

    // TC-CART-002-05: Abnormal - Product not in cart
    it('TC-CART-002-05: should throw error when product not found in cart', async () => {
      mockCacheManager.get.mockResolvedValue({
        userId,
        items: [],
        totalItems: 0,
        totalPrice: 0,
        updatedAt: new Date(),
      });

      await expect(
        service.updateCartItem(userId, 'non-existent', { quantity: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC-CART-002-06: Abnormal - Quantity <= 0
    it('TC-CART-002-06: should throw error when quantity is 0 or negative', async () => {
      const existingCart = {
        userId,
        items: [
          {
            productId,
            productName: 'Test Product',
            price: 100000,
            originalPrice: 100000,
            salePercentage: 0,
            quantity: 5,
            addedAt: new Date(),
            selected: true,
          },
        ],
        totalItems: 5,
        totalPrice: 500000,
        updatedAt: new Date(),
      };

      mockCacheManager.get.mockResolvedValue(existingCart);

      await expect(
        service.updateCartItem(userId, productId, { quantity: 0 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateCartItem(userId, productId, { quantity: -1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
