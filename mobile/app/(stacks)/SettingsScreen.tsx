import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  StatusBar,
  Animated,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { router } from "expo-router";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { Ionicons } from "@expo/vector-icons";
import ColorPicker from 'react-native-wheel-color-picker';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';  // Add this import (or use '@/contexts/LanguageContext' if not creating a separate hook file)

type Language = 'en' | 'vi';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { themeColor, setThemeColor, primaryColor, customColor, setCustomColor } = useThemeColor();
  const { currentLanguage, setLanguage } = useLanguage();  // Add this hook
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(customColor || '#007AFF');
  
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
  
  const themeOptions: Array<{ color: "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "custom"; label: string; hex: string }> = [
    { color: 'red', label: t('settings.red'), hex: '#FF3B30' },
    { color: 'orange', label: t('settings.orange'), hex: '#FF9500' },
    { color: 'yellow', label: t('settings.yellow'), hex: '#FFCC00' },  
    { color: 'green', label: t('settings.green'), hex: '#34C759' },  
    { color: 'blue', label: t('settings.blue'), hex: '#007AFF' },  
    { color: 'purple', label: t('settings.purple'), hex: '#AF52DE' },  
    { color: 'custom', label: t('settings.custom'), hex: customColor || '#007AFF' },  
  ];

  const handleCustomColorSelect = () => {
    setSelectedColor(customColor || '#007AFF');
    setShowColorPicker(true);
  };

  const handleSaveCustomColor = () => {
    setCustomColor(selectedColor);
    setThemeColor('custom');
    setShowColorPicker(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      {/* Decorative Background */}
      <View style={styles.backgroundPattern}>
        <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
        <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={[styles.headerIcon, { backgroundColor: `#fff` }]}>
              <Ionicons name="settings" size={50} color={primaryColor} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{t('settings.title')}</Text>  
              <Text style={styles.headerSubtitle}>{t('settings.subtitle')}</Text> 
            </View>
          </View>
        </Animated.View>

        {/* Theme Color Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="color-palette" size={18} color="#A855F7" />
            </View>
            <Text style={styles.sectionTitle}>{t('settings.themeColor')}</Text>  
          </View>
          
          <View style={styles.themeCard}>
            <View style={styles.themeGrid}>
              {themeOptions.map((option) => (
                <TouchableOpacity
                  key={option.color}
                  style={styles.themeOption}
                  onPress={() => {
                    if (option.color === 'custom') {
                      handleCustomColorSelect();
                    } else {
                      setThemeColor(option.color);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.colorCircle,
                      { backgroundColor: option.color === 'custom' ? (customColor || option.hex) : option.hex },
                      themeColor === option.color && [styles.colorCircleSelected, { borderColor: option.color === 'custom' ? (customColor || option.hex) : option.hex }],
                    ]}
                  >
                    {themeColor === option.color && (
                      <View style={styles.checkmarkWrapper}>
                        <Ionicons name="checkmark" size={20} color="#fff" />
                      </View>
                    )}
                    {option.color === 'custom' && themeColor !== 'custom' && (
                      <Ionicons name="color-palette" size={22} color="#fff" />
                    )}
                  </View>
                  <Text style={[
                    styles.themeLabel,
                    themeColor === option.color && styles.themeLabelActive
                  ]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Developer Tools Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#F0F9FF' }]}>
              <Ionicons name="code-slash" size={18} color="#2196F3" />
            </View>
            <Text style={styles.sectionTitle}>{t('settings.developerTools')}</Text>  
          </View>

          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("../(tabs)/NotificationScreen")}
              activeOpacity={0.7}
            >
              <View style={[styles.settingIconWrapper, { backgroundColor: '#FFF4E6' }]}>
                <Ionicons name="notifications" size={20} color="#FF9800" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('settings.notificationTest')}</Text> 
                <Text style={styles.settingDescription}>
                  {t('settings.notificationTestDesc')} 
                </Text>
              </View>
              <View style={[styles.settingArrow, { backgroundColor: `${primaryColor}10` }]}>
                <Ionicons name="chevron-forward" size={18} color={primaryColor} />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* App Settings Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="apps" size={18} color="#34C759" />
            </View>
            <Text style={styles.sectionTitle}>{t('settings.appSettings')}</Text> 
          </View>

          <View style={styles.settingsCard}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => {
                const newLang = currentLanguage === 'vi' ? 'en' : 'vi';  // Use currentLanguage
                setLanguage(newLang as Language);  // Use setLanguage
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.settingIconWrapper, { backgroundColor: '#F0F9FF' }]}>
                <Ionicons name="language" size={20} color="#2196F3" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('settings.language')}</Text>
                <Text style={styles.settingDescription}>
                  {currentLanguage === 'vi' ? t('settings.vietnamese') : t('settings.english')}  {/* Use currentLanguage */}
                </Text>
              </View>
              <View style={[styles.settingArrow, { backgroundColor: `${primaryColor}10` }]}>
                <Ionicons name="chevron-forward" size={18} color={primaryColor} />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* About Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FFE8F0' }]}>
              <Ionicons name="information-circle" size={18} color="#E91E63" />
            </View>
            <Text style={styles.sectionTitle}>{t('settings.about')}</Text> 
          </View>

          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={[styles.settingIconWrapper, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="cube" size={20} color="#A855F7" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('settings.version')}</Text> 
                <Text style={styles.settingDescription}>1.0.0</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('settings.madeBy')}</Text> 
        </View>
      </ScrollView>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowColorPicker(false)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalHeaderIcon, { backgroundColor: `${selectedColor}15` }]}>
                  <Ionicons name="color-palette" size={20} color={selectedColor} />
                </View>
                <Text style={styles.modalTitle}>{t('settings.chooseCustomColor')}</Text> 
              </View>
              <TouchableOpacity 
                onPress={() => setShowColorPicker(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <ColorPicker
                color={selectedColor}
                onColorChange={(color) => setSelectedColor(color)}
                thumbSize={30}
                sliderSize={30}
                noSnap={true}
                row={false}
                swatches={true}
                discrete={false}
              />
            </View>

            <View style={styles.colorPreview}>
              <Text style={styles.previewLabel}>{t('settings.selectedColor')}</Text> 
              <View style={styles.previewRow}>
                <View
                  style={[
                    styles.previewCircle,
                    { backgroundColor: selectedColor }
                  ]}
                >
                  <Ionicons name="checkmark" size={32} color="#fff" />
                </View>
                <View style={styles.hexContainer}>
                  <Text style={styles.hexLabel}>{t('settings.hexCode')}</Text> 
                  <Text style={styles.hexText}>{selectedColor.toUpperCase()}</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowColorPicker(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color="#666" />
                <Text style={styles.cancelButtonText}>{t('profile.cancel')}</Text>  (reuse from profile)
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: selectedColor }]}
                onPress={handleSaveCustomColor}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>{t('settings.applyColor')}</Text> 
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
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
    paddingBottom: 32,
    gap: 16,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
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
  themeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  themeOption: {
    alignItems: 'center',
    width: '22%',
  },
  colorCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  colorCircleSelected: {
    borderWidth: 4,
    transform: [{ scale: 1.05 }],
  },
  checkmarkWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textAlign: 'center',
  },
  themeLabelActive: {
    color: '#1A1A1A',
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  settingIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  settingArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    padding: 4,
  },
  pickerContainer: {
    height: 300,
    marginBottom: 24,
  },
  colorPreview: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  previewCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  hexContainer: {
    flex: 1,
  },
  hexLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hexText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});