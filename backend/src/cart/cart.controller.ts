import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ResponseHelper } from '../utils/responses';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user cart',
    description: "Retrieve the authenticated user's shopping cart from Redis.",
  })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Cart retrieved successfully',
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          items: [
            {
              productId: '650e8400-e29b-41d4-a716-446655440000',
              productName: 'Sunscreen SPF 50',
              price: 350000,
              quantity: 2,
              addedAt: '2025-10-06T10:30:00.000Z',
            },
          ],
          totalItems: 2,
          totalPrice: 700000,
          updatedAt: '2025-10-06T10:30:00.000Z',
        },
        timestamp: '2025-10-06T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCart(@GetUser() user: User) {
    const cart = await this.cartService.getCart(user.userId);
    return ResponseHelper.success('Cart retrieved successfully', cart);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add product to cart',
    description:
      "Add a product to the user's cart. If product exists, increase quantity.",
  })
  @ApiBody({
    type: AddToCartDto,
    examples: {
      addProduct: {
        summary: 'Add product to cart',
        value: {
          productId: '650e8400-e29b-41d4-a716-446655440000',
          quantity: 2,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Product added to cart successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Product added to cart successfully',
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          items: [
            {
              productId: '650e8400-e29b-41d4-a716-446655440000',
              productName: 'Sunscreen SPF 50',
              price: 350000,
              quantity: 2,
              addedAt: '2025-10-06T10:30:00.000Z',
            },
          ],
          totalItems: 2,
          totalPrice: 700000,
          updatedAt: '2025-10-06T10:30:00.000Z',
        },
        timestamp: '2025-10-06T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addToCart(@GetUser() user: User, @Body() addToCartDto: AddToCartDto) {
    const cart = await this.cartService.addToCart(user.userId, addToCartDto);
    return ResponseHelper.success('Product added to cart successfully', cart);
  }

  @Patch('item/:productId')
  @ApiOperation({
    summary: 'Update cart item quantity',
    description: 'Update the quantity of a specific product in the cart.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product UUID',
    example: '650e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateCartItemDto,
    examples: {
      updateQuantity: {
        summary: 'Update quantity',
        value: {
          quantity: 3,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cart item updated successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Cart item updated successfully',
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          items: [
            {
              productId: '650e8400-e29b-41d4-a716-446655440000',
              productName: 'Sunscreen SPF 50',
              price: 350000,
              quantity: 3,
              addedAt: '2025-10-06T10:30:00.000Z',
            },
          ],
          totalItems: 3,
          totalPrice: 1050000,
          updatedAt: '2025-10-06T10:31:00.000Z',
        },
        timestamp: '2025-10-06T10:31:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found in cart' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCartItem(
    @GetUser() user: User,
    @Param('productId') productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    const cart = await this.cartService.updateCartItem(
      user.userId,
      productId,
      updateCartItemDto,
    );
    return ResponseHelper.success('Cart item updated successfully', cart);
  }

  @Delete('item/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove product from cart',
    description: 'Remove a specific product from the cart.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product UUID',
    example: '650e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Product removed from cart successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Product removed from cart successfully',
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          items: [],
          totalItems: 0,
          totalPrice: 0,
          updatedAt: '2025-10-06T10:32:00.000Z',
        },
        timestamp: '2025-10-06T10:32:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found in cart' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeFromCart(
    @GetUser() user: User,
    @Param('productId') productId: string,
  ) {
    const cart = await this.cartService.removeFromCart(user.userId, productId);
    return ResponseHelper.success(
      'Product removed from cart successfully',
      cart,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear cart',
    description: "Remove all items from the user's cart.",
  })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Cart cleared successfully',
        timestamp: '2025-10-06T10:33:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearCart(@GetUser() user: User) {
    await this.cartService.clearCart(user.userId);
    return ResponseHelper.success('Cart cleared successfully');
  }
  
  @Get('count')
  @ApiOperation({
    summary: 'Get cart item count',
    description: "Get the total number of items in the user's cart.",
  })
  @ApiResponse({
    status: 200,
    description: 'Cart item count retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Cart item count retrieved successfully',
        data: {
          count: 5,
        },
        timestamp: '2025-10-06T10:34:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCartItemCount(@GetUser() user: User) {
    const count = await this.cartService.getCartItemCount(user.userId);
    return ResponseHelper.success('Cart item count retrieved successfully', {
      count,
    });
  }

  @Patch('select/:productId')
  @ApiOperation({
    summary: '✅ Select/unselect item trong cart',
    description: 'Toggle select item để user chọn sản phẩm nào muốn checkout',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        selected: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Item selection updated successfully',
  })
  async toggleSelectItem(
    @GetUser() user: User,
    @Param('productId') productId: string,
    @Body('selected') selected: boolean,
  ) {
    const cart = await this.cartService.toggleSelectItem(
      user.userId,
      productId,
      selected,
    );
    return ResponseHelper.success('Item selection updated', cart);
  }

  @Patch('select-all')
  @ApiOperation({
    summary: '✅ Select/unselect tất cả items',
    description: 'Chọn hoặc bỏ chọn tất cả sản phẩm trong cart',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        selected: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'All items selection updated successfully',
  })
  async toggleSelectAll(
    @GetUser() user: User,
    @Body('selected') selected: boolean,
  ) {
    const cart = await this.cartService.toggleSelectAll(user.userId, selected);
    return ResponseHelper.success('All items selection updated', cart);
  }
}
