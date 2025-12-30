import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useCallback } from "react";
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from "@expo/vector-icons/Ionicons";
import reviewService, { Review, ReviewStats } from "@/services/reviewService";
import { useAuth } from "@/hooks/useAuth";
import CustomAlert from "@/components/CustomAlert"; // Make sure path is correct

interface ReviewsComponentProps {
  productId: string;
  primaryColor: string;
  onWriteReview?: (reviewData?: Review) => void;
}

export default function ReviewsComponent({
  productId,
  primaryColor,
  onWriteReview,
}: ReviewsComponentProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const { user } = useAuth();

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
  });

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (productId) {
      fetchReviewData();
    }
  }, [productId]);

  // Refresh reviews when screen comes back into focus, but only if data is stale
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      // Only refresh if more than 5 seconds have passed since last fetch
      if (productId && (now - lastFetchTime > 5000)) {
        fetchReviewData();
      }
    }, [productId, lastFetchTime])
  );

  const fetchReviewData = async () => {
    const now = Date.now();
    // Prevent rapid successive calls (within 1 second)
    if (now - lastFetchTime < 1000) {
      return;
    }
    
    try {
      setLoading(true);
      setLastFetchTime(now);
      const [reviewsData, statsData] = await Promise.all([
        reviewService.getProductReviews(productId),
        reviewService.getProductReviewStats(productId),
      ]);
      setReviews(reviewsData);
      setStats(statsData);
      
      // Check if user has already reviewed this product and purchase status
      if (user) {
        const userReview = reviewsData.find(review => review.userId === user.userId);
        setHasReviewed(!!userReview);
        
        // Check if user has purchased this product by checking their delivered orders
        try {
          const orderService = (await import('../services/orderService')).default;
          const tokenService = (await import('../services/tokenService')).default;
          
          const token = await tokenService.getToken();
          if (token) {
            const orders = await orderService.getMyOrders(token);
            const deliveredOrders = orders.filter(order => order.status === 'DELIVERED');
            
            const hasPurchasedProduct = deliveredOrders.some(order => 
              order.orderItems.some(item => item.product.productId === productId)
            );
            
            setHasPurchased(hasPurchasedProduct);
            setCanReview(hasPurchasedProduct && !userReview);
          } else {
            setHasPurchased(false);
            setCanReview(false);
          }
        } catch (error) {
          console.error('Error checking purchase history:', error);
          // If we can't verify purchase, don't allow review
          setHasPurchased(false);
          setCanReview(false);
        }
      } else {
        setHasReviewed(false);
        setHasPurchased(false);
        setCanReview(false);
      }
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const showReviewOptions = (review: Review) => {
    setAlertConfig({
      visible: true,
      title: "Review Options",
      message: "What would you like to do with this review?",
      type: "info",
      confirmText: "Edit",
      cancelText: "Delete", 
      onConfirm: () => {
        hideAlert();
        if (onWriteReview) onWriteReview(review);
      },
      onCancel: () => {
        hideAlert();
        confirmDeleteReview(review);
      }
    });
  };

  const confirmDeleteReview = (review: Review) => {
    // Need a slight delay to allow the first modal to close completely
    setTimeout(() => {
      setAlertConfig({
        visible: true,
        title: "Delete Review",
        message: "Are you sure you want to delete this review? This action cannot be undone.",
        type: "warning",
        confirmText: "Delete",
        cancelText: "Cancel",
        onConfirm: () => deleteReview(review),
        onCancel: hideAlert
      });
    }, 300);
  };

  const deleteReview = async (review: Review) => {
    hideAlert();
    try {
      await reviewService.deleteReview(review.reviewId);
      fetchReviewData(); // Refresh list
      
      setTimeout(() => {
        setAlertConfig({
          visible: true,
          title: "Success",
          message: "Review deleted successfully",
          type: "success",
          onConfirm: hideAlert
        });
      }, 300);
    } catch (error: any) {
      setTimeout(() => {
        setAlertConfig({
          visible: true,
          title: "Error",
          message: "Failed to delete review. Please try again.",
          type: "error",
          onConfirm: hideAlert
        });
      }, 300);
    }
  };

  const renderStars = (rating: number, size = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? "#FFD700" : "#DDD"}
          />
        ))}
      </View>
    );
  };

  const renderRatingDistribution = () => {
    if (!stats || stats.totalReviews === 0) return null;

    return (
      <View style={styles.distributionContainer}>
        {stats.ratingDistribution
          .sort((a, b) => b.rating - a.rating)
          .map((item) => {
            const percentage = (item.count / stats.totalReviews) * 100;
            return (
              <View key={item.rating} style={styles.distributionRow}>
                <Text style={styles.distributionRating}>{item.rating}</Text>
                <Ionicons name="star" size={12} color="#FFD700" />
                <View style={styles.distributionBarContainer}>
                  <View
                    style={[
                      styles.distributionBar,
                      { width: `${percentage}%`, backgroundColor: primaryColor },
                    ]}
                  />
                </View>
                <Text style={styles.distributionCount}>{item.count}</Text>
              </View>
            );
          })}
      </View>
    );
  };

  const renderReviewItem = (review: Review) => {
    const isUserReview = user && review.userId === user.userId;
    
    return (
      <View key={review.reviewId} style={styles.reviewItem}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewUserInfo}>
            <View style={styles.reviewAvatar}>
              <Text style={styles.reviewAvatarText}>
                {review.user?.fullName?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View style={styles.reviewUserDetails}>
              <Text style={styles.reviewUserName}>
                {review.user?.fullName || "Anonymous"}
              </Text>
              <Text style={styles.reviewDate}>
                {new Date(review.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={styles.reviewActions}>
            {renderStars(review.rating, 14)}
            {isUserReview && (
              <View style={styles.reviewMenuContainer}>
                <TouchableOpacity
                  style={styles.reviewMenuButton}
                  onPress={() => showReviewOptions(review)}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.reviewContent}>{review.content}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={primaryColor} />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  const displayReviews = expanded ? reviews : reviews.slice(0, 3);

  return (
    <View style={styles.container}>
      {/* Reviews Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reviews & Ratings</Text>
        {onWriteReview && canReview && hasPurchased && !hasReviewed && (
          <TouchableOpacity
            style={[styles.writeReviewButton, { borderColor: primaryColor }]}
            onPress={() => onWriteReview && onWriteReview()}
          >
            <Ionicons name="create-outline" size={16} color={primaryColor} />
            <Text style={[styles.writeReviewText, { color: primaryColor }]}>
              Write Review
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {stats && stats.totalReviews > 0 ? (
        <>
          {/* Rating Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.averageRatingContainer}>
              <Text style={styles.averageRating}>
                {stats.averageRating.toFixed(1)}
              </Text>
              {renderStars(Math.round(stats.averageRating), 20)}
              <Text style={styles.totalReviews}>
                Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
              </Text>
            </View>
            {renderRatingDistribution()}
          </View>

          {/* Reviews List */}
          <View style={styles.reviewsContainer}>
            {displayReviews.map(renderReviewItem)}
            
            {reviews.length > 3 && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setExpanded(!expanded)}
              >
                <Text style={[styles.showMoreText, { color: primaryColor }]}>
                  {expanded 
                    ? "Show Less" 
                    : `Show All ${reviews.length} Reviews`
                  }
                </Text>
                <Ionicons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={primaryColor}
                />
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <View style={styles.noReviewsContainer}>
          <Ionicons name="chatbubble-outline" size={48} color="#CCC" />
          <Text style={styles.noReviewsTitle}>No Reviews Yet</Text>
          <Text style={styles.noReviewsSubtitle}>
            Be the first to share your experience with this product
          </Text>
        </View>
      )}

      {/* Integrate Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    margin: 16,
    overflow: "hidden",
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  writeReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 6,
    gap: 4,
  },
  writeReviewText: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  averageRatingContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  averageRating: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 4,
  },
  totalReviews: {
    fontSize: 14,
    color: "#666",
  },
  distributionContainer: {
    gap: 4,
  },
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  distributionRating: {
    fontSize: 14,
    color: "#1A1A1A",
    width: 12,
  },
  distributionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  distributionBar: {
    height: "100%",
    borderRadius: 4,
  },
  distributionCount: {
    fontSize: 12,
    color: "#666",
    width: 20,
    textAlign: "right",
  },
  reviewsContainer: {
    padding: 16,
  },
  reviewItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewMenuContainer: {
    marginLeft: 8,
  },
  reviewMenuButton: {
    padding: 4,
    borderRadius: 4,
  },
  reviewUserInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reviewAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  reviewUserDetails: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: "#999",
  },
  reviewContent: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noReviewsContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  noReviewsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 12,
    marginBottom: 4,
  },
  noReviewsSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});