import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Dimensions, 
  StatusBar, 
  Animated,
  SafeAreaView
} from 'react-native'
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import productService, { Product } from '@/services/productService'
import ProductCard from '@/components/ProductCard'
import { useThemeColor } from '@/contexts/ThemeColorContext'
import { useTranslation  } from 'react-i18next'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 60) / 2

// ... (Keep constants: POPULAR_SEARCHES, SKIN_TYPES, SORT_OPTIONS, RECENT_SEARCHES_KEY)
const POPULAR_SEARCHES = [
  'Vitamin C', 'Sunscreen', 'Moisturizer', 'Cleanser', 'Eye Cream', 'Serum',
]

const SKIN_TYPES = [
  { id: 'oily-skin', label: 'Oily' },
  { id: 'normal-skin', label: 'Normal' },
  { id: 'dry-skin', label: 'Dry' },
  { id: 'sensitive-skin', label: 'Sensitive' },
  { id: 'combination-skin', label: 'Combination' },
]

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance', icon: 'star' },
  { id: 'price-low', label: 'Price: Low', icon: 'arrow-up' },
  { id: 'price-high', label: 'Price: High', icon: 'arrow-down' },
  { id: 'rating', label: 'Top Rated', icon: 'trophy' },
  { id: 'newest', label: 'Newest', icon: 'time' },
]

const RECENT_SEARCHES_KEY = '@recent_searches'

// Types
interface SearchFilters {
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  skinType?: string | null
  sortBy: string
}

interface SearchState {
  query: string
  products: Product[]
  filteredProducts: Product[]
  isLoading: boolean
  loadingMore: boolean
  error: string | null
  pagination: { total: number; page: number; limit: number; totalPages: number } | null
}

type SearchMode = 'idle' | 'text' | 'category'

export default function SearchScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { categoryId, categoryName } = params
  const { primaryColor } = useThemeColor()
  const { t } = useTranslation();

  // Search State
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    products: [],
    filteredProducts: [],
    isLoading: false,
    loadingMore: false,
    error: null,
    pagination: null,
  })

  // Filter State
  const [filters, setFilters] = useState<SearchFilters>({
    minPrice: undefined,
    maxPrice: undefined,
    inStock: false,
    skinType: null,
    sortBy: 'relevance',
  })

  const [showFilters, setShowFilters] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [searchMode, setSearchMode] = useState<SearchMode>('idle')

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  // Determine if we're in category mode
  const isCategoryMode = useMemo(() => 
    Boolean(categoryId && typeof categoryId === 'string'), 
    [categoryId]
  )

  // Initialize
  useEffect(() => {
    initializeScreen()
  }, [])

  // FIX: Handle category navigation more robustly
  useEffect(() => {
    if (isCategoryMode && categoryId) {
      const name = typeof categoryName === 'string' ? categoryName : '';
      // Reset state first to clear any previous search results
      setSearchState(prev => ({
         ...prev,
         query: name,
         products: [],
         filteredProducts: [],
         isLoading: true, // Show loading immediately
         error: null
      }));
      setSearchMode('category');
      
      // Fetch
      handleCategoryLoad(categoryId as string);
    }
  }, [categoryId, isCategoryMode]); // Depend on categoryId changes

  // Apply filters when products or filters change
  useEffect(() => {
    // Only apply filters if we have products OR we finished loading (to show empty state correctly)
    if (searchState.products.length > 0 || !searchState.isLoading) {
      applyFiltersAndSort()
    }
  }, [searchState.products, filters, searchState.isLoading])

  // ============= Initialization =============
  const initializeScreen = async () => {
    await loadRecentSearches()
    startAnimations()
  }

  const startAnimations = () => {
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
  }

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setRecentSearches(Array.isArray(parsed) ? parsed : [])
      }
    } catch (err) {
      console.error('Failed to load recent searches:', err)
    }
  }

  const saveRecentSearch = async (query: string) => {
    try {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
      setRecentSearches(updated)
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to save recent search:', err)
    }
  }

  // ============= Search Logic =============
  const handleCategoryLoad = async (id: string) => {
    try {
      // Call the service
      const result = await productService.getProductsByCategory(id, 1, 50);
      
      setSearchState(prev => ({
        ...prev,
        products: result.products,
        filteredProducts: result.products, // Initialize filtered with all
        pagination: result.pagination,
        isLoading: false,
        error: result.products.length === 0 ? 'No products found in this category' : null
      }));
    } catch (err) {
      setSearchState(prev => ({
        ...prev,
        error: 'Failed to load category products',
        isLoading: false,
      }));
      console.error('Category load error:', err);
    }
  };

  const performTextSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) return

    const isNewSearch = page === 1
    setSearchMode('text')
    
    setSearchState(prev => ({
      ...prev,
      query,
      isLoading: isNewSearch,
      loadingMore: !isNewSearch,
      error: null,
    }))

    try {
      const serverFilters = {
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        inStock: filters.inStock,
      }

      const result = await productService.searchProducts(query.trim(), serverFilters, page, 50)
      
      setSearchState(prev => ({
        ...prev,
        products: isNewSearch ? result.products : [...prev.products, ...result.products],
        pagination: result.pagination,
        isLoading: false,
        loadingMore: false,
      }))

      if (isNewSearch) {
        await saveRecentSearch(query.trim())
      }
    } catch (err) {
      setSearchState(prev => ({
        ...prev,
        error: 'Failed to search products',
        isLoading: false,
        loadingMore: false,
      }))
      console.error('Search error:', err)
    }
  }

  const handleSearchSubmit = () => {
    if (!searchState.query.trim()) return
    performTextSearch(searchState.query, 1)
  }

  const handleQuickSearch = (query: string) => {
    setSearchState(prev => ({ ...prev, query }))
    performTextSearch(query, 1)
  }

  const loadMoreProducts = () => {
    const { loadingMore, pagination } = searchState
    
    if (loadingMore || !pagination || pagination.page >= pagination.totalPages) {
      return
    }

    const nextPage = pagination.page + 1

    if (isCategoryMode) {
      loadMoreCategoryProducts(nextPage)
    } else {
      performTextSearch(searchState.query, nextPage)
    }
  }

  const loadMoreCategoryProducts = async (page: number) => {
    setSearchState(prev => ({ ...prev, loadingMore: true }))

    try {
      const result = await productService.getProductsByCategory(
        categoryId as string, 
        page, 
        50
      )
      
      setSearchState(prev => ({
        ...prev,
        products: [...prev.products, ...result.products],
        filteredProducts: [...prev.filteredProducts, ...result.products], // Append to filtered too
        pagination: result.pagination,
        loadingMore: false,
      }))
    } catch (err) {
      setSearchState(prev => ({ ...prev, loadingMore: false }))
      console.error('Load more error:', err)
    }
  }

  // ============= Filtering & Sorting =============
  const applyFiltersAndSort = useCallback(() => {
    // If no products loaded yet, do nothing
    if (searchState.products.length === 0) return;

    let results = [...searchState.products]

    // Apply skin type filter (client-side)
    if (filters.skinType) {
      results = results.filter(product =>
        product.suitableFor?.includes(filters.skinType as string)
      )
    }

    // Apply price filter (client-side fallback)
    if (filters.minPrice !== undefined) {
      results = results.filter(p => productService.calculateDiscountedPrice(p) >= filters.minPrice!)
    }
    if (filters.maxPrice !== undefined) {
      results = results.filter(p => productService.calculateDiscountedPrice(p) <= filters.maxPrice!)
    }
    
    // Apply in stock
    if (filters.inStock) {
      results = results.filter(p => productService.isInStock(p))
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'price-low':
        results.sort((a, b) => {
          const priceA = productService.calculateDiscountedPrice(a)
          const priceB = productService.calculateDiscountedPrice(b)
          return priceA - priceB
        })
        break
      case 'price-high':
        results.sort((a, b) => {
          const priceA = productService.calculateDiscountedPrice(a)
          const priceB = productService.calculateDiscountedPrice(b)
          return priceB - priceA
        })
        break
      case 'rating':
        results.sort((a, b) => {
          const ratingA = productService.calculateAverageRating(a)
          const ratingB = productService.calculateAverageRating(b)
          return ratingB - ratingA
        })
        break
      case 'newest':
        results.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        break
    }

    setSearchState(prev => ({ ...prev, filteredProducts: results }))
  }, [searchState.products, filters])

  const updateFilter = <K extends keyof SearchFilters>(
    key: K, 
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({
      minPrice: undefined,
      maxPrice: undefined,
      inStock: false,
      skinType: null,
      sortBy: 'relevance',
    })
  }

  const clearSearch = () => {
    setSearchState({
      query: '',
      products: [],
      filteredProducts: [],
      isLoading: false,
      loadingMore: false,
      error: null,
      pagination: null,
    })
    setSearchMode('idle')
    resetFilters()
    
    // If in category mode, reload the category
    if (isCategoryMode && categoryId) {
      handleCategoryLoad(categoryId as string);
    }
  }

  // ============= Render Functions =============
  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchInputWrapper}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={isCategoryMode ? `Search in ${categoryName}...` : t('search.placeholder')}
          placeholderTextColor="#999"
          value={searchState.query}
          onChangeText={(text) => setSearchState(prev => ({ ...prev, query: text }))}
          autoFocus={!isCategoryMode}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
        />
        {searchState.query.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity 
        style={[
          styles.filterButton,
          showFilters && { backgroundColor: `${primaryColor}15` }
        ]}
        onPress={() => setShowFilters(!showFilters)}
        activeOpacity={0.7}
      >
        <Ionicons name="options" size={20} color={primaryColor} />
      </TouchableOpacity>
    </View>
  )

  const renderFilters = () => (
    <Animated.View 
      style={[
        styles.filtersContainer,
        { opacity: fadeAnim }
      ]}
    >
      {/* Skin Type Filter */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <View style={[styles.filterIconWrapper, { backgroundColor: '#F0F9FF' }]}>
            <Ionicons name="water" size={16} color="#2196F3" />
          </View>
          <Text style={styles.filterTitle}>{t('search.skinType')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              !filters.skinType && [styles.filterChipActive, { backgroundColor: primaryColor }]
            ]}
            onPress={() => updateFilter('skinType', null)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterChipText,
              !filters.skinType && styles.filterChipTextActive
            ]}>{t('search.allTypes')}</Text>
          </TouchableOpacity>
          {SKIN_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.filterChip,
                filters.skinType === type.id && [styles.filterChipActive, { backgroundColor: primaryColor }]
              ]}
              onPress={() => updateFilter('skinType', type.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterChipText,
                filters.skinType === type.id && styles.filterChipTextActive
              ]}>{t('search.' + type.id)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Price Range Filter */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <View style={[styles.filterIconWrapper, { backgroundColor: '#FFF4E6' }]}>
            <Ionicons name="cash" size={16} color="#FF9800" />
          </View>
          <Text style={styles.filterTitle}>{t('search.priceRange')}</Text>
        </View>
        <View style={styles.priceInputs}>
          <TextInput
            style={styles.priceInput}
            placeholder="Min Price"
            keyboardType="numeric"
            value={filters.minPrice?.toString() || ''}
            onChangeText={(text) => updateFilter('minPrice', text ? parseFloat(text) : undefined)}
          />
          <Text style={styles.priceSeparator}>-</Text>
          <TextInput
            style={styles.priceInput}
            placeholder="Max Price"
            keyboardType="numeric"
            value={filters.maxPrice?.toString() || ''}
            onChangeText={(text) => updateFilter('maxPrice', text ? parseFloat(text) : undefined)}
          />
        </View>
      </View>

      {/* In Stock Filter */}
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={styles.inStockToggle}
          onPress={() => updateFilter('inStock', !filters.inStock)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, filters.inStock && [styles.checkboxChecked, { backgroundColor: primaryColor }]]}>
            {filters.inStock && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>
          <Text style={styles.inStockText}>{t('search.inStockOnly')}</Text>
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <View style={[styles.filterIconWrapper, { backgroundColor: '#FFF4E6' }]}>
            <Ionicons name="swap-vertical" size={16} color="#FF9800" />
          </View>
          <Text style={styles.filterTitle}>{t('search.sortBy')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {SORT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.filterChip,
                filters.sortBy === option.id && [styles.filterChipActive, { backgroundColor: primaryColor }]
              ]}
              onPress={() => updateFilter('sortBy', option.id)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={option.icon as any} 
                size={14} 
                color={filters.sortBy === option.id ? '#FFFFFF' : '#666'} 
              />
              <Text style={[
                styles.filterChipText,
                filters.sortBy === option.id && styles.filterChipTextActive
              ]}>{t('search.' + option.id)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Animated.View>
  )

  const renderEmptyState = () => {
    if (searchMode === 'idle' && !isCategoryMode) {
      return (
        <Animated.View 
          style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={[styles.emptyIcon, { backgroundColor: `${primaryColor}10` }]}>
            <Ionicons name="search" size={56} color={primaryColor} />
          </View>
          <Text style={styles.emptyTitle}>{t('search.searchProducts')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('search.findPerfect')}
          </Text>

          {/* Popular Searches */}
          <View style={styles.suggestionsSection}>
            <View style={styles.suggestionHeader}>
              <View style={[styles.suggestionIconWrapper, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="trending-up" size={16} color="#34C759" />
              </View>
              <Text style={styles.suggestionsTitle}>{t('search.popularSearches')}</Text>
            </View>
            <View style={styles.suggestionsGrid}>
              {POPULAR_SEARCHES.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionCard}
                  onPress={() => handleQuickSearch(search)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="search" size={16} color={primaryColor} />
                  <Text style={styles.suggestionText}>{search}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#999" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.suggestionsSection}>
              <View style={styles.suggestionHeader}>
                <View style={[styles.suggestionIconWrapper, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="time" size={16} color="#A855F7" />
                </View>
                <Text style={styles.suggestionsTitle}>{t('search.recentSearches')}</Text>
              </View>
              <View style={styles.recentSearches}>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentSearchCard}
                    onPress={() => handleQuickSearch(search)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentSearchLeft}>
                      <View style={[styles.recentSearchIcon, { backgroundColor: `${primaryColor}10` }]}>
                        <Ionicons name="time-outline" size={18} color={primaryColor} />
                      </View>
                      <Text style={styles.recentSearchText}>{search}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#999" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      )
    }

    if (searchState.filteredProducts.length === 0 && !searchState.isLoading) {
      return (
        <Animated.View 
          style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={[styles.emptyIcon, { backgroundColor: '#FFE8E8' }]}>
            <Ionicons name="sad-outline" size={56} color="#FF3B30" />
          </View>
          <Text style={styles.emptyTitle}>{t('search.noProductsFound')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('search.tryAdjusting')}
          </Text>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: primaryColor }]} 
            onPress={clearSearch}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>{t('search.clearFilters')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )
    }

    return null
  }

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCardWrapper}>
      <ProductCard
        product={item}
        onPress={() => router.push({
          pathname: '/(stacks)/ProductDetailScreen',
          params: { productId: item.productId }
        })}
      />
    </View>
  )

  const renderResults = () => {
    const hasActiveFilters = filters.skinType || filters.sortBy !== 'relevance' || filters.minPrice || filters.maxPrice || filters.inStock
    const totalCount = searchState.filteredProducts.length

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <View style={styles.resultsLeft}>
            <View style={[styles.resultsIcon, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="checkmark-circle" size={18} color={primaryColor} />
            </View>
            <Text style={styles.resultsText}>
              {totalCount} {totalCount === 1 ? t('search.product') : t('search.products')}
            </Text>
          </View>
          {hasActiveFilters && (
            <TouchableOpacity 
              onPress={resetFilters}
              activeOpacity={0.7}
            >
              <Text style={[styles.clearFiltersLink, { color: primaryColor }]}>{t('search.reset')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={searchState.filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={item => item.productId}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            searchState.loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={primaryColor} />
                <Text style={styles.loadingMoreText}>{t('search.loadingMore')}</Text>
              </View>
            ) : null
          }
        />
      </View>
    )
  }

  // ============= Main Render =============
  if (searchState.isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
          <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          {renderSearchBar()}
        </View>

        <View style={styles.loadingContainer}>
          <View style={[styles.loadingIcon, { backgroundColor: `${primaryColor}15` }]}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
          <Text style={styles.loadingText}>{t('search.searchingProducts')}</Text>
        </View>
      </View>
    )
  }

  if (searchState.error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
          <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          {renderSearchBar()}
        </View>

        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: '#FFE8E8' }]}>
            <Ionicons name="alert-circle" size={56} color="#FF3B30" />
          </View>
          <Text style={styles.errorTitle}>{t('search.oops')}</Text>
          <Text style={styles.errorText}>{searchState.error}</Text>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: primaryColor }]} 
            onPress={handleSearchSubmit}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>{t('search.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      <View style={styles.backgroundPattern}>
        <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
        <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        {renderSearchBar()}
      </View>

      {showFilters && renderFilters()}

      {searchState.filteredProducts.length > 0 ? (
        renderResults()
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderEmptyState()}
        </ScrollView>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  filterSection: {
    marginTop: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
    gap: 8,
  },
  filterIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  chipScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    gap: 6,
  },
  filterChipActive: {
    // Background color set dynamically
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  priceInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1A1A1A',
  },
  priceSeparator: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
  },
  inStockToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: 'transparent',
  },
  inStockText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  resultsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  clearFiltersLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-between',
  },
  productCardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  suggestionsSection: {
    width: '100%',
    marginBottom: 32,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  suggestionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  recentSearches: {
    gap: 12,
  },
  recentSearchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recentSearchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentSearchIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentSearchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  scrollContent: {
    paddingBottom: 40,
  }
})