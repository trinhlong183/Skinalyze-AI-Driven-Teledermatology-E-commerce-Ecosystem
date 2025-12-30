import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  StatusBar,
  Animated,
  Dimensions,
  FlatList,
  Image 
} from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useProducts } from '@/hooks/useProducts'
import { Ionicons } from '@expo/vector-icons'
import ProductCard from '@/components/ProductCard'
import { useThemeColor } from '@/contexts/ThemeColorContext'
import { useAuth } from '@/hooks/useAuth'
import ToTopButton from '@/components/ToTopButton' 
import { productService, Product } from '@/services/productService'
import { useTranslation } from 'react-i18next';
import skinAnalysisService from '@/services/skinAnalysisService';
import tokenService from '@/services/tokenService';
import userService from '@/services/userService';
import AllergyUpdateModal from '@/components/AllergyUpdateModal'; // ✅ Import Modal

const { width } = Dimensions.get('window')

export default function HomeScreen() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const { primaryColor } = useThemeColor()
  const { 
    categories, 
    saleProducts, 
    isLoading: isLoadingCategories, 
    error: categoriesError, 
    refreshProducts: refreshCategories,
    setUserSkinConditions,
    getProductsSortedBySkinConditions 
  } = useProducts()
  const { t } = useTranslation();
  
  // New state for paginated products
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showToTop, setShowToTop] = useState(false)
  const [userSkinTypes, setUserSkinTypes] = useState<string[]>([])
  
  // ✅ State for Allergy Modal
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const hasCheckedAllergies = useRef(false); // Track if we've already checked

  const PRODUCTS_PER_PAGE = 50
  const flatListRef = useRef<FlatList>(null)

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    // Start animations immediately on mount
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
    ]).start()
  }, [])

  // ✅ Check Allergies on Load (only once per session)
  useEffect(() => {
    if (user && !hasCheckedAllergies.current) {
      // Check if allergies array is missing or empty
      const hasAllergiesSet = user.allergies && Array.isArray(user.allergies) && user.allergies.length > 0;

      if (!hasAllergiesSet) {
         // Delay popup slightly for better UX
         const timer = setTimeout(() => {
            setShowAllergyModal(true);
            hasCheckedAllergies.current = true; // Mark as checked
         }, 1500);
         return () => clearTimeout(timer);
      } else {
        hasCheckedAllergies.current = true; // Mark as checked even if they have allergies
      }
    }
  }, [user]);

  // Fetch latest skin analysis to get user's skin conditions
  useEffect(() => {
    if (user?.userId) {
      fetchLatestSkinAnalysis();
    }
  }, [user?.userId]);

  const fetchLatestSkinAnalysis = async () => {
    if (!user?.userId) return;
    
    try {
      const token = await tokenService.getToken();
      if (!token) return;

      const customerData = await userService.getCustomerByUserId(user.userId, token);
      const analyses = await skinAnalysisService.getUserAnalyses(customerData.customerId);
      
      if (analyses.length > 0) {
        // Sort by date to get the latest one
        const sortedAnalyses = analyses.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        const latestAnalysis = sortedAnalyses[0];
        
        if (latestAnalysis.aiDetectedCondition) {
          // Parse the skin conditions (e.g., "oily, sensitive" -> ['oily', 'sensitive'])
          const conditions = latestAnalysis.aiDetectedCondition
            .split(',')
            .map(c => c.trim().toLowerCase())
            .filter(c => c.length > 0);
          
          setUserSkinTypes(conditions);
          setUserSkinConditions(conditions);
          console.log('🔍 User skin conditions loaded:', conditions);
        }
      }
    } catch (error) {
      console.error('Error fetching skin analysis:', error);
    }
  };

  // Load initial products
  useEffect(() => {
    loadProducts(1)
  }, [])

  const loadProducts = async (page: number) => {
    try {
      if (page === 1) setIsLoadingProducts(true)
      else setLoadingMore(true)
      
      const result = await productService.getProductsPaginated(page, PRODUCTS_PER_PAGE)
      
      // Sort products based on user's skin conditions
      let sortedProducts = result.products;
      if (userSkinTypes.length > 0) {
        sortedProducts = sortProductsBySkinConditions(result.products, userSkinTypes);
      }
      
      setProducts(prev => page === 1 ? sortedProducts : [...prev, ...sortedProducts])
      setPagination(result.pagination)
      setError(null)
    } catch (err) {
      setError('Failed to load products')
    } finally {
      setIsLoadingProducts(false)
      setLoadingMore(false)
    }
  }

  /**
   * Sort products by relevance to user's skin conditions
   */
  const sortProductsBySkinConditions = (productList: Product[], conditions: string[]): Product[] => {
    if (!conditions.length) return productList;

    return [...productList].sort((a, b) => {
      const scoreA = calculateSkinMatchScore(a, conditions);
      const scoreB = calculateSkinMatchScore(b, conditions);
      
      // Sort by match score (descending)
      if (scoreB !== scoreA) return scoreB - scoreA;
      
      // Secondary sort by rating
      const ratingA = productService.calculateAverageRating(a);
      const ratingB = productService.calculateAverageRating(b);
      return ratingB - ratingA;
    });
  };

  /**
   * Calculate match score between product and skin conditions
   */
  const calculateSkinMatchScore = (product: Product, conditions: string[]): number => {
    if (!product.suitableFor || !conditions.length) return 0;

    const normalizedConditions = conditions.map(c => c.toLowerCase().trim());
    
    // Handle suitableFor as array or string
    let suitableForArray: string[] = [];
    if (Array.isArray(product.suitableFor)) {
      suitableForArray = product.suitableFor;
    } else if (typeof product.suitableFor === 'string') {
      try {
        suitableForArray = JSON.parse(product.suitableFor as any);
      } catch {
        suitableForArray = (product.suitableFor as any).split(',');
      }
    }

    const normalizedSuitableFor = suitableForArray.map(s => 
      s.toLowerCase().trim().replace(/[\[\]"]/g, '')
    );

    return normalizedConditions.reduce((score, condition) => {
      if (normalizedSuitableFor.some(suitable => 
        suitable.includes(condition) || condition.includes(suitable)
      )) {
        return score + 1;
      }
      return score;
    }, 0);
  };

  // Re-sort products when skin types are loaded
  useEffect(() => {
    if (userSkinTypes.length > 0 && products.length > 0) {
      const sortedProducts = sortProductsBySkinConditions(products, userSkinTypes);
      setProducts(sortedProducts);
    }
  }, [userSkinTypes]);

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchLatestSkinAnalysis()
    await loadProducts(1)
    await refreshCategories()
    setRefreshing(false)
  }

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y
    setShowToTop(offsetY > 200)
  }

  const loadMoreProducts = () => {
    if (loadingMore || !pagination || pagination.page >= pagination.totalPages) return
    loadProducts(pagination.page + 1)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('home.goodMorning')
    if (hour < 18) return t('home.goodAfternoon')
    return t('home.goodEvening')
  }

  // --- Render Components ---

  const renderHeader = () => (
    <Animated.View 
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }}
    >
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.greetingBadge, { backgroundColor: `${primaryColor}15` }]}>
            <Ionicons name="sunny" size={20} color={primaryColor} />
          </View>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.fullName || t('home.guest')}</Text>  
          </View>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => router.push('/(stacks)/ProfileScreen')}
          activeOpacity={0.7}
        >
          {user?.photoUrl ? (
            <Image 
              source={{ uri: user.photoUrl }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileAvatar, { backgroundColor: primaryColor }]}>
              <Text style={styles.profileInitial}>
                {user?.fullName?.charAt(0).toUpperCase() || 'G'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionCard}
          onPress={() => router.push('/(tabs)/AnalyzeScreen')}
          activeOpacity={0.7}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="camera" size={24} color={primaryColor} />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>{t('home.analyze')}</Text>  
            <Text style={styles.quickActionSubtitle}>
              {t('home.scanSkin')}  
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionCard}
          onPress={() => router.push('/(stacks)/OrderListScreen')}
          activeOpacity={0.7}
        >
          <View style={styles.quickActionIcon }>
            <Ionicons name="receipt" size={24} color={primaryColor} />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>{t('home.orders')}</Text>  
            <Text style={styles.quickActionSubtitle}>
              {t('home.trackOrders')}  
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Featured Sale Products */}
      {saleProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrapper}>
              <View style={[styles.sectionIcon, { backgroundColor: '#FFE8E8' }]}>
                <Ionicons name="flame" size={18} color="#FF3B30" />
              </View>
              <Text style={styles.sectionTitle}>{t('home.hotDeals')}</Text>  
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={[styles.seeAllText, { color: primaryColor }]}>{t('home.seeAll')}</Text>  
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {saleProducts.slice(0, 5).map((product) => (
              <View key={product.productId} style={styles.horizontalCardWrapper}>
                <ProductCard
                  product={product}
                  onPress={() => router.push({
                    pathname: '/(stacks)/ProductDetailScreen',
                    params: { productId: product.productId }
                  })}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrapper}>
            <View style={[styles.sectionIcon, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="grid" size={18} color={primaryColor} />
            </View>
            <Text style={styles.sectionTitle}>{t('home.categories')}</Text>  
          </View>
        </View>
        
        {isLoadingCategories ? (
          <View style={styles.loadingContainer}>
            <View style={[styles.loadingIcon, { backgroundColor: `${primaryColor}15` }]}>
              <ActivityIndicator size="small" color={primaryColor} />
            </View>
            <Text style={styles.loadingText}>{t('home.loadingCategories')}</Text>  
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {categories.map((category, index) => {
              const colors = [
                { bg: '#F0F9FF', icon: '#2196F3' },
                { bg: '#F0FDF4', icon: '#34C759' },
                { bg: '#FFF4E6', icon: '#FF9800' },
                { bg: '#F3E8FF', icon: '#A855F7' },
                { bg: '#FFE8E8', icon: '#FF3B30' },
              ]
              const colorSet = colors[index % colors.length]
              
              return (
                <TouchableOpacity
                  key={category.categoryId}
                  style={styles.categoryCard}
                  activeOpacity={0.7}
                  onPress={() => router.push({
                    pathname: '/(stacks)/SearchScreen',
                    params: { 
                      categoryId: category.categoryId,
                      categoryName: category.categoryName
                    }
                  })}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: colorSet.bg }]}>
                    <Ionicons name="layers" size={28} color={colorSet.icon} />
                  </View>
                  <Text style={styles.categoryName} numberOfLines={2}>
                    {category.categoryName}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}
      </View>

      {/* All Products Title (Part of Header) */}
      <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
        <View style={styles.sectionTitleWrapper}>
          <View style={[styles.sectionIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="sparkles" size={18} color="#34C759" />
          </View>
          <Text style={styles.sectionTitle}>{t('home.allProducts')}</Text>  
        </View>
        <View style={styles.productCount}>
          <Text style={styles.productCountText}>{pagination?.total || 0}</Text>
        </View>
      </View>
    </Animated.View>
  )

  // Error State
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
          <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
        </View>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: '#FFE8E8' }]}>
            <Ionicons name="alert-circle" size={56} color="#FF3B30" />
          </View>
          <Text style={styles.errorTitle}>{t('home.oops')}</Text>  
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: primaryColor }]} 
            onPress={() => loadProducts(1)}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>{t('home.tryAgain')}</Text>  
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      {/* Decorative Background */}
      <View style={styles.backgroundPattern}>
        <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
        <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
      </View>

      <FlatList
        ref={flatListRef}
        data={products}
        keyExtractor={(item, index) => `${item.productId}-${index}`}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <View style={styles.gridCardWrapper}>
            <ProductCard
              product={item}
              onPress={() => router.push({
                pathname: '/(stacks)/ProductDetailScreen',
                params: { productId: item.productId }
              })}
            />
          </View>
        )}
        // Grid Layout Props
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.flatListContent}
        
        // Optimization & Events
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[primaryColor]}
          />
        }
        ListEmptyComponent={
          isLoadingProducts ? (
            <View style={styles.loadingContainer}>
              <View style={[styles.loadingIcon, { backgroundColor: `${primaryColor}15` }]}>
                <ActivityIndicator size="large" color={primaryColor} />
              </View>
              <Text style={styles.loadingText}>{t('home.loadingProducts')}</Text>  
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={primaryColor} />
              <Text style={styles.loadingMoreText}>{t('home.loadingMoreProducts')}</Text>  
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />

      <ToTopButton
        visible={showToTop}
        onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
      />

      {/* ✅ Modal to update Allergies */}
      <AllergyUpdateModal
        visible={showAllergyModal}
        onClose={() => setShowAllergyModal(false)}
        onSuccess={() => setShowAllergyModal(false)}
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
    zIndex: -1, // Ensure background stays behind
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
  // FlatList Styles
  flatListContent: {
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 12, // Gap between rows
  },
  gridCardWrapper: {
    width: (width - 48 - 12) / 2, // (Screen Width - Outer Padding - Gap) / 2
  },
  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greetingBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  profileButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
  },
  productCount: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  productCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  horizontalScroll: {
    paddingLeft: 24,
    paddingRight: 12,
  },
  horizontalCardWrapper: {
    width: 160,
    marginRight: 12,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 20,
    width: 80,
  },
  categoryIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingMore: {
    padding: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});