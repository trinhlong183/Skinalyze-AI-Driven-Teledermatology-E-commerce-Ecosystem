import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Cart, CartItem } from './interfaces/cart-item.interface';
import { ProductsService } from '../products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import { AddressService } from '../address/address.service';
import {
  calculateDistance,
  geocodeAddress,
  SHOP_LOCATIONS,
} from '../utils/location';

@Injectable()
export class CartService implements OnModuleDestroy {
  private readonly redisClient: Redis;
  private readonly CART_TTL_SECONDS = 300; // 5 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
    private readonly addressService: AddressService,
  ) {
    // Initialize Redis client with configuration
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: 0, // Use database 0
    });

    // Handle Redis connection events
    this.redisClient.on('error', (error) => {
      console.error('Redis Client Error:', error);
    });

    this.redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  /**
   * Cleanup Redis connection on module destroy
   */
  async onModuleDestroy() {
    await this.redisClient.disconnect();
  }

  /**
   * Generate Redis key with proper prefix
   */
  private getCartKey(userId: string): string {
    return `skinalyze:cart:${userId}`;
  }

  /**
   * Calculate final price after applying sale percentage
   */
  private calculateFinalPrice(
    sellingPrice: number,
    salePercentage: number | null,
  ): number {
    if (!salePercentage || salePercentage <= 0) {
      return sellingPrice;
    }

    const discount = (sellingPrice * salePercentage) / 100;
    const finalPrice = sellingPrice - discount;

    return Math.round(finalPrice);
  }

  /**
   * Get cart from Redis - Returns empty cart if not found
   */
  async getCart(userId: string): Promise<Cart> {
    const cartKey = this.getCartKey(userId);
    const cartData = await this.redisClient.get(cartKey);

    if (!cartData) {
      // Return empty cart structure
      return {
        userId,
        items: [],
        totalItems: 0,
        totalPrice: 0,
        updatedAt: new Date(),
      };
    }

    // Parse JSON string to Cart object
    const cart = JSON.parse(cartData) as Cart;

    // Convert date strings back to Date objects
    cart.updatedAt = new Date(cart.updatedAt);
    cart.items.forEach((item) => {
      item.addedAt = new Date(item.addedAt);
    });

    return cart;
  }

  /**
   * Save cart to Redis with 5-minute TTL
   * After 5 minutes of inactivity, cart will be automatically deleted
   */
  private async saveCart(cart: Cart): Promise<void> {
    const cartKey = this.getCartKey(cart.userId);
    const cartData = JSON.stringify(cart);
    // Set cart with 5-minute expiration (300 seconds)
    await this.redisClient.set(cartKey, cartData, 'EX', this.CART_TTL_SECONDS);
  }

  /**
   * Delete cart from Redis
   */
  private async deleteCart(userId: string): Promise<void> {
    const cartKey = this.getCartKey(userId);
    await this.redisClient.del(cartKey);
  }

  /**
   * Remove TTL from cart (make it persistent)
   * Called when user successfully checks out
   */
  async removeTTL(userId: string): Promise<void> {
    const cartKey = this.getCartKey(userId);
    await this.redisClient.persist(cartKey);
  }

  /**
   * Scheduled job: Clean up expired carts and release inventory
   * Runs every minute to check for carts about to expire
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredCarts(): Promise<void> {
    try {
      // Scan for all cart keys
      const pattern = 'skinalyze:cart:*';
      const keys = await this.redisClient.keys(pattern);

      for (const key of keys) {
        // Check TTL for each cart
        const ttl = await this.redisClient.ttl(key);

        // If TTL is less than 60 seconds (about to expire), release inventory
        if (ttl > 0 && ttl < 60) {
          const cartData = await this.redisClient.get(key);
          if (cartData) {
            const cart = JSON.parse(cartData) as Cart;

            // Release all inventory reservations
            for (const item of cart.items) {
              try {
                await this.inventoryService.releaseReservation(
                  item.productId,
                  item.quantity,
                );
                console.log(
                  `[Cart Cleanup] Released inventory for product ${item.productId}, quantity: ${item.quantity}`,
                );
              } catch (error) {
                console.error(
                  `[Cart Cleanup] Failed to release inventory for product ${item.productId}:`,
                  error,
                );
              }
            }

            // Delete cart immediately after releasing inventory
            await this.redisClient.del(key);
            console.log(`[Cart Cleanup] Deleted expired cart: ${key}`);
          }
        }
      }
    } catch (error) {
      console.error('[Cart Cleanup] Error during cleanup:', error);
    }
  }

  /**
   * Add product to cart with inventory reservation
   */
  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<Cart> {
    const { productId, quantity } = addToCartDto;

    try {
      // Verify product exists
      const product = await this.productsService.findOne(productId);
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Get current cart first to check if product exists
      const cart = await this.getCart(userId);

      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId === productId,
      );

      // RESERVE INVENTORY (only reserve the NEW quantity being added)
      const reserveResult = await this.inventoryService.reserveStock(
        productId,
        quantity,
      );

      if (!reserveResult.success) {
        throw new BadRequestException('Không đủ hàng trong kho');
      }

      const finalPrice = this.calculateFinalPrice(
        product.sellingPrice,
        product.salePercentage,
      );

      if (existingItemIndex > -1) {
        // Update quantity if product exists
        cart.items[existingItemIndex].quantity += quantity;
        // Update price (in case sale percentage changed)
        cart.items[existingItemIndex].price = finalPrice;
        cart.items[existingItemIndex].originalPrice = product.sellingPrice;
        cart.items[existingItemIndex].salePercentage =
          product.salePercentage || 0;
      } else {
        const newItem: CartItem = {
          productId,
          productName: product.productName,
          price: finalPrice,
          originalPrice: product.sellingPrice,
          salePercentage: product.salePercentage || 0,
          quantity,
          addedAt: new Date(),
          selected: true, // Default selected when added to cart
        };
        cart.items.push(newItem);
      }

      // Recalculate totals
      cart.totalItems = cart.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      cart.totalPrice = cart.items.reduce(
        (sum, item) => sum + (item.price || 0) * item.quantity,
        0,
      );
      cart.updatedAt = new Date();

      // Save to Redis
      await this.saveCart(cart);

      return cart;
    } catch (error) {
      console.error('Error in addToCart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity with inventory adjustment
   */
  async updateCartItem(
    userId: string,
    productId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    try {
      const { quantity } = updateCartItemDto;

      if (quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than 0');
      }

      const cart = await this.getCart(userId);

      const itemIndex = cart.items.findIndex(
        (item) => item.productId === productId,
      );

      if (itemIndex === -1) {
        throw new NotFoundException(
          `Product with ID ${productId} not found in cart`,
        );
      }

      const oldQuantity = cart.items[itemIndex].quantity;
      const quantityDiff = quantity - oldQuantity;

      // Adjust inventory reservation based on quantity change
      if (quantityDiff > 0) {
        // Need to reserve MORE stock
        const reserveResult = await this.inventoryService.reserveStock(
          productId,
          quantityDiff,
        );
        if (!reserveResult.success) {
          throw new BadRequestException(
            `Cannot increase quantity. Only ${oldQuantity} available in stock.`,
          );
        }
      } else if (quantityDiff < 0) {
        // Need to release SOME stock
        await this.inventoryService.releaseReservation(
          productId,
          Math.abs(quantityDiff),
        );
      }

      // Update quantity
      cart.items[itemIndex].quantity = quantity;

      // Recalculate totals
      cart.totalItems = cart.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      cart.totalPrice = cart.items.reduce(
        (sum, item) => sum + (item.price || 0) * item.quantity,
        0,
      );
      cart.updatedAt = new Date();

      // Save to Redis
      await this.saveCart(cart);

      return cart;
    } catch (error) {
      console.error('Error in updateCartItem:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart and release inventory
   */
  async removeFromCart(userId: string, productId: string): Promise<Cart> {
    const cart = await this.getCart(userId);

    const itemIndex = cart.items.findIndex(
      (item) => item.productId === productId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException(
        `Product with ID ${productId} not found in cart`,
      );
    }

    const item = cart.items[itemIndex];

    // Release inventory reservation
    await this.inventoryService.releaseReservation(
      item.productId,
      item.quantity,
    );

    // Remove item
    cart.items.splice(itemIndex, 1);

    // Recalculate totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + (item.price || 0) * item.quantity,
      0,
    );
    cart.updatedAt = new Date();

    // Save to Redis or delete if empty
    if (cart.items.length === 0) {
      await this.deleteCart(userId);
    } else {
      await this.saveCart(cart);
    }

    return cart;
  }

  /**
   * Toggle select/unselect item in cart
   */
  async toggleSelectItem(
    userId: string,
    productId: string,
    selected: boolean,
  ): Promise<Cart> {
    const cart = await this.getCart(userId);

    const item = cart.items.find((item) => item.productId === productId);

    if (!item) {
      throw new NotFoundException('Product not found in cart');
    }

    item.selected = selected;
    cart.updatedAt = new Date();

    // Save to Redis
    await this.saveCart(cart);

    return cart;
  }

  /**
   * Select/unselect all items
   */
  async toggleSelectAll(userId: string, selected: boolean): Promise<Cart> {
    const cart = await this.getCart(userId);

    cart.items.forEach((item) => {
      item.selected = selected;
    });
    cart.updatedAt = new Date();

    // Save to Redis
    await this.saveCart(cart);

    return cart;
  }

  /**
   * Get selected items for checkout
   */
  getSelectedItems(cart: Cart): CartItem[] {
    return cart.items.filter((item) => item.selected === true);
  }

  /**
   * Remove all selected items from cart (after checkout)
   */
  async removeSelectedItems(userId: string): Promise<Cart> {
    const cart = await this.getCart(userId);

    // Keep only unselected items
    cart.items = cart.items.filter((item) => item.selected !== true);

    // Recalculate totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + (item.price || 0) * item.quantity,
      0,
    );
    cart.updatedAt = new Date();

    // Save to Redis or delete if empty
    if (cart.items.length === 0) {
      await this.deleteCart(userId);
    } else {
      await this.saveCart(cart);
    }

    return cart;
  }

  /**
   * Clear entire cart and release all reservations
   */
  async clearCart(userId: string): Promise<void> {
    // Release all reservations before clearing
    const cart = await this.getCart(userId);
    if (cart && cart.items.length > 0) {
      for (const item of cart.items) {
        await this.inventoryService.releaseReservation(
          item.productId,
          item.quantity,
        );
      }
    }

    // Delete cart from Redis
    await this.deleteCart(userId);
  }

  /**
   * Get total item count in cart
   */
  async getCartItemCount(userId: string): Promise<number> {
    const cart = await this.getCart(userId);
    return cart.totalItems;
  }

  /**
   * Remove specific items by productIds
   */
  async removeItemsByProductIds(
    userId: string,
    productIds: string[],
  ): Promise<Cart> {
    const cart = await this.getCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new NotFoundException('Cart is empty');
    }

    // Filter out items with productId in the list
    cart.items = cart.items.filter(
      (item) => !productIds.includes(item.productId),
    );

    // Recalculate totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + (item.price || 0) * item.quantity,
      0,
    );
    cart.updatedAt = new Date();

    // Save to Redis or delete if empty
    if (cart.items.length === 0) {
      await this.deleteCart(userId);
      return {
        userId,
        items: [],
        totalPrice: 0,
        totalItems: 0,
        updatedAt: new Date(),
      };
    }

    await this.saveCart(cart);
    return cart;
  }
}
