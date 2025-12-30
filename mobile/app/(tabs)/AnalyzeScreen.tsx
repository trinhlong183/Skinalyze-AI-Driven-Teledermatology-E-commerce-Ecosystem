import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

// Components
import FacialSkinCamera from '@/components/FacialSkinCamera';
import OtherAreaCamera from '@/components/OtherAreaCamera';
import CustomAlert from '@/components/CustomAlert';

// Hooks & Context
import { useAuth } from '@/hooks/useAuth';
import { useThemeColor } from '@/contexts/ThemeColorContext';

// Services
import skinAnalysisService from '@/services/skinAnalysisService';

// Get screen dimensions for responsive layout
const { width } = Dimensions.get('window');

type ScreenState = 'options' | 'diseaseOptions' | 'camera';
type DetectionType = 'facialDisease' | 'otherDisease';

export default function AnalyzeScreen() {
  // State
  const [screenState, setScreenState] = useState<ScreenState>('options');
  const [detectionType, setDetectionType] = useState<DetectionType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error' as 'error' | 'success' | 'warning' | 'info',
  });

  const { user } = useAuth();
  const { primaryColor } = useThemeColor();
  const router = useRouter();
  const { t } = useTranslation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Reset animation values
    fadeAnim.setValue(0);
    slideAnim.setValue(30);

    // Play animation on state change
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screenState]);

  // --- Handlers ---

  /**
   * Handles closing the alert and ensures all loading states are reset
   * to re-enable the camera capture button.
   */
  const handleAlertDismiss = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    setIsAnalyzing(false); // Force loading to stop to enable buttons
  };

  const handleDiseaseDetection = () => {
    setScreenState('diseaseOptions');
  };

  const handleFacialDisease = () => {
    setDetectionType('facialDisease');
    setScreenState('camera');
  };

  const handleOtherDisease = () => {
    setDetectionType('otherDisease');
    setScreenState('camera');
  };

  const handleBack = () => {
    if (screenState === 'camera') {
      setScreenState('diseaseOptions');
      setDetectionType(null);
    } else if (screenState === 'diseaseOptions') {
      setScreenState('options');
    }
  };

  const handleCapture = async (imageUri: string) => {
    if (!user?.userId) {
      setAlertConfig({
        visible: true,
        title: t('productDetail.authRequired'),
        message: t('profile.loginAgain'),
        type: 'warning'
      });
      setScreenState('options');
      setDetectionType(null);
      return;
    }

    setIsAnalyzing(true);

    try {
      // Disease Detection with Note
      const note = detectionType === 'facialDisease' ? 'facial' : 'other';
      
      // Call Service
      const result = await skinAnalysisService.detectDisease(user.userId, imageUri, note);

      // Success - turn off loading and navigate
      setIsAnalyzing(false);
      setScreenState('options');
      setDetectionType(null);

      // Navigate to Results
      router.push({
        pathname: '/(stacks)/AnalysisDetailScreen',
        params: {
          result: JSON.stringify(result)
        }
      });

    } catch (error: any) {
      console.error('❌ Analysis error:', error);
      
      // CRITICAL: Stop loading immediately so the Overlay disappears 
      // and the Camera component receives the resolved promise
      setIsAnalyzing(false);
      
      const errorMessage = error.message || String(error);

      // Specific handling for "No face detected"
      if (errorMessage.includes('No face detected')) {
        setAlertConfig({
          visible: true,
          title: t('analyze.analysisFailed'),
          message: "No face detected. Please ensure your face is well-lit and centered in the frame.", 
          type: 'warning'
        });
        // We do NOT change screenState here, so user stays on camera to retry
      } else {
        // Generic Error
        setAlertConfig({
          visible: true,
          title: t('analyze.analysisFailed'),
          message: errorMessage || t('analyze.errorDesc'),
          type: 'error'
        });
      }
    }
  };

  // --- COMPONENT: Loading Overlay ---
  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingCard}>
        <View style={[styles.loadingIconWrapper, { backgroundColor: `${primaryColor}10` }]}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
        <Text style={styles.loadingTitle}>{t('analyze.analyzing')}</Text>
        <Text style={styles.loadingText}>{t('analyze.aiProcessing')}</Text>
      </View>
    </View>
  );

  // --- RENDER: Camera Screen ---
  if (screenState === 'camera') {
    return (
      <>
        {detectionType === 'facialDisease' ? (
          <FacialSkinCamera
            onCapture={handleCapture}
            onClose={handleBack}
            initialFacing="front"
            title={t('analyze.positionFaceDisease')}
          />
        ) : (
          <OtherAreaCamera
            onCapture={handleCapture}
            onClose={handleBack}
            title={t('analyze.holdCameraClose')}
          />
        )}
        
        {isAnalyzing && <LoadingOverlay />}
        
        {/* Custom Alert Overlay for Camera Errors */}
        <CustomAlert 
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onConfirm={handleAlertDismiss} // Using the robust dismiss handler
          confirmText={t('common.cancel')} 
        />
      </>
    );
  }

  // --- RENDER: Main Options Screen ---
  if (screenState === 'options') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Subtle Background Elements */}
        <View style={styles.bgDecorCircle1} />
        <View style={styles.bgDecorCircle2} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            style={[
              styles.headerContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <Text style={styles.headerSuperTitle}>{t('analyze.aiSkinAnalysis').toUpperCase()}</Text>
          </Animated.View>

          {/* Main Cards */}
          <Animated.View
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          >
            {/* Disease Detection */}
            <TouchableOpacity
              style={[styles.mainCard, styles.shadowSm]}
              onPress={handleDiseaseDetection}
              activeOpacity={0.9}
            >
              <View style={[styles.cardAccentLine, { backgroundColor: '#E91E63' }]} />
              
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#FCE4EC' }]}>
                  <Ionicons name="medical" size={26} color="#E91E63" />
                </View>
                <View style={[styles.badge, { backgroundColor: '#FCE4EC' }]}>
                  <Text style={[styles.badgeText, { color: '#E91E63' }]}>{t('analyze.advanced')}</Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{t('analyze.diseaseDetection')}</Text>
                <Text style={styles.cardDesc}>{t('analyze.identifyDiseases')}</Text>
                
                <View style={styles.featureList}>
                  <View style={styles.featureRow}>
                    <Ionicons name="body-outline" size={14} color="#666" />
                    <Text style={styles.featureText}>{t('analyze.anySkinArea')}</Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Ionicons name="hardware-chip-outline" size={14} color="#666" />
                    <Text style={styles.featureText}>{t('analyze.aiPowered')}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Manual Entry - styled differently */}
            <TouchableOpacity
              style={[styles.manualCard, { borderColor: `${primaryColor}30`, backgroundColor: `${primaryColor}05` }]}
              onPress={() => router.push('/ManualEntryScreen')}
              activeOpacity={0.7}
            >
              <View style={styles.manualContent}>
                <Text style={[styles.manualTitle, { color: primaryColor }]}>{t('analyze.manualEntry')}</Text>
                <Text style={styles.manualDesc}>{t('analyze.recordWithoutCamera')}</Text>
              </View>
              <View style={[styles.manualIcon, { backgroundColor: primaryColor }]}>
                <Ionicons name="add" size={24} color="#FFF" />
              </View>
            </TouchableOpacity>

            {/* Disclaimer */}
            <View style={styles.disclaimerContainer}>
              <Ionicons name="information-circle-outline" size={20} color="#999" />
              <Text style={styles.disclaimerText}>
                {t('analyze.resultsInformational')}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Custom Alert in Main View */}
        <CustomAlert 
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onConfirm={handleAlertDismiss}
          confirmText={t('analyze.ok')}
        />
      </View>
    );
  }

  // --- RENDER: Disease Options Screen ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Background Decor */}
      <View style={[styles.bgDecorCircle1, { opacity: 0.03 }]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Nav Header */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <Text style={styles.headerSuperTitle}>{t('analyze.diseaseDetection').toUpperCase()}</Text>
            <Text style={styles.headerTitle}>{t('analyze.chooseSkinArea')}</Text>
          </View>
        </Animated.View>

        {/* Selection Cards */}
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* Facial Area */}
          <TouchableOpacity
            style={[styles.optionCard, styles.shadowSm]}
            onPress={handleFacialDisease}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIconBox, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="happy-outline" size={28} color="#FF9800" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{t('analyze.facialSkinArea')}</Text>
              <Text style={styles.optionDesc}>{t('analyze.useFrontCamera')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#DDD" />
          </TouchableOpacity>

          {/* Other Area */}
          <TouchableOpacity
            style={[styles.optionCard, styles.shadowSm]}
            onPress={handleOtherDisease}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIconBox, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="body-outline" size={28} color="#4CAF50" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{t('analyze.otherSkinArea')}</Text>
              <Text style={styles.optionDesc}>{t('analyze.useBackCamera')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#DDD" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Custom Alert in Disease Options View */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={handleAlertDismiss}
        confirmText={t('analyze.ok')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Background Decorations
  bgDecorCircle1: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#F5F5F5',
    zIndex: -1,
  },
  bgDecorCircle2: {
    position: 'absolute',
    top: 100,
    left: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FAFAFA',
    zIndex: -1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 60 : 60,
    paddingBottom: 40,
  },
  
  // Header
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 10,
    marginLeft: -8,
  },
  headerContainer: {
    marginBottom: 30,
  },
  headerSuperTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },

  // Main Cards
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  cardAccentLine: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingLeft: 12, 
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardContent: {
    paddingLeft: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  featureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },

  // Manual Entry Card
  manualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
    marginBottom: 30,
  },
  manualContent: {
    flex: 1,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  manualDesc: {
    fontSize: 13,
    color: '#666',
  },
  manualIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  // Option Cards (Disease Screen)
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  optionIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    color: '#666',
  },

  // Disclaimer
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
    marginTop: -10,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    flex: 1,
    lineHeight: 16,
  },

  // Utilities
  shadowSm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingCard: {
    width: width * 0.7,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  loadingIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});