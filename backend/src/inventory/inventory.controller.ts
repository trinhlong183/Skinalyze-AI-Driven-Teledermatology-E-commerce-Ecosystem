import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';
import { ResponseHelper } from '../utils/responses';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all inventory' })
  @ApiResponse({ status: 200, description: 'Returns all inventory' })
  getAllInventory() {
    return this.inventoryService.getAllInventory();
  }

  @Get('products/:productId/adjustments')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get adjustment history for a product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Returns adjustment history' })
  async getProductAdjustmentHistory(@Param('productId') productId: string) {
    const adjustments =
      await this.inventoryService.getProductAdjustmentHistory(productId);
    return ResponseHelper.success(
      'Adjustment history retrieved successfully',
      adjustments,
    );
  }

  @Get('product/:productId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get inventory for specific product' })
  @ApiParam({ name: 'productId' })
  @ApiResponse({ status: 200, description: 'Returns product inventory' })
  getProductInventory(@Param('productId') productId: string) {
    return this.inventoryService.getProductInventory(productId);
  }

  @Get('product/:productId/available')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get available stock for product' })
  @ApiParam({ name: 'productId' })
  @ApiResponse({ status: 200, description: 'Returns available stock' })
  async getAvailableStock(@Param('productId') productId: string) {
    const available = await this.inventoryService.getAvailableStock(productId);
    return { productId, available };
  }

  @Get('alerts/low-stock')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get low stock alerts' })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns low stock products' })
  getLowStockAlerts(@Query('threshold') threshold?: number) {
    return this.inventoryService.getLowStockAlerts(threshold);
  }

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get inventory summary' })
  @ApiResponse({ status: 200, description: 'Returns summary stats' })
  getInventorySummary() {
    return this.inventoryService.getInventorySummary();
  }

  @Post('adjust')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust inventory stock' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        quantity: { type: 'number', description: '+/- to add/remove' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Stock adjusted' })
  async adjustStock(
    @Body() dto: { productId: string; quantity: number },
    @GetUser() user: User,
  ) {
    await this.inventoryService.adjustStock(
      dto.productId,
      dto.quantity,
      user.userId,
    );
    return ResponseHelper.success('Stock adjusted successfully');
  }

  @Post('set')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set inventory stock' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['productId', 'quantity'],
      properties: {
        productId: { type: 'string' },
        quantity: { type: 'number' },
        originalPrice: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Stock set' })
  async setStock(
    @Body()
    dto: {
      productId: string;
      quantity: number;
      originalPrice?: number;
    },
    @GetUser() user: User,
  ) {
    await this.inventoryService.setStock(
      dto.productId,
      dto.quantity,
      dto.originalPrice,
      user.userId,
    );
    return ResponseHelper.success('Stock set successfully');
  }

  @Post('reserve')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reserve stock' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        quantity: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Stock reserved' })
  async reserveStock(@Body() dto: { productId: string; quantity: number }) {
    const result = await this.inventoryService.reserveStock(
      dto.productId,
      dto.quantity,
    );

    if (!result.success) {
      return ResponseHelper.badRequest('Không đủ hàng trong kho');
    }

    return ResponseHelper.success('Stock reserved successfully', result);
  }

  @Post('release')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release reservation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        quantity: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Reservation released' })
  async releaseReservation(
    @Body() dto: { productId: string; quantity: number },
  ) {
    await this.inventoryService.releaseReservation(dto.productId, dto.quantity);
    return ResponseHelper.success('Reservation released successfully');
  }

  @Post('confirm-sale')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm sale' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        quantity: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Sale confirmed' })
  async confirmSale(@Body() dto: { productId: string; quantity: number }) {
    await this.inventoryService.confirmSale(dto.productId, dto.quantity);
    return ResponseHelper.success('Sale confirmed successfully');
  }

  @Post('adjustments/request')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create stock adjustment request (requires admin approval)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'productId',
        'adjustmentType',
        'quantity',
        'reason',
        'requestedBy',
      ],
      properties: {
        productId: { type: 'string', description: 'Product UUID' },
        adjustmentType: {
          type: 'string',
          enum: ['INCREASE', 'DECREASE', 'SET'],
          description: 'Type of adjustment',
        },
        quantity: {
          type: 'number',
          description: 'Quantity to adjust (positive number)',
        },
        reason: {
          type: 'string',
          description:
            'Reason for adjustment (e.g., restock, damage, loss, correction)',
        },
        requestedBy: {
          type: 'string',
          description: 'User ID who is requesting',
        },
        originalPrice: {
          type: 'number',
          description:
            'Optional - New cost price if updating (leave empty to keep current price)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Adjustment request created successfully',
  })
  async createAdjustmentRequest(@Body() dto: any) {
    const adjustment = await this.inventoryService.createAdjustmentRequest(dto);
    return ResponseHelper.created(
      'Adjustment request created and pending approval',
      adjustment,
    );
  }

  @Get('adjustments/pending')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all pending adjustment requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns pending adjustments' })
  async getPendingAdjustments() {
    const adjustments = await this.inventoryService.getPendingAdjustments();
    return ResponseHelper.success(
      'Pending adjustments retrieved successfully',
      adjustments,
    );
  }

  @Get('adjustments')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all adjustment requests' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
  })
  @ApiResponse({ status: 200, description: 'Returns adjustment requests' })
  async getAllAdjustments(@Query('status') status?: string) {
    const adjustments = await this.inventoryService.getAllAdjustments(
      status as any,
    );
    return ResponseHelper.success(
      'Adjustments retrieved successfully',
      adjustments,
    );
  }

  @Get('adjustments/:id')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get adjustment request by ID' })
  @ApiParam({ name: 'id', description: 'Adjustment UUID' })
  @ApiResponse({ status: 200, description: 'Returns adjustment request' })
  async getAdjustmentById(@Param('id') id: string) {
    const adjustment = await this.inventoryService.getAdjustmentById(id);
    return ResponseHelper.success(
      'Adjustment retrieved successfully',
      adjustment,
    );
  }

  @Post('adjustments/:id/review')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve or reject adjustment request (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Adjustment UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status', 'reviewedBy'],
      properties: {
        status: {
          type: 'string',
          enum: ['APPROVED', 'REJECTED'],
          description: 'Approval decision',
        },
        reviewedBy: {
          type: 'string',
          description: 'Admin user ID who is reviewing',
        },
        rejectionReason: {
          type: 'string',
          description: 'Required if status is REJECTED',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Adjustment reviewed successfully' })
  async reviewAdjustment(@Param('id') id: string, @Body() dto: any) {
    const adjustment = await this.inventoryService.reviewAdjustment(id, dto);
    return ResponseHelper.success(
      `Adjustment ${dto.status.toLowerCase()} successfully`,
      adjustment,
    );
  }

  @Delete('adjustments/:id/cancel')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel pending adjustment request' })
  @ApiParam({ name: 'id', description: 'Adjustment UUID' })
  @ApiResponse({ status: 200, description: 'Adjustment cancelled' })
  async cancelAdjustment(@Param('id') id: string) {
    const adjustment = await this.inventoryService.cancelAdjustment(id);
    return ResponseHelper.success(
      'Adjustment cancelled successfully',
      adjustment,
    );
  }
}
