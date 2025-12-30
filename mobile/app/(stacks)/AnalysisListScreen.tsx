import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Animated,
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import skinAnalysisService, { SkinAnalysisResult } from '@/services/skinAnalysisService';
import tokenService from '@/services/tokenService';
import userService from '@/services/userService';
import { useThemeColor } from '@/contexts/ThemeColorContext';
import ToTopButton from '@/components/ToTopButton';
import { useTranslation } from 'react-i18next';

export function AnalysisListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();
  const [analyses, setAnalyses] = useState<SkinAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showToTop, setShowToTop] = useState(false);  
  const flatListRef = useRef<FlatList>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadAnalyses();
  }, []);

  useEffect(() => {
    if (!loading) {
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
    }
  }, [loading]);

  const loadAnalyses = async () => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = await tokenService.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const customerData = await userService.getCustomerByUserId(user.userId, token);
      const data = await skinAnalysisService.getUserAnalyses(customerData.customerId);
      
      const sortedData = data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAnalyses(sortedData);
    } catch (error) {
      console.error('Error loading analyses:', error);
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyses();
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowToTop(offsetY > 200);
  };

  const handleAnalysisPress = (analysis: SkinAnalysisResult) => {
    router.push({
      pathname: '/(stacks)/AnalysisDetailScreen',
      params: {
        result: JSON.stringify(analysis),
      },
    });
  };

  const normalizeKey = (key: string | null) => {
    if (!key) return '';
    
    // Split by underscore, capitalize first letter of each part, join back
    return key
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('_');
  };

  const renderAnalysisItem = ({ item, index }: { item: SkinAnalysisResult; index: number }) => {
    const isManual = item.source === 'MANUAL';
    
    // For manual sources, display "Manual" as the result; otherwise show disease detection
    const detectedValue = isManual 
      ? t('analysis.manual')
      : t('analysis.' + normalizeKey(item.aiDetectedDisease));
    
    // Icon and color based on type (manual or disease)
    const iconName = isManual ? 'create' : 'search';
    const badgeColor = isManual ? '#666' : '#E91E63';

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <TouchableOpacity
          style={styles.analysisCard}
          onPress={() => handleAnalysisPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardImageContainer}>
            <Image
              source={{ uri: item.imageUrls[0] }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={[styles.typeBadge, { backgroundColor: badgeColor }]}>
              <Ionicons name={iconName} size={14} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardTop}>
              <View style={[styles.typeChip, { backgroundColor: `${badgeColor}15` }]}>
                <Ionicons name={iconName} size={14} color={badgeColor} />
                <Text style={[styles.typeChipText, { color: badgeColor }]}>
                  {isManual ? t('analysis.manual') : t('analysis.disease')}
                </Text>
              </View>
              <Ionicons name="chevron-forward-circle" size={22} color="#E0E0E0" />
            </View>

            <Text style={styles.detectedText} numberOfLines={2}>
              {detectedValue}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar" size={14} color="#999" />
                <Text style={styles.metaText}>
                  {new Date(item.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons
                  name={item.source === 'AI_SCAN' ? 'sparkles' : 'create'}
                  size={14}
                  color="#999"
                />
                <Text style={styles.metaText}>
                  {item.source === 'AI_SCAN' ? t('analysis.aiScan') : t('analysis.manual')}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        
        {/* Decorative Background */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
          <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('analysis.historyTitle')}</Text>
          <View style={styles.backButton} />
        </View>
        
        <View style={styles.centerContainer}>
          <View style={[styles.loadingIcon, { backgroundColor: `${primaryColor}15` }]}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
          <Text style={styles.loadingText}>{t('analysis.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      {/* Decorative Background */}
      <View style={styles.backgroundPattern}>
        <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
        <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
      </View>

      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('analysis.historyTitle')}</Text>
        </View>
        
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/AnalyzeScreen')}
          style={[styles.addButton, { backgroundColor: `${primaryColor}15` }]}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={primaryColor} />
        </TouchableOpacity>
      </Animated.View>

      {/* Stats Card */}
      {analyses.length > 0 && (
        <Animated.View 
          style={[
            styles.statsCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="document-text" size={20} color={primaryColor} />
            </View>
            <View>
              <Text style={styles.statValue}>{analyses.length}</Text>
              <Text style={styles.statLabel}>{t('analysis.totalScans')}</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#F0F9FF' }]}>
              <Ionicons name="calendar" size={20} color="#2196F3" />
            </View>
            <View>
              <Text style={styles.statValue}>
                {new Date(analyses[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.statLabel}>{t('analysis.latest')}</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Analysis List */}
      <FlatList
        ref={flatListRef}
        data={analyses}
        renderItem={renderAnalysisItem}
        keyExtractor={(item) => item.analysisId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[primaryColor]} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={
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
              <Ionicons name="albums-outline" size={56} color={primaryColor} />
            </View>
            <Text style={styles.emptyTitle}>{t('analysis.noAnalysis')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('analysis.noAnalysisDesc')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: primaryColor }]}
              onPress={() => router.push('/(tabs)/AnalyzeScreen')}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>{t('analysis.startAnalysis')}</Text>
            </TouchableOpacity>
          </Animated.View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add ToTopButton as overlay */}
      <ToTopButton
        visible={showToTop}
        onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
      />
    </View>
  );
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
    height: 300,
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
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
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexGrow: 1,
  },
  analysisCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardImageContainer: {
    position: 'relative',
    width: 110,
    height: 130,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detectedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AnalysisListScreen;