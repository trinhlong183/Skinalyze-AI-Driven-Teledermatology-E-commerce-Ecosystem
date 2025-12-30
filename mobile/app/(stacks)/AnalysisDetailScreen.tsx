import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  StatusBar, 
  Animated,
  ActivityIndicator
} from 'react-native';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/contexts/ThemeColorContext';
import { useTranslation } from 'react-i18next';
import Carousel, { ProductItem } from '@/components/Carousel';
import { productService, Product } from '@/services/productService';

const { width } = Dimensions.get('window');

// --- INTERFACES ---

// Định nghĩa cấu trúc item trong mảng aiRecommendedProducts
interface RecommendedProductRef {
  productId: string;
  reason: string;
}

// Cập nhật cấu trúc kết quả phân tích
interface SkinAnalysisResult {
  analysisId: string;
  customerId: string;
  source: "AI_SCAN" | "MANUAL";
  chiefComplaint: string | null;
  patientSymptoms: string | null;
  imageUrls: string[];
  notes: string | null;
  aiDetectedDisease: string | null;
  aiDetectedCondition: string | null;
  // Hỗ trợ cả format mới (object) và cũ (string) để tránh lỗi runtime
  aiRecommendedProducts: (RecommendedProductRef | string)[] | null; 
  mask: string | string[] | null;
  confidence?: number;
  allPredictions?: { [key: string]: number };
  createdAt: string;
  updatedAt: string;
}

// Mở rộng Product để chứa reason cho UI
interface ProductWithReason extends Product {
  aiReason?: string;
}

export default function AnalysisDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();
  
  const [showMask, setShowMask] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<ProductWithReason[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
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
    ]).start();
  }, []);

  // --- DATA PARSING ---
  const result: SkinAnalysisResult = params.result
    ? JSON.parse(params.result as string)
    : null;

  // Key để trigger useEffect khi danh sách sản phẩm thay đổi
  const productIdsKey = useMemo(() => {
    if (!result?.aiRecommendedProducts || result.aiRecommendedProducts.length === 0) {
      return '';
    }
    // Xử lý logic lấy ID từ object hoặc string
    return result.aiRecommendedProducts.map(item => 
      typeof item === 'object' ? item.productId : item
    ).join(',');
  }, [result?.aiRecommendedProducts]);

  // --- FETCH PRODUCTS LOGIC ---
  useEffect(() => {
    if (!productIdsKey) {
      setRecommendedProducts([]);
      return;
    }

    const fetchRecommendedProducts = async () => {
      try {
        setLoadingProducts(true);
        const recommendations = result.aiRecommendedProducts || [];
        
        const productPromises = recommendations.map(async (item) => {
          try {
            // Xác định ID và Reason dựa trên kiểu dữ liệu (mới/cũ)
            const productId = typeof item === 'object' ? item.productId : item;
            const reason = typeof item === 'object' ? item.reason : undefined;

            // Gọi API lấy thông tin chi tiết sản phẩm
            const product = await productService.getProductById(productId);
            
            if (product) {
              // Gộp reason vào object product
              return { ...product, aiReason: reason } as ProductWithReason;
            }
            return null;
          } catch (error) {
            console.error(`Failed to fetch product:`, error);
            return null;
          }
        });

        const fetchedProducts = await Promise.all(productPromises);
        const validProducts = fetchedProducts.filter((p): p is ProductWithReason => p !== null);
        
        setRecommendedProducts(validProducts);
      } catch (error) {
        console.error('Error fetching recommended products:', error);
        setRecommendedProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchRecommendedProducts();
  }, [productIdsKey]);

  // --- RENDER GUARDS ---
  if (!result) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('analysis.noData')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.errorButton, { backgroundColor: primaryColor }]}>
             <Text style={styles.errorButtonText}>{t('analysis.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- UI LOGIC ---
  const isManual = result.source === 'MANUAL';
  
  // Image URL
  const imageUrl = result.imageUrls && result.imageUrls.length > 0 
    ? result.imageUrls[0] 
    : null;

  // Mask URL
  let maskUrl: string | null = null;
  if (!isManual && result.mask) {
    if (Array.isArray(result.mask) && result.mask.length > 0) {
      maskUrl = result.mask[0];
    } else if (typeof result.mask === 'string') {
      maskUrl = result.mask;
    }
  }

  const confidence = result.confidence;

  const normalizeKey = (key: string | null) => {
    if (!key) return '';
    return key
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('_');
  };

  let displayTitle = '';
  let displayType = '';
  let displayDescription = '';
  let themeColor = primaryColor;
  let iconName: any = 'scan';

  if (isManual) {
    displayTitle = result.chiefComplaint || t('analysis.manualRecord');
    displayType = t('analysis.manual');
    themeColor = '#6D28D9'; 
    iconName = 'create';
    const symptoms = result.patientSymptoms ? `${t('analysis.symptoms')}: ${result.patientSymptoms}` : '';
    const notes = result.notes ? `${t('analysis.notes')}: ${result.notes}` : '';
    displayDescription = [symptoms, notes].filter(Boolean).join('\n\n') || t('analysis.noDetails');
  } else {
    const normalizedDisease = normalizeKey(result.aiDetectedDisease);
    displayTitle = t('analysis.' + normalizedDisease);
    displayType = t('analysis.diseaseDetection');
    themeColor = '#E91E63'; 
    iconName = 'search';
    displayDescription = t('analysis.' + normalizedDisease + '_desc');
  }

  const handleAskAI = () => {
    const analysisText = `
Role: Bạn là một Chuyên gia Tư vấn Chăm sóc da (Skincare Consultant) thân thiện và chuyên nghiệp.

Context: Người dùng vừa nhận được kết quả phân tích da là: "${displayTitle}".

Task:
1. Giải thích ngắn gọn về tình trạng "${displayTitle}" dưới góc độ thẩm mỹ (ví dụ: biểu hiện trên da thế nào, nguyên nhân cơ bản). Tránh dùng thuật ngữ y khoa quá chuyên sâu.
2. Đề xuất quy trình chăm sóc da (skincare routine) hoặc các thành phần mỹ phẩm (ingredients) giúp LÀM DỊU và CẢI THIỆN VẺ NGOÀI của da.
3. Gợi ý cụ thể các sản phẩm phù hợp có trong cơ sở dữ liệu của bạn.

Safety Constraints (Quan trọng):
- Tuyệt đối KHÔNG đưa ra lời khuyên y tế, chẩn đoán hay kê đơn thuốc.
- Luôn nhấn mạnh rằng đây chỉ là gợi ý tham khảo để chăm sóc da tại nhà.
- Nếu tình trạng nghiêm trọng, hãy khuyên người dùng gặp bác sĩ da liễu.
- Sử dụng ngôn ngữ mang tính "hỗ trợ", "làm dịu", "chăm sóc" thay vì "điều trị", "chữa khỏi".

Hãy trả lời bằng tiếng Việt, ngắn gọn, súc tích và trình bày đẹp mắt.
    `.trim();

    const navParams: any = {
      prefillText: analysisText
    };
    
    if (imageUrl) {
      navParams.prefillImage = imageUrl;
    }

    router.push({
      pathname: '/(tabs)/ChatbotScreen',
      params: navParams
    });
  }

  const getConfidenceColor = (value: number) => {
    if (value >= 0.7) return '#34C759';
    if (value >= 0.4) return '#FF9500';
    return '#FF3B30';
  };

  // --- CAROUSEL DATA ---
  const productCarouselItems: ProductItem[] = useMemo(() => {
    return recommendedProducts.map((product) => ({
      type: 'product' as const,
      id: product.productId,
      product: product, // Object này đã chứa aiReason
      onPress: () => {
        router.push({
          pathname: '/(stacks)/ProductDetailScreen',
          params: { productId: product.productId },
        });
      },
    }));
  }, [recommendedProducts, router]);

  // --- RENDER ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 1. HEADER IMAGE SECTION */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: `${themeColor}10` }]}>
                <Ionicons name="image-outline" size={64} color={themeColor} />
                <Text style={{ color: themeColor, marginTop: 10, fontWeight: '600' }}>No Image Attached</Text>
              </View>
            )}

            {/* Mask Overlay */}
            {maskUrl && showMask && (
              <View style={styles.maskContainer}>
                <Image
                  source={{ uri: maskUrl }}
                  style={styles.maskImage}
                  resizeMode="cover"
                />
                <View style={styles.redTintOverlay} />
              </View>
            )}

            {/* Gradient */}
            <View style={styles.gradientOverlay} />
          </View>

          {/* Navigation Header */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerBadgeContainer}>
              <View style={[styles.headerBadge, { backgroundColor: themeColor }]}>
                <Ionicons name={iconName} size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle}>{displayType}</Text>
            </View>
            
            <View style={styles.overlayButton} />
          </View>

          {/* Mask Toggle */}
          {maskUrl && result.aiDetectedDisease?.toLowerCase() !== "normal" && (
            <View style={styles.maskControls}>
              <TouchableOpacity
                style={[
                  styles.maskToggle,
                  showMask && [styles.maskToggleActive, { backgroundColor: themeColor }]
                ]}
                onPress={() => setShowMask(!showMask)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={showMask ? 'eye-off' : 'eye'}
                  size={18}
                  color={showMask ? '#FFFFFF' : themeColor}
                />
                <Text style={[
                  styles.maskToggleText,
                  showMask && { color: '#FFFFFF' }
                ]}>
                  {showMask ? t('analysis.hideMask') : t('analysis.showMask')} 
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 2. CONTENT BODY */}
        <View style={styles.contentSection}>
          
          {/* MAIN DIAGNOSIS CARD */}
          <Animated.View
            style={[
              styles.resultCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.resultHeader}>
              <View style={[styles.resultIconWrapper, { backgroundColor: `${themeColor}15` }]}>
                <View style={[styles.resultIcon, { backgroundColor: themeColor }]}>
                  <Ionicons name={iconName} size={32} color="#FFFFFF" />
                </View>
              </View>
              
              <View style={styles.resultTitleContainer}>
                <Text style={styles.resultLabel}>{t('analysis.resultLabel')}</Text>
                <Text style={[styles.resultValue, { color: themeColor }]}>
                  {displayTitle}
                </Text>
                {!isManual && confidence !== undefined && (
                  <View style={styles.confidenceContainer}>
                    <Text style={styles.confidenceLabel}>Confidence: </Text>
                    <Text style={[styles.confidenceValue, { color: getConfidenceColor(confidence) }]}>
                      {(confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.resultDivider} />

            <View style={styles.descriptionContainer}>
              <View style={styles.descriptionHeaderRow}>
                <Ionicons name="information-circle" size={18} color="#666" />
                <Text style={styles.descriptionLabel}>
                   {isManual ? t('analysis.symptomsNotes') : t('analysis.aboutCondition')}
                </Text>
              </View>
              <Text style={styles.resultDescription}>
                {displayDescription}
              </Text>

              {/* Skin Type Chips */}
              {!isManual && result.aiDetectedCondition && (
                <View style={styles.skinTypeSection}>
                  <View style={styles.skinTypeLabelRow}>
                    <Ionicons name="water" size={14} color="#666" />
                    <Text style={styles.skinTypeLabel}>{t('analysis.skinTypesLabel')}</Text>
                  </View>
                  <View style={styles.chipContainer}>
                    {result.aiDetectedCondition.split(',').map((condition: string, index: number) => {
                      const trimmedCondition = condition.trim().toLowerCase();
                      
                      const chipColors: { [key: string]: { bg: string; text: string } } = {
                        'combination': { bg: '#E8F5E9', text: '#2E7D32' },
                        'dry': { bg: '#FFF3E0', text: '#E65100' },
                        'normal': { bg: '#E3F2FD', text: '#1565C0' },
                        'oily': { bg: '#FFF9C4', text: '#F9A825' },
                        'sensitive': { bg: '#FCE4EC', text: '#C2185B' },
                      };
                      const colors = chipColors[trimmedCondition] || { bg: '#F5F5F5', text: '#666' };
                      const translatedName = t(`analysis.skinTypes.${trimmedCondition}`);
                      
                      return (
                        <View 
                          key={index} 
                          style={[styles.skinTypeChip, { backgroundColor: colors.bg }]}
                        >
                          <Text style={[styles.skinTypeChipText, { color: colors.text }]}>
                            {translatedName}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Metadata Row */}
              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Ionicons name="calendar" size={14} color="#2196F3" />
                  <Text style={styles.metadataText}>
                    {new Date(result.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                
                <View style={styles.metadataDot} />
                
                <View style={styles.metadataItem}>
                  <Ionicons name="time" size={14} color="#FF9800" />
                  <Text style={styles.metadataText}>
                    {new Date(result.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>

              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Ionicons name={isManual ? 'create' : 'sparkles'} size={14} color="#34C759" />
                  <Text style={styles.metadataText}>
                    {isManual ? t('analysis.manual') : t('analysis.aiScan')}
                  </Text>
                </View>
                
                <View style={styles.metadataDot} />
                
                <View style={styles.metadataItem}>
                  <Ionicons name="layers" size={14} color="#A855F7" />
                  <Text style={styles.metadataText}>
                    {isManual ? t('analysis.manual') : t('analysis.disease')}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* DISCLAIMER */}
          <Animated.View
            style={[
              styles.disclaimer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.disclaimerHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#D97706" />
              <Text style={styles.disclaimerTitle}>{t('analysis.medicalDisclaimer')}</Text> 
            </View>
            <Text style={styles.disclaimerText}>
              {t('analysis.disclaimerText')} 
            </Text>
          </Animated.View>

          {/* RECOMMENDED PRODUCTS CAROUSEL */}
          {!isManual && productIdsKey && (
            <Animated.View
              style={[
                styles.recommendedSection,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}
            >
              <View style={styles.recommendedHeader}>
                <View style={styles.recommendedTitleContainer}>
                  <View style={[styles.recommendedIcon, { backgroundColor: `${primaryColor}15` }]}>
                    <Ionicons name="sparkles" size={20} color={primaryColor} />
                  </View>
                  <Text style={styles.recommendedTitle}>AI Suggestions</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/HomeScreen')}
                  style={styles.viewAllButton}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.viewAllText, { color: primaryColor }]}>View All</Text>
                  <Ionicons name="arrow-forward" size={16} color={primaryColor} />
                </TouchableOpacity>
              </View>

              {/* Note about personalization */}
              <View style={{ marginBottom: 12, paddingHorizontal: 4 }}>
                 <Text style={{ fontSize: 13, color: '#666', fontStyle: 'italic', lineHeight: 18 }}>
                    💡 Products selected based on your profile (Age, Gender, Allergies) and condition.
                 </Text>
              </View>

              {loadingProducts ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={primaryColor} />
                  <Text style={styles.loadingText}>Loading recommendations...</Text>
                </View>
              ) : recommendedProducts.length > 0 ? (
                <Carousel
                  items={productCarouselItems}
                  autoPlay={false}
                  showPagination={true}
                  itemWidth={width * 0.75} // Widen to better fit reason text
                  itemSpacing={16}
                />
              ) : (
                <View style={styles.noProductsContainer}>
                  <Ionicons name="cube-outline" size={48} color="#999" />
                  <Text style={styles.noProductsText}>No products available</Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* ACTIONS */}
          <Animated.View
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          >
            <TouchableOpacity
              style={[styles.askAIButton, { backgroundColor: '#F8F9FA', borderColor: themeColor }]}
              onPress={handleAskAI}
              activeOpacity={0.8}
            >
              <View style={styles.askAIIcon}>
                 <Ionicons name="chatbubbles-outline" size={20} color={themeColor} />
              </View>
              <Text style={[styles.askAIText, { color: themeColor }]}>{t('analysis.askAI')}</Text> 
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.consultButton, { backgroundColor: '#FFFFFF', borderColor: '#2196F3' }]}
              onPress={() => router.push('/(stacks)/DermatologistListScreen')}
              activeOpacity={0.8}
            >
              <View style={styles.consultIcon}>
                 <Ionicons name="people-outline" size={20} color="#2196F3" />
              </View>
              <Text style={[styles.consultText, { color: '#2196F3' }]}>Consult with Experts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: primaryColor }]}
              onPress={() => router.push('/(tabs)/AnalyzeScreen')}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>{t('analysis.startNew')}</Text> 
            </TouchableOpacity>
          </Animated.View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageSection: {
    position: 'relative',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  imageContainer: {
    width: width,
    height: width * 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  maskImage: {
    width: '100%',
    height: '100%',
    opacity: 0.65,
  },
  redTintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 0, 50, 0.1)',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 150,
    backgroundColor: 'transparent',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  overlayButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerBadgeContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadge: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16, fontWeight: '700', color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  maskControls: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    alignItems: 'center',
  },
  maskToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  maskToggleActive: {},
  maskToggleText: {
    fontSize: 14, fontWeight: '700', color: '#1A1A1A',
  },
  contentSection: {
    padding: 24,
    marginTop: -20,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginBottom: 20,
  },
  resultIconWrapper: {
    width: 64, height: 64, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  resultIcon: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  resultTitleContainer: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 12, fontWeight: '700', color: '#999',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1,
  },
  resultValue: {
    fontSize: 24, fontWeight: '800', lineHeight: 30,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  confidenceLabel: {
    fontSize: 12, fontWeight: '600', color: '#666',
  },
  confidenceValue: {
    fontSize: 14, fontWeight: '800',
  },
  resultDivider: {
    height: 1, backgroundColor: '#F0F0F0', marginBottom: 20,
  },
  descriptionContainer: {
    backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16,
  },
  descriptionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  descriptionLabel: {
    fontSize: 12, fontWeight: '700', color: '#666',
    textTransform: 'uppercase',
  },
  resultDescription: {
    fontSize: 15, fontWeight: '400', color: '#333', lineHeight: 24,
  },
  skinTypeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  skinTypeLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  skinTypeLabel: {
    fontSize: 12, fontWeight: '700', color: '#666', textTransform: 'uppercase',
  },
  chipContainer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  skinTypeChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  skinTypeChipText: {
    fontSize: 12, fontWeight: '700',
  },
  metadataRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12,
  },
  metadataItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  metadataDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0',
  },
  metadataText: {
    fontSize: 13, fontWeight: '500', color: '#1A1A1A',
  },
  disclaimer: {
    backgroundColor: '#FFF8E1', borderRadius: 16, padding: 16, marginBottom: 24,
    borderLeftWidth: 4, borderLeftColor: '#F59E0B',
  },
  disclaimerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6,
  },
  disclaimerTitle: {
    fontSize: 14, fontWeight: '800', color: '#B45309',
  },
  disclaimerText: {
    fontSize: 12, color: '#78350F', lineHeight: 18, fontWeight: '500',
  },
  recommendedSection: {
    marginBottom: 24,
  },
  recommendedHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  recommendedTitleContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  recommendedIcon: {
    width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  recommendedTitle: {
    fontSize: 18, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3,
  },
  viewAllButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  viewAllText: {
    fontSize: 14, fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40, alignItems: 'center', gap: 12,
  },
  loadingText: {
    fontSize: 14, color: '#666', fontWeight: '500',
  },
  noProductsContainer: {
    paddingVertical: 40, alignItems: 'center', gap: 12,
  },
  noProductsText: {
    fontSize: 14, color: '#999', fontWeight: '500',
  },
  askAIButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 18, borderWidth: 1.5,
    marginBottom: 16, backgroundColor: '#FFFFFF',
  },
  askAIIcon: {
    // styles updated
  },
  askAIText: {
    fontSize: 16, fontWeight: '700',
  },
  consultButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 18, borderWidth: 1.5, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  consultIcon: {
    // styles updated
  },
  consultText: {
    fontSize: 16, fontWeight: '700',
  },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 18, borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  actionButtonText: {
    fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3,
  },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  errorText: {
    fontSize: 15, color: '#666', marginBottom: 28, textAlign: 'center',
  },
  errorButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16,
  },
  errorButtonText: {
    fontSize: 16, fontWeight: '700', color: '#FFFFFF',
  },
});