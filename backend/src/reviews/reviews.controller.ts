import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a product review',
    description: 'Create a review for a product. User must have purchased the product (order status = delivered) to leave a review. Users can only create one review per product.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Review created successfully',
    schema: {
      example: {
        reviewId: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'c0b9bd8d-73f2-48e3-bee0-c493e7dfd92c',
        productId: '511fa772-4a30-4f85-91b0-25cc07655f26',
        rating: 5,
        content: 'Amazing product! Really improved my skin texture.',
        createdAt: '2025-11-08T12:00:00.000Z',
        updatedAt: '2025-11-08T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User has not purchased this product or already reviewed it',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  create(@Body() createReviewDto: CreateReviewDto, @GetUser() user: User) {
    return this.reviewsService.create(user.userId, createReviewDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all reviews',
    description: 'Retrieve all reviews with user and product information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all reviews',
    schema: {
      example: [
        {
          reviewId: '123e4567-e89b-12d3-a456-426614174000',
          userId: 'c0b9bd8d-73f2-48e3-bee0-c493e7dfd92c',
          productId: '511fa772-4a30-4f85-91b0-25cc07655f26',
          rating: 5,
          content: 'Great product!',
          createdAt: '2025-11-08T12:00:00.000Z',
          updatedAt: '2025-11-08T12:00:00.000Z',
          user: {
            userId: 'c0b9bd8d-73f2-48e3-bee0-c493e7dfd92c',
            fullName: 'John Doe',
            email: 'john@example.com',
          },
          product: {
            productId: '511fa772-4a30-4f85-91b0-25cc07655f26',
            productName: 'Crème de la Mer',
          },
        },
      ],
    },
  })
  findAll() {
    return this.reviewsService.findAll();
  }

  @Get('product/:productId')
  @ApiOperation({ 
    summary: 'Get reviews for a specific product',
    description: 'Retrieve all reviews for a specific product',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product UUID',
    example: '511fa772-4a30-4f85-91b0-25cc07655f26',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of product reviews',
  })
  findByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @Get('product/:productId/stats')
  @ApiOperation({ 
    summary: 'Get product rating statistics',
    description: 'Get average rating, total reviews, and rating distribution for a product',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product UUID',
    example: '511fa772-4a30-4f85-91b0-25cc07655f26',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product rating statistics',
    schema: {
      example: {
        averageRating: 4.5,
        totalReviews: 10,
        ratingDistribution: [
          { rating: 1, count: 0 },
          { rating: 2, count: 1 },
          { rating: 3, count: 2 },
          { rating: 4, count: 3 },
          { rating: 5, count: 4 },
        ],
      },
    },
  })
  getProductStats(@Param('productId') productId: string) {
    return this.reviewsService.getProductRatingStats(productId);
  }

  @Get('my-reviews')
  @ApiOperation({ 
    summary: 'Get current user reviews',
    description: 'Retrieve all reviews created by the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user reviews',
  })
  findMyReviews(@GetUser() user: User) {
    return this.reviewsService.findByUser(user.userId);
  }

  @Get('order/:orderId/reviewable')
  @ApiOperation({ 
    summary: 'Get reviewable products from an order',
    description: 'Retrieve all products from a specific order that have not been reviewed yet. Order must be DELIVERED or COMPLETED.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reviewable products from the order',
    schema: {
      example: {
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        orderStatus: 'DELIVERED',
        reviewableProducts: [
          {
            productId: '511fa772-4a30-4f85-91b0-25cc07655f26',
            productName: 'Crème de la Mer',
            productImages: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
            priceAtTime: 150.00,
            quantity: 1,
          },
        ],
        totalProducts: 2,
        reviewedCount: 1,
        remainingCount: 1,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Order is not yet delivered or completed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot view other users orders',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  getReviewableProducts(
    @Param('orderId') orderId: string,
    @GetUser() user: User,
  ) {
    return this.reviewsService.getReviewableProductsByOrder(user.userId, orderId);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a specific review',
    description: 'Retrieve a single review by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Review UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review details',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update own review',
    description: 'Update a review. Users can only update their own reviews.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot update other users reviews',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @GetUser() user: User,
  ) {
    return this.reviewsService.update(user.userId, id, updateReviewDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete own review',
    description: 'Delete a review. Users can only delete their own reviews.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review deleted successfully',
    schema: {
      example: {
        message: 'Review with ID 123e4567-e89b-12d3-a456-426614174000 deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot delete other users reviews',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.reviewsService.remove(user.userId, id);
  }
}