import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import skinAnalysisService from '@/services/skinAnalysisService';
import { useThemeColor } from '@/contexts/ThemeColorContext';
import { useTranslation } from 'react-i18next';
import CustomAlert from '@/components/CustomAlert'; // Import CustomAlert

export default function ManualEntryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();

  const [complaint, setComplaint] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ complaint?: string; symptoms?: string }>({});

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    startAnimations();
  }, []);

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
    ]).start();
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: t('manualEntry.error'),
        message: t('manualEntry.couldNotPickImage'),
        type: 'error',
        onConfirm: hideAlert
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { complaint?: string; symptoms?: string } = {};

    if (!complaint.trim()) {
      newErrors.complaint = t('manualEntry.chiefComplaintRequired');
    }

    if (!symptoms.trim()) {
      newErrors.symptoms = t('manualEntry.symptomsRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setAlertConfig({
        visible: true,
        title: t('manualEntry.validationError'),
        message: t('manualEntry.fillRequiredFields'),
        type: 'warning',
        onConfirm: hideAlert
      });
      return;
    }

    if (!user?.userId) {
      setAlertConfig({
        visible: true,
        title: t('manualEntry.error'),
        message: t('manualEntry.userNotAuthenticated'),
        type: 'error',
        onConfirm: hideAlert
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await skinAnalysisService.createManualEntry({
        chiefComplaint: complaint,
        patientSymptoms: symptoms,
        notes: notes || undefined,
        imageUris: selectedImage ? [selectedImage] : null,
      });

      // Success Alert with navigation callback
      setAlertConfig({
        visible: true,
        title: t('manualEntry.success'),
        message: t('manualEntry.recordSaved'),
        type: 'success',
        onConfirm: () => {
          hideAlert();
          router.back();
        }
      });
    } catch (error: any) {
      setAlertConfig({
        visible: true,
        title: t('manualEntry.error'),
        message: error.message || t('manualEntry.failedSaveRecord'),
        type: 'error',
        onConfirm: hideAlert
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={[styles.headerIcon, { backgroundColor: `${primaryColor}15` }]}>
            <Ionicons name="create-outline" size={20} color={primaryColor} />
          </View>
          <Text style={styles.headerTitle}>{t('manualEntry.title')}</Text>
        </View>
        
        <View style={styles.placeholder} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Image Upload Card */}
        <Animated.View 
          style={[
            styles.imageCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: `${primaryColor}10` }]}>
              <Ionicons name="camera" size={20} color={primaryColor} />
            </View>
            <View>
              <Text style={styles.cardTitle}>{t('manualEntry.attachPhoto')}</Text>
              <Text style={styles.cardSubtitle}>{t('manualEntry.optionalImage')}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.imagePicker, 
              selectedImage && styles.imagePickerHasImage
            ]} 
            onPress={pickImage}
            activeOpacity={0.7}
          >
            {selectedImage ? (
              <>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <View style={[styles.editImageBadge, { backgroundColor: primaryColor }]}>
                  <Ionicons name="camera" size={18} color="#FFFFFF" />
                </View>
              </>
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={[styles.uploadIconContainer, { backgroundColor: `${primaryColor}15` }]}>
                  <Ionicons name="image-outline" size={32} color={primaryColor} />
                </View>
                <Text style={styles.uploadText}>{t('manualEntry.tapToUpload')}</Text>
                <Text style={styles.uploadSubtext}>{t('manualEntry.fileTypes')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Form Card */}
        <Animated.View 
          style={[
            styles.formCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: `${primaryColor}10` }]}>
              <Ionicons name="document-text" size={20} color={primaryColor} />
            </View>
            <View>
              <Text style={styles.cardTitle}>{t('manualEntry.medicalDetails')}</Text>
              <Text style={styles.cardSubtitle}>{t('manualEntry.describeCondition')}</Text>
            </View>
          </View>

          {/* Chief Complaint */}
          <InputField
            label={t('manualEntry.chiefComplaint')}
            placeholder={t('manualEntry.chiefComplaintPlaceholder')}
            icon="warning-outline"
            value={complaint}
            onChangeText={(text) => {
              setComplaint(text);
              if (errors.complaint) setErrors({ ...errors, complaint: '' });
            }}
            error={errors.complaint}
            required
            primaryColor={primaryColor}
          />

          {/* Symptoms */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('manualEntry.symptoms')} <Text style={styles.required}>*</Text>
            </Text>
            <View style={[
              styles.textAreaWrapper, 
              errors.symptoms && styles.textAreaWrapperError
            ]}>
              <Ionicons name="list-outline" size={18} color="#666" style={styles.textAreaIcon} />
              <TextInput
                style={styles.textArea}
                placeholder={t('manualEntry.symptomsPlaceholder')}
                placeholderTextColor="#999"
                value={symptoms}
                onChangeText={(text) => {
                  setSymptoms(text);
                  if (errors.symptoms) setErrors({ ...errors, symptoms: '' });
                }}
                multiline
                textAlignVertical="top"
              />
              {symptoms && !errors.symptoms && (
                <Ionicons 
                  name="checkmark-circle" 
                  size={18} 
                  color="#34C759" 
                  style={styles.checkIcon}
                />
              )}
            </View>
            {errors.symptoms && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={13} color="#FF3B30" />
                <Text style={styles.errorText}>{errors.symptoms}</Text>
              </View>
            )}
          </View>

          {/* Additional Notes */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('manualEntry.additionalNotes')}</Text>
            <View style={styles.textAreaWrapper}>
              <Ionicons name="pencil-outline" size={18} color="#666" style={styles.textAreaIcon} />
              <TextInput
                style={styles.textArea}
                placeholder={t('manualEntry.notesPlaceholder')}
                placeholderTextColor="#999"
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Info Box */}
          <View style={[styles.infoBox, { backgroundColor: `${primaryColor}08` }]}>
            <View style={[styles.infoIcon, { backgroundColor: primaryColor }]}>
              <Ionicons name="information" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.infoText}>
              {t('manualEntry.fieldsRequired')}
            </Text>
          </View>
        </Animated.View>

        {/* Submit Button */}
        <Animated.View 
          style={[
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitButton, 
              { backgroundColor: primaryColor },
              isSubmitting && styles.buttonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>{t('manualEntry.saveRecord')}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Integrated Custom Alert */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        confirmText={t('manualEntry.ok')}
      />
    </KeyboardAvoidingView>
  );
}

// Input Field Component
interface InputFieldProps {
  label: string;
  placeholder: string;
  icon: any;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  required?: boolean;
  primaryColor: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  error,
  required,
  primaryColor,
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
      <Ionicons name={icon} size={18} color="#666" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
      />
      {value && !error && (
        <Ionicons name="checkmark-circle" size={18} color="#34C759" />
      )}
    </View>
    {error && (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={13} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )}
  </View>
);

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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  cardHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  imagePicker: {
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePickerHasImage: {
    borderStyle: 'solid',
    borderWidth: 0,
    backgroundColor: '#FFFFFF',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  editImageBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: '#FF3B30',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  inputWrapperError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  textAreaWrapper: {
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    minHeight: 120,
  },
  textAreaWrapperError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  textAreaIcon: {
    marginBottom: 8,
  },
  textArea: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
    minHeight: 80,
  },
  checkIcon: {
    position: 'absolute',
    top: 14,
    right: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginTop: 4,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    lineHeight: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});