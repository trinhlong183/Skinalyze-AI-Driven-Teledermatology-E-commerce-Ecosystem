import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import {
  InventoryAdjustment,
  AdjustmentType,
  AdjustmentStatus,
} from './entities/inventory-adjustment.entity';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { ReviewAdjustmentDto } from './dto/review-adjustment.dto';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryAdjustment)
    private readonly adjustmentRepository: Repository<InventoryAdjustment>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * 🔄 Sync product stock with available inventory stock
   * Keep product.stock in sync with available stock (currentStock - reservedStock)
   * This shows customers what they can actually buy
   */
  private async syncProductStock(productId: string): Promise<void> {
    const inventory = await this.inventoryRepository.findOne({
      where: { productId },
    });

    if (!inventory) return;

    const product = await this.productRepository.findOne({
      where: { productId },
    });

    if (product) {
      // Sync with AVAILABLE stock (what customers can buy)
      const availableStock = Math.max(
        0,
        inventory.currentStock - inventory.reservedStock,
      );
      product.stock = availableStock;
      await this.productRepository.save(product);
    }
  }

  // Get all inventory
  async getAllInventory(): Promise<Inventory[]> {
    return await this.inventoryRepository.find({
      relations: ['product'],
      order: { updatedAt: 'DESC' },
    });
  }

  // Get inventory for a specific product
  async getProductInventory(productId: string): Promise<Inventory | null> {
    return await this.inventoryRepository.findOne({
      where: { productId },
      relations: ['product'],
    });
  }

  // Get available stock for a product
  async getAvailableStock(productId: string): Promise<number> {
    const inventory = await this.inventoryRepository.findOne({
      where: { productId },
    });

    if (!inventory) {
      return 0;
    }

    return Math.max(0, inventory.currentStock - inventory.reservedStock);
  }

  // Adjust stock (+ or -)
  async adjustStock(
    productId: string,
    quantity: number,
    adminUserId?: string,
  ): Promise<void> {
    let inventory = await this.inventoryRepository.findOne({
      where: { productId },
    });

    const previousStock = inventory?.currentStock || 0;

    if (!inventory) {
      if (quantity < 0) {
        throw new BadRequestException('Cannot reduce non-existent inventory');
      }

      // Create new inventory record
      inventory = this.inventoryRepository.create({
        productId,
        originalPrice: 0,
        currentStock: quantity,
        reservedStock: 0,
      });
    } else {
      inventory.currentStock += quantity;

      if (inventory.currentStock < 0) {
        throw new BadRequestException('Cannot reduce stock below zero');
      }
    }

    await this.inventoryRepository.save(inventory);
    await this.syncProductStock(productId);

    // Create adjustment record for tracking
    if (adminUserId) {
      const adjustmentRecord = this.adjustmentRepository.create({
        productId,
        adjustmentType:
          quantity > 0 ? AdjustmentType.INCREASE : AdjustmentType.DECREASE,
        quantity: Math.abs(quantity),
        previousStock,
        newStock: inventory.currentStock,
        reason: 'Direct admin adjustment',
        status: AdjustmentStatus.APPROVED,
        requestedBy: adminUserId,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      });
      await this.adjustmentRepository.save(adjustmentRecord);
    }
  }

  // Set absolute stock level
  async setStock(
    productId: string,
    quantity: number,
    originalPrice?: number,
    adminUserId?: string,
  ): Promise<void> {
    let inventory = await this.inventoryRepository.findOne({
      where: { productId },
    });

    const previousStock = inventory?.currentStock || 0;

    if (!inventory) {
      inventory = this.inventoryRepository.create({
        productId,
        originalPrice: originalPrice || 0,
        currentStock: quantity,
        reservedStock: 0,
      });
    } else {
      inventory.currentStock = quantity;
      if (originalPrice !== undefined) {
        inventory.originalPrice = originalPrice;
      }
    }

    await this.inventoryRepository.save(inventory);
    await this.syncProductStock(productId);

    // Create adjustment record for tracking
    if (adminUserId) {
      const adjustmentRecord = this.adjustmentRepository.create({
        productId,
        adjustmentType: AdjustmentType.SET,
        quantity,
        previousStock,
        newStock: quantity,
        reason: 'Direct admin stock set',
        status: AdjustmentStatus.APPROVED,
        requestedBy: adminUserId,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        originalPrice,
      });
      await this.adjustmentRepository.save(adjustmentRecord);
    }
  }

  // Reserve stock (simple version - no batch tracking)
  async reserveStock(
    productId: string,
    quantity: number,
  ): Promise<{ success: boolean }> {
    const inventory = await this.inventoryRepository.findOne({
      where: { productId },
    });

    if (!inventory) {
      return { success: false };
    }

    const available = inventory.currentStock - inventory.reservedStock;

    if (available < quantity) {
      return { success: false };
    }

    inventory.reservedStock += quantity;
    await this.inventoryRepository.save(inventory);
    await this.syncProductStock(productId); // Sync because available stock changed

    return { success: true };
  }

  // Release reservation
  async releaseReservation(productId: string, quantity: number): Promise<void> {
    const inventory = await this.inventoryRepository.findOne({
      where: { productId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    if (inventory.reservedStock < quantity) {
      throw new BadRequestException('Cannot release more than reserved');
    }

    inventory.reservedStock -= quantity;
    await this.inventoryRepository.save(inventory);
    await this.syncProductStock(productId); // Sync because available stock changed
  }

  // Confirm sale (reduce both current and reserved)
  async confirmSale(productId: string, quantity: number): Promise<void> {
    const inventory = await this.inventoryRepository.findOne({
      where: { productId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    console.log(
      `📦 confirmSale called: productId=${productId}, requested=${quantity}, reserved=${inventory.reservedStock}, current=${inventory.currentStock}`,
    );

    if (inventory.reservedStock < quantity) {
      console.error(
        `❌ RESERVATION MISMATCH: Reserved=${inventory.reservedStock}, Requested=${quantity}, Shortfall=${quantity - inventory.reservedStock}`,
      );
      throw new BadRequestException(
        `Cannot confirm sale for more than reserved. Reserved: ${inventory.reservedStock}, Requested: ${quantity}`,
      );
    }

    inventory.currentStock -= quantity;
    inventory.reservedStock -= quantity;
    await this.inventoryRepository.save(inventory);
    console.log(
      `✅ Sale confirmed: New currentStock=${inventory.currentStock}, New reservedStock=${inventory.reservedStock}`,
    );
    await this.syncProductStock(productId);
  }

  /**
   * ✅ Kiểm tra xem có thể confirm sale không (dùng để validate trước khi tạo order)
   */
  async canConfirmSale(productId: string, quantity: number): Promise<boolean> {
    const inventory = await this.inventoryRepository.findOne({
      where: { productId },
    });

    if (!inventory) {
      return false;
    }

    // Check nếu có đủ reserved stock
    return inventory.reservedStock >= quantity;
  }

  /**
   * 💳 Reduce stock directly (for paid orders without reservation)
   * Dùng khi order đã thanh toán, trừ stock trực tiếp
   */
  async reduceStock(productId: string, quantity: number): Promise<void> {
    const inventory = await this.inventoryRepository.findOne({
      where: { productId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    const available = inventory.currentStock - inventory.reservedStock;

    if (available < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${available}, Requested: ${quantity}`,
      );
    }

    inventory.currentStock -= quantity;
    await this.inventoryRepository.save(inventory);
    await this.syncProductStock(productId);
  }

  // Confirm multiple sales
  async confirmMultipleSales(
    sales: Array<{ productId: string; quantity: number }>,
  ): Promise<void> {
    for (const sale of sales) {
      await this.confirmSale(sale.productId, sale.quantity);
    }
  }

  // Low stock alerts
  async getLowStockAlerts(threshold: number = 10): Promise<Inventory[]> {
    return await this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .where(
        '(inventory.currentStock - inventory.reservedStock) <= :threshold',
        { threshold },
      )
      .andWhere('(inventory.currentStock - inventory.reservedStock) >= 0')
      .orderBy('inventory.currentStock - inventory.reservedStock', 'ASC')
      .getMany();
  }

  // Inventory summary stats
  async getInventorySummary(): Promise<{
    totalProducts: number;
    totalStock: number;
    totalReserved: number;
    availableStock: number;
  }> {
    const result = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .select([
        'COUNT(inventory.productId) as totalProducts',
        'SUM(inventory.currentStock) as totalStock',
        'SUM(inventory.reservedStock) as totalReserved',
        'SUM(inventory.currentStock - inventory.reservedStock) as availableStock',
      ])
      .getRawOne();

    return {
      totalProducts: parseInt(result?.totalProducts || '0'),
      totalStock: parseInt(result?.totalStock || '0'),
      totalReserved: parseInt(result?.totalReserved || '0'),
      availableStock: parseInt(result?.availableStock || '0'),
    };
  }

  async createAdjustmentRequest(
    dto: CreateAdjustmentDto,
  ): Promise<InventoryAdjustment> {
    // Get current inventory
    const inventory = await this.inventoryRepository.findOne({
      where: { productId: dto.productId },
      relations: ['product'],
    });

    if (!inventory) {
      throw new NotFoundException('Product inventory not found');
    }

    // Create adjustment request
    const adjustment = this.adjustmentRepository.create({
      productId: dto.productId,
      adjustmentType: dto.adjustmentType,
      quantity: dto.quantity,
      reason: dto.reason,
      requestedBy: dto.requestedBy,
      previousStock: inventory.currentStock,
      status: AdjustmentStatus.PENDING,
      originalPrice: dto.originalPrice, // Optional - only if updating cost price
    });

    // Calculate new stock for preview
    if (dto.adjustmentType === AdjustmentType.INCREASE) {
      adjustment.newStock = inventory.currentStock + dto.quantity;
    } else if (dto.adjustmentType === AdjustmentType.DECREASE) {
      adjustment.newStock = inventory.currentStock - dto.quantity;
    } else if (dto.adjustmentType === AdjustmentType.SET) {
      adjustment.newStock = dto.quantity;
    }

    return await this.adjustmentRepository.save(adjustment);
  }

  /**
   * Get all pending adjustments (Admin)
   */
  async getPendingAdjustments(): Promise<InventoryAdjustment[]> {
    return await this.adjustmentRepository.find({
      where: { status: AdjustmentStatus.PENDING },
      relations: ['product', 'requestedByUser'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get all adjustments with filters (Admin/Staff)
   */
  async getAllAdjustments(
    status?: AdjustmentStatus,
  ): Promise<InventoryAdjustment[]> {
    const query = this.adjustmentRepository
      .createQueryBuilder('adjustment')
      .leftJoinAndSelect('adjustment.product', 'product')
      .leftJoinAndSelect('adjustment.requestedByUser', 'requestedByUser')
      .leftJoinAndSelect('adjustment.reviewedByUser', 'reviewedByUser')
      .orderBy('adjustment.createdAt', 'DESC');

    if (status) {
      query.where('adjustment.status = :status', { status });
    }

    return await query.getMany();
  }

  /**
   * Get adjustment by ID
   */
  async getAdjustmentById(adjustmentId: string): Promise<InventoryAdjustment> {
    const adjustment = await this.adjustmentRepository.findOne({
      where: { adjustmentId },
      relations: ['product', 'requestedByUser', 'reviewedByUser'],
    });

    if (!adjustment) {
      throw new NotFoundException('Adjustment request not found');
    }

    return adjustment;
  }

  /**
   * Review adjustment request (Admin only)
   * Approve or reject the adjustment
   */
  async reviewAdjustment(
    adjustmentId: string,
    dto: ReviewAdjustmentDto,
  ): Promise<InventoryAdjustment> {
    const adjustment = await this.adjustmentRepository.findOne({
      where: { adjustmentId },
      relations: ['product'],
    });

    if (!adjustment) {
      throw new NotFoundException('Adjustment request not found');
    }

    if (adjustment.status !== AdjustmentStatus.PENDING) {
      throw new BadRequestException('Adjustment has already been reviewed');
    }

    // Validate rejection reason
    if (
      dto.status === AdjustmentStatus.REJECTED &&
      !dto.rejectionReason?.trim()
    ) {
      throw new BadRequestException(
        'Rejection reason is required when rejecting an adjustment',
      );
    }

    // Update adjustment status
    adjustment.status = dto.status;
    adjustment.reviewedBy = dto.reviewedBy;
    adjustment.reviewedAt = new Date();

    if (dto.status === AdjustmentStatus.REJECTED && dto.rejectionReason) {
      adjustment.rejectionReason = dto.rejectionReason;
    }

    // If approved, apply the adjustment to inventory
    if (dto.status === AdjustmentStatus.APPROVED) {
      await this.applyAdjustment(adjustment);
    }

    return await this.adjustmentRepository.save(adjustment);
  }

  /**
   * Apply approved adjustment to inventory
   * Private method called when adjustment is approved
   */
  private async applyAdjustment(
    adjustment: InventoryAdjustment,
  ): Promise<void> {
    const inventory = await this.inventoryRepository.findOne({
      where: { productId: adjustment.productId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    // Apply adjustment based on type
    switch (adjustment.adjustmentType) {
      case AdjustmentType.INCREASE:
        inventory.currentStock += adjustment.quantity;
        break;

      case AdjustmentType.DECREASE:
        if (inventory.currentStock < adjustment.quantity) {
          throw new BadRequestException(
            'Cannot decrease stock below zero. Current stock: ' +
              inventory.currentStock,
          );
        }
        inventory.currentStock -= adjustment.quantity;
        break;

      case AdjustmentType.SET:
        inventory.currentStock = adjustment.quantity;
        break;
    }

    // Update original price if provided (optional)
    if (
      adjustment.originalPrice !== null &&
      adjustment.originalPrice !== undefined
    ) {
      inventory.originalPrice = adjustment.originalPrice;
    }

    await this.inventoryRepository.save(inventory);
    await this.syncProductStock(adjustment.productId);
  }

  /**
   * Cancel adjustment request (Staff - only if pending)
   */
  async cancelAdjustment(adjustmentId: string): Promise<InventoryAdjustment> {
    const adjustment = await this.adjustmentRepository.findOne({
      where: { adjustmentId },
    });

    if (!adjustment) {
      throw new NotFoundException('Adjustment request not found');
    }

    if (adjustment.status !== AdjustmentStatus.PENDING) {
      throw new BadRequestException(
        'Can only cancel pending adjustment requests',
      );
    }

    adjustment.status = AdjustmentStatus.REJECTED;
    adjustment.rejectionReason = 'Cancelled by requestor';
    adjustment.reviewedAt = new Date();

    return await this.adjustmentRepository.save(adjustment);
  }

  /**
   * Get adjustment history for a product
   */
  async getProductAdjustmentHistory(
    productId: string,
  ): Promise<InventoryAdjustment[]> {
    return await this.adjustmentRepository.find({
      where: { productId },
      relations: ['requestedByUser', 'reviewedByUser'],
      order: { createdAt: 'DESC' },
    });
  }
}
