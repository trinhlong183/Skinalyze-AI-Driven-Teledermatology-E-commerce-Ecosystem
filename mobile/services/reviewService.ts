import apiService from "./apiService";

export interface ReviewPayload {    
  productId: string,
  rating: number,
  content: string
}

export interface Review {
    reviewId: string,
    userId: string,
    productId: string,
    rating: number,
    content: string,
    createdAt: string,
    updatedAt: string,
    user?: {
      fullName: string;
      photoUrl?: string;
    };
    product?: {
      productId: string;
      name: string;
      description?: string;
      price: number;
      images: string[];
      category?: string;
    };
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Array<{
    rating: number;
    count: number;
  }>;
}

export interface ReviewableProduct {
  productId: string;
  productName: string;
  productImages: string[];
  priceAtTime: number;
  quantity: number;
}

export interface OrderReviewableResponse {
  orderId: string;
  orderStatus: string;
  reviewableProducts: ReviewableProduct[];
  totalProducts: number;
  reviewedCount: number;
  remainingCount: number;
}

interface ReviewResponse {
  statusCode: number;
  message: string;
  data: Review;
  timestamp: string;
}

interface ReviewsResponse {
  statusCode: number;
  message: string;
  data: Review[];
  timestamp: string;
}

interface ReviewStatsResponse {
  statusCode: number;
  message: string;
  data: ReviewStats;
  timestamp: string;
}

interface OrderReviewableApiResponse {
  statusCode: number;
  message: string;
  data: OrderReviewableResponse;
  timestamp: string;
}

class ReviewService {
    async postReview(payload: ReviewPayload): Promise<Review> {
        try {
          const response = await apiService.post<ReviewResponse>('/reviews', payload);
          return response.data;
        } catch (error) {
          console.error("❌ Error creating review:", error);
          throw error;
        }
    }

    async updateReview(reviewId: string, payload: Partial<ReviewPayload>): Promise<Review> {
        try {
          const response = await apiService.patch<ReviewResponse>(`/reviews/${reviewId}`, payload);
          return response.data;
        } catch (error) {
          console.error("❌ Error updating review:", error);
          throw error;
        }
    }

    async deleteReview(reviewId: string): Promise<void> {
        try {
          await apiService.delete<void>(`/reviews/${reviewId}`);
        } catch (error) {
          console.error("❌ Error deleting review:", error);
          throw error;
        }
    }

    async getMyReviews(): Promise<Review[]> {
        try {
          const response = await apiService.get<ReviewsResponse>('/reviews/my-reviews');
          return response.data;
        } catch (error) {
          console.error("❌ Error fetching user reviews:", error);
          throw error;
        }
    }

    async getProductReviews(productId: string): Promise<Review[]> {
        try {
          const response = await apiService.get<ReviewsResponse>(`/reviews/product/${productId}`);
          return response.data;
        } catch (error) {
          console.error("❌ Error fetching reviews:", error);
          throw error;
        }
    }

    async getProductReviewStats(productId: string): Promise<ReviewStats> {
        try {
          const response = await apiService.get<ReviewStatsResponse>(`/reviews/product/${productId}/stats`);
          return response.data;
        } catch (error) {
          console.error("❌ Error fetching review stats:", error);
          throw error;
        }
    }

    async getOrderReviewableProducts(orderId: string): Promise<OrderReviewableResponse> {
        try {
          const response = await apiService.get<OrderReviewableApiResponse>(`/reviews/order/${orderId}/reviewable`);
          return response.data;
        } catch (error) {
          console.error("❌ Error fetching reviewable products:", error);
          throw error;
        }
    }

    async canReviewOrder(orderId: string): Promise<{ canReview: boolean; reviewableCount: number }> {
        try {
          const reviewableData = await this.getOrderReviewableProducts(orderId);
          const canReview = reviewableData.orderStatus === 'DELIVERED' && reviewableData.remainingCount > 0;
          return { 
            canReview, 
            reviewableCount: reviewableData.remainingCount 
          };
        } catch (error) {
          console.error("❌ Error checking if order can be reviewed:", error);
          return { canReview: false, reviewableCount: 0 };
        }
    }

    async checkCanReview(productId: string): Promise<{ canReview: boolean; hasReviewed: boolean; hasPurchased: boolean }> {
        try {
          // Import orderService here to avoid circular dependencies
          const orderService = (await import('./orderService')).default;
          const tokenService = (await import('./tokenService')).default;
          
          const token = await tokenService.getToken();
          if (!token) {
            return { canReview: false, hasReviewed: false, hasPurchased: false };
          }

          // Check if user has delivered or completed orders with this product
          const orders = await orderService.getMyOrders(token);
          const eligibleOrders = orders.filter(order => 
            order.status === 'DELIVERED' || order.status === 'COMPLETED'
          );
          
          const hasPurchased = eligibleOrders.some(order => 
            order.orderItems.some(item => item.product.productId === productId)
          );

          if (!hasPurchased) {
            return { canReview: false, hasReviewed: false, hasPurchased: false };
          }

          // Check if user has already reviewed this product
          const reviews = await this.getProductReviews(productId);
          const userReview = reviews.find(review => review.userId === token); // Assuming token contains userId or we can extract it
          const hasReviewed = !!userReview;

          const canReview = hasPurchased && !hasReviewed;
          
          return { canReview, hasReviewed, hasPurchased };
        } catch (error: any) {
          console.error("❌ Error checking review eligibility:", error);
          return { canReview: false, hasReviewed: false, hasPurchased: false };
        }
    }
}
export const reviewService = new ReviewService();
export default reviewService;