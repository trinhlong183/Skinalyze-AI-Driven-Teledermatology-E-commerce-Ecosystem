import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from './ProductCard';
import { Product } from '@/services/productService';

const { width: screenWidth } = Dimensions.get('window');

// Union type for carousel items
export type CarouselItem = BannerItem | ProductItem;

export interface BannerItem {
  type: 'banner';
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
}

export interface ProductItem {
  type: 'product';
  id: string;
  product: Product;
  onPress: () => void;
}

interface CarouselProps {
  items: CarouselItem[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showPagination?: boolean;
  itemWidth?: number;
  itemSpacing?: number;
  height?: number;
  loop?: boolean;
}

const Carousel: React.FC<CarouselProps> = ({
  items,
  autoPlay = true,
  autoPlayInterval = 3000,
  showPagination = true,
  itemWidth,
  itemSpacing = 16,
  height = 200,
  loop = true,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if items are products or banners
  const isProductCarousel = items.length > 0 && items[0].type === 'product';
  
  // Calculate item width based on type
  const calculatedItemWidth = itemWidth || (isProductCarousel ? screenWidth * 0.45 : screenWidth - 48);
  const totalItemWidth = calculatedItemWidth + itemSpacing;

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && items.length > 1) {
      startAutoPlay();
      return () => stopAutoPlay();
    }
  }, [autoPlay, items.length, currentIndex]);

  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayTimerRef.current = setInterval(() => {
      scrollToNext();
    }, autoPlayInterval);
  };

  const stopAutoPlay = () => {
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  };

  const scrollToNext = () => {
    if (items.length === 0) return;
    
    const nextIndex = loop 
      ? (currentIndex + 1) % items.length 
      : Math.min(currentIndex + 1, items.length - 1);
    
    scrollToIndex(nextIndex);
  };

  const scrollToIndex = (index: number) => {
    if (scrollViewRef.current && items.length > 0) {
      const offset = isProductCarousel 
        ? index * totalItemWidth 
        : index * (screenWidth - 48 + itemSpacing);
      
      scrollViewRef.current.scrollTo({
        x: offset,
        animated: true,
      });
      setCurrentIndex(index);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / totalItemWidth);
    setCurrentIndex(index);
  };

  const handleMomentumScrollEnd = () => {
    if (autoPlay) {
      startAutoPlay();
    }
  };

  const renderBanner = (item: BannerItem) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.bannerContainer,
        { width: calculatedItemWidth, height, marginRight: itemSpacing }
      ]}
      onPress={item.onPress}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.bannerImage}
        resizeMode="cover"
      />
      {(item.title || item.subtitle) && (
        <View style={styles.bannerOverlay}>
          <View style={styles.bannerTextContainer}>
            {item.title && (
              <Text style={styles.bannerTitle} numberOfLines={2}>
                {item.title}
              </Text>
            )}
            {item.subtitle && (
              <Text style={styles.bannerSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderProduct = (item: ProductItem) => (
    <View
      key={item.id}
      style={[
        styles.productContainer,
        { width: calculatedItemWidth, marginRight: itemSpacing }
      ]}
    >
      <ProductCard
        product={item.product}
        onPress={item.onPress}
      />
    </View>
  );

  const renderItem = (item: CarouselItem) => {
    if (item.type === 'banner') {
      return renderBanner(item as BannerItem);
    } else {
      return renderProduct(item as ProductItem);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={!isProductCarousel}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={stopAutoPlay}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        decelerationRate={isProductCarousel ? "normal" : "fast"}
        snapToInterval={isProductCarousel ? totalItemWidth : undefined}
        snapToAlignment={isProductCarousel ? "start" : "center"}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isProductCarousel ? 24 : 24 }
        ]}
      >
        {items.map(renderItem)}
      </ScrollView>

      {/* Pagination Dots */}
      {showPagination && !isProductCarousel && items.length > 1 && (
        <View style={styles.pagination}>
          {items.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => scrollToIndex(index)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Product Carousel Indicators */}
      {showPagination && isProductCarousel && items.length > 1 && (
        <View style={styles.productIndicators}>
          <Text style={styles.indicatorText}>
            {currentIndex + 1} / {items.length}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    alignItems: 'flex-start',
  },
  bannerContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 16,
  },
  bannerTextContainer: {
    gap: 4,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  productContainer: {
    // Product card has its own styling
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    transition: 'all 0.3s',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#1A1A1A',
  },
  productIndicators: {
    alignItems: 'center',
    marginTop: 12,
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
});

export default Carousel;