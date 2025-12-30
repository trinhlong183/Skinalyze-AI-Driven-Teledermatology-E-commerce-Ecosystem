import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColor } from '@/contexts/ThemeColorContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import reviewService, { Review } from '@/services/reviewService';
import productService from '@/services/productService';
import CustomAlert from '@/components/CustomAlert'; // Ensure path is correct

export default function MyReviewsScreen() {
  const router = useRouter();
  const { primaryColor } = useThemeColor();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrichedReviews, setEnrichedReviews] = useState<Review[]>([]);

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
    fetchMyReviews();
  }, []);

  const fetchMyReviews = async () => {
    try {
      setLoading(true);
      const reviewsData = await reviewService.getMyReviews();
      setReviews(reviewsData);
      
      const enrichedData = await Promise.all(
        reviewsData.map(async (review) => {
          try {
            if (review.product && review.product.name) {
              return review;
            }
            
            const productData = await productService.getProductById(review.productId);
            
            if (!productData) {
              throw new Error('Product data is null or undefined');
            }
            
            return {
              ...review,
              product: {
                productId: productData.productId,
                name: productData.productName,
                description: productData.productDescription,
                price: productData.sellingPrice,
                images: productData.productImages || [],
                category: productData.categories?.[0]?.categoryName || 'Unknown',
              },
            };
          } catch (error) {
            console.error(`Failed to fetch product ${review.productId}:`, error);
            return {
              ...review,
              product: {
                productId: review.productId,
                name: 'Product Unavailable',
                description: '',
                price: 0,
                images: [],
                category: 'Unknown',
              },
            };
          }
        })
      );
      
      setEnrichedReviews(enrichedData);
    } catch (error: any) {
      console.error('Error fetching my reviews:', error);
      setEnrichedReviews(reviews.map(review => ({
        ...review,
        product: {
          productId: review.productId,
          name: `Product ${review.productId}`,
          description: '',
          price: 0,
          images: [],
          category: 'Unknown',
        },
      })));
      
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Failed to fetch your reviews",
        type: "error",
        onConfirm: hideAlert
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMyReviews();
    setRefreshing(false);
  };

  const handleEditReview = (review: Review) => {
    router.push({
      pathname: '/(stacks)/CreateReviewScreen',
      params: {
        productId: review.productId,
        reviewId: review.reviewId,
        existingRating: review.rating.toString(),
        existingContent: review.content,
        isEditing: 'true',
      },
    });
  };

  const handleDeleteReview = (reviewId: string) => {
    setAlertConfig({
      visible: true,
      title: 'Delete Review',
      message: 'Are you sure you want to delete this review? This action cannot be undone.',
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onCancel: hideAlert,
      onConfirm: async () => {
        hideAlert(); // Close confirm modal
        try {
          await reviewService.deleteReview(reviewId);
          await fetchMyReviews();
          
          // Show success alert
          setTimeout(() => {
            setAlertConfig({
              visible: true,
              title: 'Success',
              message: 'Review deleted successfully',
              type: 'success',
              onConfirm: hideAlert
            });
          }, 300);
        } catch (error: any) {
          setTimeout(() => {
            setAlertConfig({
              visible: true,
              title: 'Error',
              message: 'Failed to delete review',
              type: 'error',
              onConfirm: hideAlert
            });
          }, 300);
        }
      },
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={i <= rating ? '#FFD700' : '#E0E0E0'}
        />
      );
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const navigateToProduct = (productId: string) => {
    router.push({
      pathname: '/(stacks)/ProductDetailScreen',
      params: { productId },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>Loading your reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {enrichedReviews.length === 0 && reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${primaryColor}10` }]}>
              <Ionicons name="chatbubble-outline" size={48} color={primaryColor} />
            </View>
            <Text style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text style={styles.emptySubtitle}>
              You haven't written any product reviews yet. Start shopping and share your experience!
            </Text>
          </View>
        ) : (
          <View style={styles.reviewsList}>
            {(enrichedReviews.length > 0 ? enrichedReviews : reviews).map((review) => (
              <View key={review.reviewId} style={styles.reviewCard}>
                <TouchableOpacity
                  style={styles.productHeader}
                  onPress={() => navigateToProduct(review.productId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.productImageContainer}>
                    {review.product?.images?.[0] ? (
                      <Image
                        source={{ uri: review.product.images[0] }}
                        style={styles.productImage}
                        onError={() => console.warn('Failed to load product image')}
                      />
                    ) : (
                      <View style={[styles.productImage, styles.placeholderImage]}>
                        <Ionicons name="image-outline" size={24} color="#999" />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.productInfo}>
                    <Text style={styles.productLabel}>Product Review</Text>
                    <Text style={styles.productName} numberOfLines={2}>
                      {review.product?.name || `Product ${review.productId}`}
                    </Text>
                    {review.product?.price && review.product.price > 0 ? (
                      <Text style={styles.productPrice}>
                        {review.product.price.toLocaleString()} VND
                      </Text>
                    ) : (
                      <Text style={styles.productUnavailable}>
                        {review.product?.name === 'Product Unavailable' ? 'Product removed' : 'Price unavailable'}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

                <View style={styles.reviewContent}>
                  <View style={styles.ratingSection}>
                    <View style={styles.stars}>{renderStars(review.rating)}</View>
                    <Text style={styles.ratingText}>{review.rating}/5</Text>
                  </View>

                  <Text style={styles.reviewText}>{review.content}</Text>

                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewDate}>
                      {formatDate(review.createdAt)}
                    </Text>
                    {review.updatedAt !== review.createdAt && (
                      <Text style={styles.editedLabel}>• Edited</Text>
                    )}
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: `${primaryColor}15` }]}
                    onPress={() => handleEditReview(review)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={18} color={primaryColor} />
                    <Text style={[styles.actionButtonText, { color: primaryColor }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FFE8E8' }]}
                    onPress={() => handleDeleteReview(review.reviewId)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Integrated Custom Alert */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
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
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  reviewsList: {
    padding: 20,
    gap: 16,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  productInfo: {
    flex: 1,
  },
  productLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '700',
    marginBottom: 2,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  productUnavailable: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  reviewContent: {
    marginBottom: 20,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  reviewText: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '400',
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  editedLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});