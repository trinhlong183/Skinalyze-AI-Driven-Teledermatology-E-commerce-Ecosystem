import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';
import { Order } from '../orders/entities/order.entity';
import { ResponseHelper } from '../utils/responses';
import { OrderItem } from '../orders/entities/order-item.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
  ) {}

  async create(userId: string, createReviewDto: CreateReviewDto) {
    const { productId, rating, content } = createReviewDto;

    // 🔥 Check if user has purchased this product
    const hasPurchased = await this.hasUserPurchasedProduct(userId, productId);
    if (!hasPurchased) {
      throw new ForbiddenException(
        'You can only review products you have purchased',
      );
    }

    // Check if user already reviewed this product
    const existingReview = await this.reviewRepository.findOne({
      where: { userId, productId },
    });

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this product. Please update your existing review instead.',
      );
    }

    // Create review
    const review = this.reviewRepository.create({
      userId,
      productId,
      rating,
      content,
    });

    const savedReview = await this.reviewRepository.save(review);

    return ResponseHelper.created('Review created successfully', savedReview);
  }

  async findAll() {
    const reviews = await this.reviewRepository.find({
      relations: ['user', 'product'],
      order: { createdAt: 'DESC' },
    });

    return ResponseHelper.success('Reviews retrieved successfully', reviews);
  }

  async findByProduct(productId: string) {
    const reviews = await this.reviewRepository.find({
      where: { productId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return ResponseHelper.success(
      'Product reviews retrieved successfully',
      reviews,
    );
  }

  async findByUser(userId: string) {
    const reviews = await this.reviewRepository.find({
      where: { userId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });

    return ResponseHelper.success(
      'User reviews retrieved successfully',
      reviews,
    );
  }

  async findOne(reviewId: string) {
    const review = await this.reviewRepository.findOne({
      where: { reviewId },
      relations: ['user', 'product'],
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    return ResponseHelper.success('Review retrieved successfully', review);
  }

  async update(
    userId: string,
    reviewId: string,
    updateReviewDto: UpdateReviewDto,
  ) {
    const review = await this.reviewRepository.findOne({
      where: { reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    // Check if user owns this review
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    Object.assign(review, updateReviewDto);
    const updatedReview = await this.reviewRepository.save(review);

    return ResponseHelper.success('Review updated successfully', updatedReview);
  }

  async remove(userId: string, reviewId: string) {
    const review = await this.reviewRepository.findOne({
      where: { reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    // Check if user owns this review
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewRepository.remove(review);

    return ResponseHelper.success(
      `Review with ID ${reviewId} deleted successfully`,
    );
  }

  async getProductRatingStats(productId: string) {
    const reviews = await this.reviewRepository.find({
      where: { productId },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) /
          totalReviews
        : 0;

    // Calculate distribution
    const distribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: reviews.filter((r) => Math.floor(Number(r.rating)) === rating)
        .length,
    }));

    const stats = {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews,
      ratingDistribution: distribution,
    };

    return ResponseHelper.success(
      'Product rating statistics retrieved successfully',
      stats,
    );
  }

  async getReviewableProductsByOrder(userId: string, orderId: string) {
    // Find the order and verify it belongs to the user
    const order = await this.orderRepository.findOne({
      where: { orderId },
      relations: ['customer', 'customer.user', 'orderItems', 'orderItems.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Check if order belongs to the user
    if (order.customer?.user?.userId !== userId) {
      throw new ForbiddenException('You can only view your own orders');
    }

    // Check if order is delivered or completed
    if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') {
      throw new BadRequestException(
        'You can only review products from delivered or completed orders',
      );
    }

    // Get all products from the order
    const productIds = order.orderItems.map((item) => item.productId);

    // Get existing reviews for these products by this user
    const existingReviews = await this.reviewRepository.find({
      where: {
        userId,
        productId: In(productIds),
      },
    });

    const reviewedProductIds = new Set(
      existingReviews.map((review) => review.productId),
    );

    // Filter out products that have already been reviewed
    const reviewableProducts = order.orderItems
      .filter((item) => !reviewedProductIds.has(item.productId))
      .map((item) => ({
        productId: item.product.productId,
        productName: item.product.productName,
        productImages: item.product.productImages,
        priceAtTime: item.priceAtTime,
        quantity: item.quantity,
      }));

    return ResponseHelper.success(
      'Reviewable products retrieved successfully',
      {
        orderId: order.orderId,
        orderStatus: order.status,
        reviewableProducts,
        totalProducts: order.orderItems.length,
        reviewedCount: existingReviews.length,
        remainingCount: reviewableProducts.length,
      },
    );
  }

  private async hasUserPurchasedProduct(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    // Find completed orders for this user
    // Order -> Customer -> User relationship
    const completedOrders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.customer', 'customer')
      .leftJoin('customer.user', 'user')
      .where('user.userId = :userId', { userId })
      .andWhere('order.status IN (:...statuses)', { statuses: ['DELIVERED', 'COMPLETED'] })
      .select(['order.orderId'])
      .getMany();

    if (completedOrders.length === 0) {
      return false;
    }

    const orderIds = completedOrders.map((order) => order.orderId);

    // Check if any of these orders contain the product
    const orderItem = await this.orderItemRepository.findOne({
      where: {
        orderId: In(orderIds),
        productId,
      },
    });

    return !!orderItem;
  }
}
