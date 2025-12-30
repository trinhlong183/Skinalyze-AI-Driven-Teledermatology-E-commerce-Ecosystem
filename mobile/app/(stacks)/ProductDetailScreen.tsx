import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  StatusBar,
  Animated,
  SafeAreaView
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import productService, { Product } from '@/services/productService';
import reviewService from '@/services/reviewService';
import cartService from '@/services/cartService';
import tokenService from '@/services/tokenService';
import { useCartCount } from '@/hooks/userCartCount';
import { useThemeColor } from '@/contexts/ThemeColorContext';
import ReviewsComponent from '@/components/ReviewsComponent';
import { useTranslation } from 'react-i18next';
import Carousel, { ProductItem } from '@/components/Carousel';
import CustomAlert from '@/components/CustomAlert'; // Import CustomAlert

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [reviewStats, setReviewStats] = useState<{averageRating: number, totalReviews: number} | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const { refreshCount } = useCartCount();

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);

  useEffect(() => {
    if (!isLoading && product) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Fetch similar products after product details are loaded
      fetchSimilarProducts();
    }
  }, [isLoading, product]);

  const fetchProductDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [productData, reviewStatsData] = await Promise.all([
        productService.getProductById(productId!),
        reviewService.getProductReviewStats(productId!).catch(() => ({ averageRating: 0, totalReviews: 0 }))
      ]);
      setProduct(productData);
      setReviewStats(reviewStatsData);
    } catch (err) {
      setError('Failed to load product details');
      console.error('Error fetching product:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSimilarProducts = async () => {
    if (!product || !product.categories || product.categories.length === 0) {
      return;
    }

    try {
      setLoadingSimilar(true);
      // Get the first category of the product
      const categoryId = product.categories[0].categoryId;
      
      // Fetch products from the same category
      const { products } = await productService.getProductsByCategory(categoryId, 1, 10);
      
      // Filter out the current product and limit to 10 items
      const filtered = products
        .filter(p => p.productId !== productId)
        .slice(0, 10);
      
      setSimilarProducts(filtered);
    } catch (error) {
      console.error('Error fetching similar products:', error);
      setSimilarProducts([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleQuantityChange = (increment: boolean) => {
    if (increment && product && quantity < product.stock) {
      setQuantity(quantity + 1);
    } else if (!increment && quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!product || !productId) return;

    try {
      setIsAddingToCart(true);
      const token = await tokenService.getToken();

      if (!token) {
        setAlertConfig({
          type: 'warning',
          title: t('productDetail.authRequired'),
          message: t('productDetail.loginToAddCart'),
          confirmText: t('productDetail.logIn'),
          cancelText: t('productDetail.cancel'),
          onConfirm: () => {
            setAlertVisible(false);
            router.push('/WelcomeScreen' as any);
          },
          onCancel: () => setAlertVisible(false),
        });
        setAlertVisible(true);
        return;
      }

      await cartService.addToCart(token, {
        productId: productId,
        quantity: quantity
      });
      
      await refreshCount();

      setAlertConfig({
        type: 'success',
        title: t('productDetail.addedToCart'),
        message: t('productDetail.itemsAdded', { 
          quantity, 
          item: quantity === 1 ? t('productDetail.item') : t('productDetail.items'), 
          productName: product.productName 
        }),
        confirmText: t('productDetail.viewCart'),
        cancelText: t('productDetail.continueShopping'),
        onConfirm: () => {
          setAlertVisible(false);
          router.push('/(tabs)/CartScreen');
        },
        onCancel: () => setAlertVisible(false),
      });
      setAlertVisible(true);

      setQuantity(1);

    } catch (err: any) {
      console.error('Error adding to cart:', err);
      let errorMessage = 'Failed to add product to cart. Please try again.';

      if (err.message) {
        if (err.message.includes('không có sẵn') || err.message.includes('not available')) {
          errorMessage = t('productDetail.outOfStock');
        } else if (err.message.includes('quantity') || err.message.includes('số lượng')) {
          errorMessage = t('productDetail.quantityNotAvailable');
        } else if (err.message.includes('token') || err.message.includes('auth')) {
          errorMessage = t('productDetail.sessionExpired');
        } else {
          errorMessage = err.message;
        }
      }

      setAlertConfig({
        type: 'error',
        title: t('productDetail.cannotAddToCart'),
        message: errorMessage,
        confirmText: t('productDetail.ok'),
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const getCleanSuitableFor = (data: any): string[] => {
    if (!data) return [];
    
    let items: string[] = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) items = parsed;
        else items = [data];
      } catch (e) {
        items = data.split(',').map(s => s.trim());
      }
    }

    return items.map(item => {
        return item.replace(/[\[\]"]/g, '').trim();
    }).filter(item => item.length > 0);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>{t('productDetail.loading')}</Text>
        </View>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: '#FFE8E8' }]}>
            <Ionicons name="alert-circle" size={56} color="#FF3B30" />
          </View>
          <Text style={styles.errorTitle}>{t('productDetail.oops')}</Text>
          <Text style={styles.errorText}>{error || t('productDetail.productNotFound')}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: primaryColor }]} 
            onPress={fetchProductDetails}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>{t('productDetail.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const discountedPrice = productService.calculateDiscountedPrice(product);
  const discountAmount = productService.getDiscountAmount(product);
  const avgRating = reviewStats?.averageRating || 0;
  const reviewCount = reviewStats?.totalReviews || 0;
  const stockStatus = productService.getStockStatus(product);
  const hasDiscount = parseFloat(product.salePercentage) > 0;

  const suitableForTags = getCleanSuitableFor(product.suitableFor);

  // Prepare carousel items for similar products
  const carouselItems: ProductItem[] = similarProducts.map(similarProduct => ({
    type: 'product' as const,
    id: similarProduct.productId,
    product: similarProduct,
    onPress: () => {
      // Navigate to the product detail screen
      router.push({
        pathname: '/(stacks)/ProductDetailScreen',
        params: { productId: similarProduct.productId }
      });
    }
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Image Gallery */}
        <View style={styles.imageSection}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Image
              source={{ uri: product.productImages[selectedImageIndex] }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          </Animated.View>
          
          {/* Overlay Badges */}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Ionicons name="flash" size={14} color="#FFFFFF" />
              <Text style={styles.discountText}>{product.salePercentage}% OFF</Text>
            </View>
          )}
          
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Stock Badge */}
          <View style={[styles.stockBadgeOverlay, { backgroundColor: stockStatus.color }]}>
            <Ionicons 
              name={product.stock > 10 ? "checkmark-circle" : "alert-circle"} 
              size={14} 
              color="#FFFFFF" 
            />
            <Text style={styles.stockBadgeText}>{stockStatus.status}</Text>
          </View>
        </View>

        {/* Image Thumbnails */}
        {product.productImages.length > 1 && (
          <Animated.View 
            style={[
              styles.thumbnailSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailContainer}
            >
              {product.productImages.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedImageIndex(index)}
                  style={[
                    styles.thumbnail,
                    selectedImageIndex === index && [
                      styles.thumbnailSelected, 
                      { borderColor: primaryColor, backgroundColor: `${primaryColor}15` }
                    ]
                  ]}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: image }} style={styles.thumbnailImage} />
                  {selectedImageIndex === index && (
                    <View style={[styles.thumbnailCheck, { backgroundColor: primaryColor }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Product Info */}
        <Animated.View 
          style={[
            styles.infoSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Brand & Name */}
          <View style={styles.productHeader}>
            <View style={[styles.brandBadge, { backgroundColor: `${primaryColor}10` }]}>
              <Ionicons name="ribbon" size={14} color={primaryColor} />
              <Text style={[styles.brand, { color: primaryColor }]}>{product.brand}</Text>
            </View>
            <Text style={styles.productName}>{product.productName}</Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingCard}>
            <View style={styles.ratingLeft}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= avgRating ? 'star' : (star - 0.5 <= avgRating ? 'star-half' : 'star-outline')}
                    size={18}
                    color="#FFB800"
                  />
                ))}
              </View>
              <Text style={styles.ratingValue}>
                {avgRating > 0 ? avgRating.toFixed(1) : t('productDetail.noReviews')}
              </Text>
            </View>
            <Text style={styles.reviewCount}>
              {reviewCount} {reviewCount === 1 ? t('productDetail.review') : t('productDetail.reviews')}
            </Text>
          </View>

          {/* Price Card */}
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={[styles.currentPrice, { color: primaryColor }]}>
                {productService.formatPrice(discountedPrice)}
              </Text>
              {hasDiscount && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>
                    Save {productService.formatPrice(discountAmount)}
                  </Text>
                </View>
              )}
            </View>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                {productService.formatPrice(product.sellingPrice)}
              </Text>
            )}
            <Text style={styles.stockInfo}>
              <Ionicons name="cube" size={14} color="#666" /> {t('productDetail.unitsAvailable', { stock: product.stock })}
            </Text>
          </View>

          {/* Categories */}
          {product.categories && product.categories.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="grid" size={18} color="#A855F7" />
                </View>
                <Text style={styles.sectionTitle}>{t('productDetail.categories')}</Text>
              </View>
              <View style={styles.tagsContainer}>
                {product.categories.map((category) => (
                  <View key={category.categoryId} style={styles.categoryTag}>
                    <Ionicons name="pricetag" size={14} color="#666" />
                    <Text style={styles.categoryTagText}>{category.categoryName}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#F0F9FF' }]}>
                <Ionicons name="document-text" size={18} color="#2196F3" />
              </View>
              <Text style={styles.sectionTitle}>{t('productDetail.description')}</Text>
            </View>
            <Text style={styles.description}>{product.productDescription}</Text>
          </View>

          {/* Suitable For (Corrected) */}
          {suitableForTags.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="checkmark-done" size={18} color="#34C759" />
                </View>
                <Text style={styles.sectionTitle}>{t('productDetail.suitableFor')}</Text>
              </View>
              <View style={styles.tagsContainer}>
                {suitableForTags.map((item, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: `${primaryColor}12` }]}>
                    <Ionicons name="checkmark-circle" size={14} color={primaryColor} />
                    <Text style={[styles.tagText, { color: primaryColor }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Ingredients */}
          {product.ingredients && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#FFF4E6' }]}>
                  <Ionicons name="flask" size={18} color="#FF9800" />
                </View>
                <Text style={styles.sectionTitle}>{t('productDetail.ingredients')}</Text>
              </View>
              <View style={styles.ingredientsCard}>
                <Text style={styles.ingredients}>{product.ingredients}</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Similar Products Carousel */}
        {similarProducts.length > 0 && (
          <Animated.View 
            style={[
              styles.similarSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: `${primaryColor}15` }]}>
                <Ionicons name="grid" size={18} color={primaryColor} />
              </View>
              <Text style={styles.sectionTitle}>Similar Products</Text>
            </View>
            <Carousel
              items={carouselItems}
              autoPlay={false}
              showPagination={true}
              itemWidth={width * 0.45}
              itemSpacing={16}
              loop={false}
            />
          </Animated.View>
        )}

        {loadingSimilar && (
          <View style={styles.loadingSimilar}>
            <ActivityIndicator size="small" color={primaryColor} />
            <Text style={styles.loadingSimilarText}>Loading similar products...</Text>
          </View>
        )}

        <ReviewsComponent
          productId={productId!}
          primaryColor={primaryColor}
          onWriteReview={(reviewData) => {
            router.push({
              pathname: '/(stacks)/CreateReviewScreen',
              params: { 
                productId: productId!,
                ...(reviewData && {
                  reviewId: reviewData.reviewId,
                  existingRating: reviewData.rating.toString(),
                  existingContent: reviewData.content,
                  isEditing: 'true'
                })
              }
            })
          }}
        />
      </ScrollView>

      {/* Bottom Action Bar */}
      <Animated.View 
        style={[
          styles.bottomBar,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <View style={styles.quantitySection}>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
              onPress={() => handleQuantityChange(false)}
              disabled={quantity <= 1 || isAddingToCart}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={18} color={quantity <= 1 ? '#CCC' : '#1A1A1A'} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.quantityButton, quantity >= product.stock && styles.quantityButtonDisabled]}
              onPress={() => handleQuantityChange(true)}
              disabled={quantity >= product.stock || isAddingToCart}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={quantity >= product.stock ? '#CCC' : '#1A1A1A'} />
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            { backgroundColor: productService.isInStock(product) && !isAddingToCart ? primaryColor : '#CCC' }
          ]}
          onPress={handleAddToCart}
          disabled={!productService.isInStock(product) || isAddingToCart}
          activeOpacity={0.8}
        >
          {isAddingToCart ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.addToCartText}>{t('productDetail.adding')}</Text>
            </>
          ) : (
            <>
              <Ionicons name="cart" size={20} color="#FFFFFF" />
              <Text style={styles.addToCartText}>
                {productService.isInStock(product) ? t('productDetail.addToCart') : t('productDetail.outOfStockBtn')}
              </Text>
              {productService.isInStock(product) && (
                <View style={styles.cartArrow}>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    top: -150,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    top: -80,
    left: -60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 28,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  imageSection: {
    position: 'relative',
    backgroundColor: '#000',
  },
  mainImage: {
    width: width,
    height: width,
  },
  discountBadge: {
    position: 'absolute',
    top: 70,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stockBadgeOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stockBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  thumbnailSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
  },
  thumbnailContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailSelected: {
    // borderColor handled dynamically
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: 24,
  },
  productHeader: {
    marginBottom: 20,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  ratingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  ratingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  reviewCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  savingsBadge: {
    backgroundColor: '#E8F9F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  savingsText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '800',
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 10,
  },
  stockInfo: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#666',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize', // Ensure consistent capitalization
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  categoryTagText: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '700',
  },
  ingredientsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  ingredients: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  quantitySection: {
    flex: 0.4,
  },
  quantityLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: 'transparent',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginHorizontal: 12,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cartArrow: {
    position: 'absolute',
    right: 16,
  },
  similarSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  loadingSimilar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingSimilarText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});