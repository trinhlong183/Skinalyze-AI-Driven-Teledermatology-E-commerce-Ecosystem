import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ResponseHelper } from '../utils/responses';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '🛒 Checkout cart - Convert selected cart items to order',
    description: `
      Checkout only the items that are marked as selected in the cart.
      - Validates inventory availability for selected items
      - Creates order with payment record
      - Removes selected items from cart (unselected items remain)
      - Throws error if no items are selected
      - Automatically rolls back if inventory confirmation fails
    `,
  })
  async checkout(@Req() req, @Body() checkoutDto: CheckoutCartDto) {
    const userId = req.user.userId;
    const order = await this.ordersService.checkoutCart(userId, checkoutDto);
    return ResponseHelper.success(
      'Cart checkout successfully, order created',
      order,
    );
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my orders (Customer only)' })
  async getMyOrders(@Req() req) {
    const userId = req.user.userId;
    console.log('🔍 DEBUG - userId:', userId);
    const customer = await this.ordersService.getCustomerByUserId(userId);
    if (!customer) {
      return ResponseHelper.notFound('Customer not found');
    }
    const orders = await this.ordersService.findByCustomerId(
      customer.customerId,
    );
    return ResponseHelper.success('Your orders retrieved successfully', orders);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order (Staff/Admin only)' })
  async create(@Body() createDto: CreateOrderDto) {
    const order = await this.ordersService.create(createDto);
    return ResponseHelper.success('Order created successfully', order);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders (Staff/Admin only)' })
  @ApiQuery({ name: 'customerId', required: false })
  async findAll(@Query('customerId') customerId?: string) {
    const orders = customerId
      ? await this.ordersService.findByCustomerId(customerId)
      : await this.ordersService.findAll();
    return ResponseHelper.success('Orders retrieved successfully', orders);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an order by ID' })
  async findOne(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    return ResponseHelper.success('Order retrieved successfully', order);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an order (Staff/Admin only)' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateOrderDto) {
    const order = await this.ordersService.update(id, updateDto);
    return ResponseHelper.success('Order updated successfully', order);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an order (Staff/Admin only)' })
  async cancel(@Param('id') id: string, @Body() cancelDto: CancelOrderDto) {
    const order = await this.ordersService.cancelOrder(id, cancelDto.reason);
    return ResponseHelper.success('Order cancelled successfully', order);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm an order (Staff/Admin only)' })
  async confirm(@Param('id') id: string, @Body() confirmDto: ConfirmOrderDto) {
    const order = await this.ordersService.confirmOrder(
      id,
      confirmDto.processedBy,
      confirmDto.shippingMethod,
    );
    return ResponseHelper.success('Order confirmed successfully', order);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '✅ Customer marks order as completed',
    description:
      'Customer can mark an order as COMPLETED only when it has been DELIVERED. Optional feedback can be provided.',
  })
  async complete(
    @Req() req,
    @Param('id') id: string,
    @Body() completeDto: CompleteOrderDto,
  ) {
    const userId = req.user.userId;
    const customer = await this.ordersService.getCustomerByUserId(userId);
    if (!customer) {
      return ResponseHelper.notFound('Customer not found');
    }
    const order = await this.ordersService.completeOrder(
      id,
      customer.customerId,
      completeDto.feedback,
    );
    return ResponseHelper.success(
      'Order marked as completed successfully',
      order,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an order (Admin only)' })
  async remove(@Param('id') id: string) {
    await this.ordersService.remove(id);
    return ResponseHelper.success('Order deleted successfully');
  }
}
