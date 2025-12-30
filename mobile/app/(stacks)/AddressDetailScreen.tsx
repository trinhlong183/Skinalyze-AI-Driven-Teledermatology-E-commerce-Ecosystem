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
  Animated,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import tokenService from "@/services/tokenService";
import userService from "@/services/userService";
import ghnService, {
  GHNProvince,
  GHNDistrict,
  Ward,
} from "@/services/ghnService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from "react-i18next";
import CustomAlert from "@/components/CustomAlert"; // Make sure this path is correct

interface AddressFormData {
  street: string;
  streetLine1: string;
  streetLine2: string;
  wardOrSubDistrict: string;
  district: string;
  city: string;
  districtId?: number;
  wardCode?: string;
}

export default function AddressDetailScreen() {
  const router = useRouter();
  const { addressId } = useLocalSearchParams();
  const { user, refreshUser } = useAuth();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();

  const isEditMode = !!addressId;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [formData, setFormData] = useState<AddressFormData>({
    street: "",
    streetLine1: "",
    streetLine2: "",
    wardOrSubDistrict: "",
    district: "",
    city: "",
    districtId: undefined,
    wardCode: undefined,
  });
  const [errors, setErrors] = useState<Partial<AddressFormData>>({});

  // GHN Address Selection States
  const [provinces, setProvinces] = useState<GHNProvince[]>([]);
  const [districts, setDistricts] = useState<GHNDistrict[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(
    null
  );
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(
    null
  );
  const [selectedWardCode, setSelectedWardCode] = useState<string>("");

  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showWardPicker, setShowWardPicker] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
  });

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    loadProvinces();
    if (isEditMode && addressId) {
      loadAddressDetails();
    } else {
      startAnimations();
    }
  }, [addressId]);

  const loadProvinces = async () => {
    try {
      const provinceList = await ghnService.getProvinces();
      setProvinces(provinceList);
    } catch (error) {
      console.error("Error loading provinces:", error);
    }
  };

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

  const loadAddressDetails = async () => {
    try {
      setInitialLoading(true);
      const token = await tokenService.getToken();
      if (!token) return;

      const address = await userService.getAddress(addressId as string, token);

      setFormData({
        street: address.street,
        streetLine1: address.streetLine1,
        streetLine2: address.streetLine2 || "",
        wardOrSubDistrict: address.wardOrSubDistrict,
        district: address.district,
        city: address.city,
        districtId: address.districtId,
        wardCode: address.wardCode,
      });

      // Set selected IDs if available
      if (address.districtId) {
        setSelectedDistrictId(address.districtId);
        // Load wards for this district
        try {
          const wardList = await ghnService.getWards(address.districtId);
          setWards(wardList);
        } catch (error) {
          console.error("Error loading wards:", error);
        }
      }
      if (address.wardCode) {
        setSelectedWardCode(address.wardCode);
      }

      startAnimations();
    } catch (error: any) {
      setAlertConfig({
        visible: true,
        title: t("address.error"),
        message: error.message || t("address.loadError"),
        type: "error",
        onConfirm: () => {
          hideAlert();
          router.back();
        },
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<AddressFormData> = {};

    if (!formData.street.trim()) newErrors.street = t("address.fillRequired");
    if (!formData.streetLine1.trim())
      newErrors.streetLine1 = t("address.fillRequired");
    if (!formData.wardOrSubDistrict.trim())
      newErrors.wardOrSubDistrict = t("address.fillRequired");
    if (!formData.district.trim())
      newErrors.district = t("address.fillRequired");
    if (!formData.city.trim()) newErrors.city = t("address.fillRequired");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setAlertConfig({
        visible: true,
        title: t("address.validationError"),
        message: t("address.fillRequired"),
        type: "warning",
        onConfirm: hideAlert,
      });
      return;
    }

    setLoading(true);
    try {
      const token = await tokenService.getToken();
      if (!token) {
        setAlertConfig({
          visible: true,
          title: t("address.error"),
          message: t("address.loginAgain"),
          type: "error",
          onConfirm: hideAlert,
        });
        return;
      }

      if (isEditMode && addressId) {
        await userService.updateAddress(token, addressId as string, formData);
        await refreshUser();
        setAlertConfig({
          visible: true,
          title: t("address.success"),
          message: t("address.updated"),
          type: "success",
          onConfirm: () => {
            hideAlert();
            router.back();
          },
        });
      } else {
        if (!user?.userId) {
          setAlertConfig({
            visible: true,
            title: t("address.error"),
            message: t("address.userNotFound"),
            type: "error",
            onConfirm: hideAlert,
          });
          return;
        }
        await userService.createAddress(token, {
          userId: user.userId,
          ...formData,
        });
        await refreshUser();
        setAlertConfig({
          visible: true,
          title: t("address.success"),
          message: t("address.added"),
          type: "success",
          onConfirm: () => {
            hideAlert();
            router.back();
          },
        });
      }
    } catch (error: any) {
      const msg = isEditMode
        ? t("address.updateError")
        : t("address.createError");
      setAlertConfig({
        visible: true,
        title: t("address.error"),
        message: error.message || msg,
        type: "error",
        onConfirm: hideAlert,
      });
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async () => {
    hideAlert(); // Close confirmation modal
    try {
      setLoading(true);
      const token = await tokenService.getToken();
      if (!token || !addressId) return;

      await userService.deleteAddress(token, addressId as string);
      await refreshUser();

      setAlertConfig({
        visible: true,
        title: t("address.success"),
        message: t("address.deleted"),
        type: "success",
        onConfirm: () => {
          hideAlert();
          router.back();
        },
      });
    } catch (error: any) {
      setAlertConfig({
        visible: true,
        title: t("address.error"),
        message: error.message || t("address.deleteError"),
        type: "error",
        onConfirm: hideAlert,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setAlertConfig({
      visible: true,
      title: t("address.deleteTitle"),
      message: t("address.deleteConfirm"),
      type: "warning",
      confirmText: t("profile.delete"),
      cancelText: t("profile.cancel"),
      onConfirm: executeDelete,
      onCancel: hideAlert,
    });
  };

  // GHN Address Handlers
  const handleProvinceSelect = async (province: GHNProvince) => {
    setSelectedProvinceId(province.ProvinceID);
    setFormData({
      ...formData,
      city: province.ProvinceName,
    });
    if (errors.city) setErrors({ ...errors, city: "" });

    // Load districts for this province
    try {
      const districtList = await ghnService.getDistricts(province.ProvinceID);
      setDistricts(districtList);
    } catch (error) {
      console.error("Error loading districts:", error);
    }

    // Reset dependent selections
    setSelectedDistrictId(null);
    setSelectedWardCode("");
    setWards([]);
    setFormData((prev) => ({
      ...prev,
      district: "",
      wardOrSubDistrict: "",
      districtId: undefined,
      wardCode: undefined,
    }));
    setShowProvincePicker(false);
  };

  const handleDistrictSelect = async (district: GHNDistrict) => {
    setSelectedDistrictId(district.DistrictID);
    setFormData({
      ...formData,
      district: district.DistrictName,
      districtId: district.DistrictID,
    });
    if (errors.district) setErrors({ ...errors, district: "" });

    // Load wards for this district
    try {
      const wardList = await ghnService.getWards(district.DistrictID);
      setWards(wardList);
    } catch (error) {
      console.error("Error loading wards:", error);
    }

    // Reset ward selection
    setSelectedWardCode("");
    setFormData((prev) => ({
      ...prev,
      wardOrSubDistrict: "",
      wardCode: undefined,
    }));
    setShowDistrictPicker(false);
  };

  const handleWardSelect = (ward: Ward) => {
    setSelectedWardCode(ward.WardCode);
    setFormData({
      ...formData,
      wardOrSubDistrict: ward.WardName,
      wardCode: ward.WardCode,
    });
    if (errors.wardOrSubDistrict)
      setErrors({ ...errors, wardOrSubDistrict: "" });
    setShowWardPicker(false);
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View
          style={[styles.loadingIcon, { backgroundColor: `${primaryColor}15` }]}
        >
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
        <Text style={styles.loadingText}>{t("address.loading")}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      <View style={styles.backgroundPattern}>
        <View
          style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]}
        />
        <View
          style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]}
        />
      </View>

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
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
          <View
            style={[
              styles.headerIcon,
              { backgroundColor: `${primaryColor}15` },
            ]}
          >
            <Ionicons
              name={isEditMode ? "create-outline" : "add-circle-outline"}
              size={20}
              color={primaryColor}
            />
          </View>
          <Text style={styles.headerTitle}>
            {isEditMode ? t("address.editAddress") : t("address.addAddress")}
          </Text>
        </View>

        <View style={styles.placeholder} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.formCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardHeaderIcon,
                { backgroundColor: `${primaryColor}15` },
              ]}
            >
              <Ionicons name="location" size={20} color={primaryColor} />
            </View>
            <View>
              <Text style={styles.cardTitle}>{t("address.details")}</Text>
              <Text style={styles.cardSubtitle}>
                {t("address.fillDetails")}
              </Text>
            </View>
          </View>

          <InputField
            label={t("address.street")}
            placeholder={t("address.streetPlaceholder")}
            icon="home-outline"
            value={formData.street}
            onChangeText={(text) => {
              setFormData({ ...formData, street: text });
              if (errors.street) setErrors({ ...errors, street: "" });
            }}
            error={errors.street}
            required
            primaryColor={primaryColor}
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <InputField
                label={t("address.streetLine1")}
                placeholder={t("address.streetLine1Placeholder")}
                icon="location-outline"
                value={formData.streetLine1}
                onChangeText={(text) => {
                  setFormData({ ...formData, streetLine1: text });
                  if (errors.streetLine1)
                    setErrors({ ...errors, streetLine1: "" });
                }}
                error={errors.streetLine1}
                required
                primaryColor={primaryColor}
              />
            </View>
            <View style={styles.halfInput}>
              <InputField
                label={t("address.streetLine2")}
                placeholder={t("address.streetLine2Placeholder")}
                icon="location-outline"
                value={formData.streetLine2}
                onChangeText={(text) => {
                  setFormData({ ...formData, streetLine2: text });
                }}
                primaryColor={primaryColor}
              />
            </View>
          </View>

          {/* GHN Address Pickers */}
          {/* Province Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>
              {t("address.city")} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.pickerButton, errors.city && styles.pickerError]}
              onPress={() => setShowProvincePicker(true)}
            >
              <Ionicons name="business-outline" size={20} color="#666" />
              <Text
                style={[
                  styles.pickerText,
                  !formData.city && styles.pickerPlaceholder,
                ]}
              >
                {formData.city || t("address.selectCity")}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>

          {/* District Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>
              {t("address.district")} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                errors.district && styles.pickerError,
                !selectedProvinceId && styles.pickerDisabled,
              ]}
              onPress={() => selectedProvinceId && setShowDistrictPicker(true)}
              disabled={!selectedProvinceId}
            >
              <Ionicons name="map-outline" size={20} color="#666" />
              <Text
                style={[
                  styles.pickerText,
                  !formData.district && styles.pickerPlaceholder,
                ]}
              >
                {formData.district || t("address.selectDistrict")}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {errors.district && (
              <Text style={styles.errorText}>{errors.district}</Text>
            )}
          </View>

          {/* Ward Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>
              {t("address.commune")} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                errors.wardOrSubDistrict && styles.pickerError,
                !selectedDistrictId && styles.pickerDisabled,
              ]}
              onPress={() => selectedDistrictId && setShowWardPicker(true)}
              disabled={!selectedDistrictId}
            >
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text
                style={[
                  styles.pickerText,
                  !formData.wardOrSubDistrict && styles.pickerPlaceholder,
                ]}
              >
                {formData.wardOrSubDistrict || t("address.selectWard")}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {errors.wardOrSubDistrict && (
              <Text style={styles.errorText}>{errors.wardOrSubDistrict}</Text>
            )}
          </View>

          <View
            style={[styles.infoBox, { backgroundColor: `${primaryColor}08` }]}
          >
            <View style={[styles.infoIcon, { backgroundColor: primaryColor }]}>
              <Ionicons name="information" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.infoText}>{t("address.infoText")}</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.actionButtons,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: primaryColor },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {isEditMode ? t("address.update") : t("address.save")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {isEditMode && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={styles.deleteButtonText}>{t("address.delete")}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Province Picker Modal */}
      {showProvincePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("address.selectCity")}</Text>
              <TouchableOpacity onPress={() => setShowProvincePicker(false)}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {provinces.map((province) => (
                <TouchableOpacity
                  key={province.ProvinceID}
                  style={[
                    styles.modalItem,
                    selectedProvinceId === province.ProvinceID &&
                      styles.modalItemSelected,
                  ]}
                  onPress={() => handleProvinceSelect(province)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedProvinceId === province.ProvinceID &&
                        styles.modalItemTextSelected,
                    ]}
                  >
                    {province.ProvinceName}
                  </Text>
                  {selectedProvinceId === province.ProvinceID && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={primaryColor}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* District Picker Modal */}
      {showDistrictPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("address.selectDistrict")}
              </Text>
              <TouchableOpacity onPress={() => setShowDistrictPicker(false)}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {districts.map((district) => (
                <TouchableOpacity
                  key={district.DistrictID}
                  style={[
                    styles.modalItem,
                    selectedDistrictId === district.DistrictID &&
                      styles.modalItemSelected,
                  ]}
                  onPress={() => handleDistrictSelect(district)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedDistrictId === district.DistrictID &&
                        styles.modalItemTextSelected,
                    ]}
                  >
                    {district.DistrictName}
                  </Text>
                  {selectedDistrictId === district.DistrictID && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={primaryColor}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Ward Picker Modal */}
      {showWardPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("address.selectWard")}</Text>
              <TouchableOpacity onPress={() => setShowWardPicker(false)}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {wards.map((ward) => (
                <TouchableOpacity
                  key={ward.WardCode}
                  style={[
                    styles.modalItem,
                    selectedWardCode === ward.WardCode &&
                      styles.modalItemSelected,
                  ]}
                  onPress={() => handleWardSelect(ward)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedWardCode === ward.WardCode &&
                        styles.modalItemTextSelected,
                    ]}
                  >
                    {ward.WardName}
                  </Text>
                  {selectedWardCode === ward.WardCode && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={primaryColor}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Integrated Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
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
}) => {
  return (
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 350,
    height: 350,
    borderRadius: 175,
    top: -150,
    right: -80,
  },
  circle2: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    top: -80,
    left: -60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
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
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  cardHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    fontStyle: "italic",
  },
  required: {
    color: "#FF3B30",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#E5E5E5",
  },
  inputWrapperError: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFF5F5",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginTop: 4,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    lineHeight: 16,
  },
  actionButtons: {
    gap: 12,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FF3B30",
  },
  deleteButtonText: {
    color: "#FF3B30",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    gap: 10,
  },
  pickerError: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFF5F5",
  },
  pickerDisabled: {
    opacity: 0.5,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  pickerPlaceholder: {
    color: "#999",
    fontWeight: "400",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalItemSelected: {
    backgroundColor: "#F8F8F8",
  },
  modalItemText: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  modalItemTextSelected: {
    fontWeight: "700",
  },
});