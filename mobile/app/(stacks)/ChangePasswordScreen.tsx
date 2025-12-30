import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import tokenService from '@/services/tokenService'
import userService from '@/services/userService'
import Ionicons from '@expo/vector-icons/Ionicons'
import CustomAlert from '@/components/CustomAlert' // Make sure this path is correct

interface PasswordFormData {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ChangePasswordScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState<PasswordFormData>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Partial<PasswordFormData>>({})

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

  const validateForm = (): boolean => {
    const newErrors: Partial<PasswordFormData> = {}

    // Old password validation
    if (!formData.oldPassword) {
      newErrors.oldPassword = 'Current password is required'
    }

    // New password validation
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters'
    } else if (formData.newPassword === formData.oldPassword) {
      newErrors.newPassword = 'New password must be different from current password'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.confirmPassword !== formData.newPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChangePassword = async () => {
    if (!validateForm()) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please fill in all fields correctly',
        type: 'warning',
        onConfirm: hideAlert
      });
      return
    }

    setLoading(true)
    try {
      const token = await tokenService.getToken()
      if (!token) {
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: 'Please login again',
          type: 'error',
          onConfirm: hideAlert
        });
        return
      }

      await userService.changePassword(
        token,
        formData.oldPassword,
        formData.newPassword
      )

      // Success Alert
      setAlertConfig({
        visible: true,
        title: 'Success',
        message: 'Password changed successfully',
        type: 'success',
        onConfirm: () => {
          hideAlert();
          router.back();
        }
      });

      // Clear form (though we navigate back immediately usually)
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      // Error Alert
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to change password',
        type: 'error',
        onConfirm: hideAlert
      });
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (password: string): { text: string; color: string; width: number } => {
    if (!password) return { text: '', color: '#E0E0E0', width: 0 }
    
    let strength = 0
    if (password.length >= 6) strength++
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++

    if (strength <= 2) return { text: 'Weak', color: '#FF3B30', width: 0.33 }
    if (strength <= 3) return { text: 'Medium', color: '#FF9500', width: 0.66 }
    return { text: 'Strong', color: '#34C759', width: 1 }
  }

  const passwordStrength = getPasswordStrength(formData.newPassword)

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#007AFF" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Secure Your Account</Text>
            <Text style={styles.infoText}>
              Create a strong password with at least 6 characters
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          {/* Current Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.oldPassword && styles.inputError]}
                placeholder="Enter current password"
                placeholderTextColor="#999"
                value={formData.oldPassword}
                onChangeText={(text) => {
                  setFormData({ ...formData, oldPassword: text })
                  if (errors.oldPassword) setErrors({ ...errors, oldPassword: '' })
                }}
                secureTextEntry={!showOldPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowOldPassword(!showOldPassword)}
              >
                <Ionicons 
                  name={showOldPassword ? "eye" : "eye-off"} 
                  size={24} 
                  color="#666666" 
                />
              </TouchableOpacity>
            </View>
            {errors.oldPassword && (
              <Text style={styles.errorText}>{errors.oldPassword}</Text>
            )}
          </View>

          {/* New Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.newPassword && styles.inputError]}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                value={formData.newPassword}
                onChangeText={(text) => {
                  setFormData({ ...formData, newPassword: text })
                  if (errors.newPassword) setErrors({ ...errors, newPassword: '' })
                }}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons 
                  name={showNewPassword ? "eye" : "eye-off"} 
                  size={24} 
                  color="#666666" 
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword && (
              <Text style={styles.errorText}>{errors.newPassword}</Text>
            )}
            
            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View 
                    style={[
                      styles.strengthFill, 
                      { width: `${passwordStrength.width * 100}%`, backgroundColor: passwordStrength.color }
                    ]} 
                  />
                </View>
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.text}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                placeholder="Re-enter new password"
                placeholderTextColor="#999"
                value={formData.confirmPassword}
                onChangeText={(text) => {
                  setFormData({ ...formData, confirmPassword: text })
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' })
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye" : "eye-off"} 
                  size={24} 
                  color="#666666" 
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
            
            {/* Match Indicator */}
            {formData.confirmPassword && formData.newPassword && (
              <View style={styles.matchContainer}>
                <Ionicons 
                  name={formData.confirmPassword === formData.newPassword ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={formData.confirmPassword === formData.newPassword ? "#34C759" : "#FF3B30"} 
                />
                <Text style={[
                  styles.matchText,
                  { color: formData.confirmPassword === formData.newPassword ? "#34C759" : "#FF3B30" }
                ]}>
                  {formData.confirmPassword === formData.newPassword ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirement}>
              <Ionicons 
                name={formData.newPassword.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={formData.newPassword.length >= 6 ? "#34C759" : "#999"} 
              />
              <Text style={[styles.requirementText, formData.newPassword.length >= 6 && styles.requirementMet]}>
                At least 6 characters
              </Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons 
                name={/[A-Z]/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={/[A-Z]/.test(formData.newPassword) ? "#34C759" : "#999"} 
              />
              <Text style={[styles.requirementText, /[A-Z]/.test(formData.newPassword) && styles.requirementMet]}>
                One uppercase letter (recommended)
              </Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons 
                name={/\d/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={/\d/.test(formData.newPassword) ? "#34C759" : "#999"} 
              />
              <Text style={[styles.requirementText, /\d/.test(formData.newPassword) && styles.requirementMet]}>
                One number (recommended)
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Change Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Integrated Custom Alert */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        confirmText="OK"
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FF',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 12,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#007AFF',
  },
  form: {
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  passwordContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  passwordInput: {
    paddingRight: 50,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirementsBox: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#999999',
  },
  requirementMet: {
    color: '#34C759',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})