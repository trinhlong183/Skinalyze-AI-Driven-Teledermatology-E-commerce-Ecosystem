import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next'; // Added import for translations
import { useThemeColor } from '@/contexts/ThemeColorContext';
import { useAuth } from '@/hooks/useAuth';
import userService from '@/services/userService';
import tokenService from '@/services/tokenService';

const { width } = Dimensions.get('window');

interface AllergyUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AllergyUpdateModal({ visible, onClose, onSuccess }: AllergyUpdateModalProps) {
  const { t } = useTranslation(); // Added translation hook
  const { primaryColor } = useThemeColor();
  const { user, refreshUser } = useAuth();
  
  const [allergiesText, setAllergiesText] = useState('');
  const [loading, setLoading] = useState(false);

  // Load dữ liệu cũ khi mở Modal
  useEffect(() => {
    if (visible && user?.allergies) {
      setAllergiesText(user.allergies.join(', '));
    } else if (visible) {
      setAllergiesText('');
    }
  }, [visible, user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await tokenService.getToken();
      if (!token) {
        alert(t('profile.sessionExpired')); // Translated alert
        onClose();
        return;
      }

      // 1. Xử lý chuỗi thành mảng
      // Tách bằng dấu phẩy, xóa khoảng trắng thừa, loại bỏ chuỗi rỗng
      const allergiesArray = allergiesText
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      // 2. Gọi API Update (Giả sử bạn đã có hàm updateProfile trong userService)
      await userService.updateProfile(token, {
        allergies: allergiesArray
      });

      // 3. Refresh lại User Context để App cập nhật ngay lập tức
      await refreshUser();
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update allergies:", error);
      alert(t('profile.updateFailed')); // Translated alert
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={styles.container}>
              {/* Header Icon */}
              <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}15` }]}>
                <Ionicons name="shield-checkmark" size={40} color={primaryColor} />
              </View>

              <Text style={styles.title}>{t('profile.updateAllergiesTitle')}</Text>
              <Text style={styles.subtitle}>
                {t('profile.updateAllergiesSubtitle')}
              </Text>

              {/* Input Area */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('profile.allergiesListLabel')}</Text>
                <TextInput
                  style={[styles.input, { borderColor: primaryColor, backgroundColor: '#F9FAFB' }]}
                  placeholder={t('profile.allergiesExample')}
                  placeholderTextColor="#999"
                  value={allergiesText}
                  onChangeText={setAllergiesText}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                
                {/* Chip Preview (Hiển thị trực quan những gì user đã nhập) */}
                <View style={styles.chipPreview}>
                  {allergiesText.split(',').map((item, index) => {
                    const tag = item.trim();
                    if (!tag) return null;
                    return (
                      <View key={index} style={styles.chip}>
                        <Text style={styles.chipText}>{tag}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>{t('profile.skip')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: primaryColor }]} 
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('profile.saveChanges')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  container: {
    width: width * 0.85,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
  },
  chipPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    backgroundColor: '#FEE2E2', // Màu đỏ nhạt cảnh báo
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});