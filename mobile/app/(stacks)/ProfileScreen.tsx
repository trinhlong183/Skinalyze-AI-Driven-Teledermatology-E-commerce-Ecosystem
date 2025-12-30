import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import tokenService from "@/services/tokenService";
import userService from "@/services/userService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import * as ImagePicker from "expo-image-picker";
import CustomAlert from "@/components/CustomAlert";

const { width } = Dimensions.get("window");
const QUICK_ACTION_COLUMNS = 3;
const QUICK_ACTION_SPACING = 12;
const quickActionItemWidth =
  (width - 48 - (QUICK_ACTION_COLUMNS - 1) * QUICK_ACTION_SPACING) /
  QUICK_ACTION_COLUMNS;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();
  const { currentLanguage, setLanguage } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("VND");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);

  // ✅ Form State: Includes allergies as a comma-separated string for editing
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    dob: user?.dob || "",
    allergies:
      user?.allergies && Array.isArray(user.allergies)
        ? user.allergies.join(", ")
        : "",
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    type: "info",
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Helper function to show alert
  const showAlert = (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string,
    confirmText: string = t("profile.ok"),
    onConfirm: () => void = () => {},
    cancelText?: string,
    onCancel?: () => void
  ) => {
    setAlertConfig({
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        setAlertVisible(false);
        onConfirm();
      },
      onCancel: onCancel
        ? () => {
            setAlertVisible(false);
            onCancel();
          }
        : undefined,
    });
    setAlertVisible(true);
  };

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        phone: user.phone,
        dob: user.dob,
        // Ensure allergies is handled correctly whether it's null or array
        allergies:
          user.allergies && Array.isArray(user.allergies)
            ? user.allergies.join(", ")
            : "",
      });
      fetchBalance();

      // Start animations
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
  }, [user]);

  // Reset selected photo when exiting edit mode
  useEffect(() => {
    if (!isEditing) {
      setSelectedPhotoUri(null);
    }
  }, [isEditing]);

  const fetchBalance = async () => {
    setBalanceLoading(true);
    try {
      const balanceData = await userService.getBalance();
      setBalance(balanceData.balance);
      setCurrency(balanceData.currency);
    } catch (error: any) {
      console.error("Error fetching balance:", error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "warning",
        t("profile.permissionRequired"),
        t("profile.galleryPermissionMessage")
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "warning",
        t("profile.permissionRequired"),
        t("profile.cameraPermissionMessage")
      );
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedPhotoUri(result.assets[0].uri);
    }
  };

  const handleSelectPhoto = () => {
    showAlert(
      "info",
      t("profile.changePhoto"),
      t("profile.selectPhotoSource"),
      t("profile.takePhoto"),
      takePhoto,
      t("profile.chooseFromGallery"),
      pickImage
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await tokenService.getToken();
      if (!token) {
        showAlert("error", t("profile.error"), t("profile.loginAgain"));
        return;
      }

      // Upload photo if a new one was selected
      if (selectedPhotoUri) {
        setUploadingPhoto(true);
        try {
          await userService.uploadProfilePhoto(selectedPhotoUri);
          console.log("✅ Photo uploaded successfully");
        } catch (photoError: any) {
          console.error("Error uploading photo:", photoError);
          showAlert(
            "error",
            t("profile.error"),
            t("profile.failedPhotoUpload")
          );
          // Continue with profile update even if photo upload fails
        } finally {
          setUploadingPhoto(false);
        }
      }

      // ✅ Process allergies string into array for API payload
      // Split by comma, trim whitespace, and filter empty strings
      const allergiesArray = formData.allergies
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const payload = {
        fullName: formData.fullName,
        phone: formData.phone,
        dob: formData.dob,
        allergies: allergiesArray, // ✅ Send array to backend
      };

      // Update profile data
      await userService.updateProfile(token, payload);
      await refreshUser();

      setIsEditing(false);
      setSelectedPhotoUri(null);

      showAlert("success", t("profile.success"), t("profile.profileUpdated"));
    } catch (error: any) {
      showAlert(
        "error",
        t("profile.error"),
        error.message || t("profile.failedUpdate")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        phone: user.phone,
        dob: user.dob,
        allergies:
          user.allergies && Array.isArray(user.allergies)
            ? user.allergies.join(", ")
            : "",
      });
    }
    setSelectedPhotoUri(null);
    setIsEditing(false);
  };

  const handleDeleteAddress = async (addressId: string) => {
    showAlert(
      "warning",
      t("profile.deleteAddress"),
      t("profile.deleteAddressConfirm"),
      t("profile.delete"),
      async () => {
        try {
          const token = await tokenService.getToken();
          if (!token) return;

          await userService.deleteAddress(token, addressId);
          await refreshUser();

          showAlert(
            "success",
            t("profile.success"),
            t("profile.addressDeleted")
          );
        } catch (error: any) {
          showAlert(
            "error",
            t("profile.error"),
            error.message || t("profile.failedDelete")
          );
        }
      },
      t("profile.cancel"),
      () => {}
    );
  };

  const handleLogout = () => {
    showAlert(
      "warning",
      t("profile.logout"),
      t("profile.logoutConfirm"),
      t("profile.logout"),
      async () => {
        await logout();
        router.replace("/SignInScreen" as any);
      },
      t("profile.cancel"),
      () => {}
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Helper to display Gender text based on boolean
  const getGenderText = (gender: boolean | undefined | null) => {
    if (gender === true) return t("profile.male");
    if (gender === false) return t("profile.female");
    return t("profile.notSet");
  };

  // Helper to get Gender Icon
  const getGenderIcon = (gender: boolean | undefined | null) => {
    if (gender === true) return "male";
    if (gender === false) return "female";
    return "person-outline"; // Neutral icon
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>{t("profile.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* Decorative Background */}
      <View style={styles.backgroundPattern}>
        <View
          style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]}
        />
        <View
          style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Back Button */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t("profile.title")}</Text>

          <TouchableOpacity
            onPress={() => (isEditing ? handleCancel() : setIsEditing(true))}
            style={[
              styles.editButton,
              isEditing && { backgroundColor: "#FFE8E8" },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isEditing ? "close" : "create-outline"}
              size={20}
              color={isEditing ? "#FF3B30" : primaryColor}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View
          style={[
            styles.profileCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={[
                styles.avatarWrapper,
                { borderColor: `${primaryColor}30` },
              ]}
              onPress={isEditing ? handleSelectPhoto : undefined}
              activeOpacity={isEditing ? 0.7 : 1}
              disabled={!isEditing}
            >
              {uploadingPhoto ? (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: `${primaryColor}20` },
                  ]}
                >
                  <ActivityIndicator size="small" color={primaryColor} />
                </View>
              ) : selectedPhotoUri ? (
                <Image
                  source={{ uri: selectedPhotoUri }}
                  style={styles.avatar}
                />
              ) : user.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: primaryColor },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {user.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              {/* Edit Badge - Show when editing */}
              {isEditing && !uploadingPhoto && (
                <View
                  style={[
                    styles.editAvatarBadge,
                    { backgroundColor: primaryColor },
                  ]}
                >
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              )}

              {/* Status Badge - Show when not editing */}
              {!isEditing && (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: user.isVerified ? "#34C759" : "#FF9500",
                    },
                  ]}
                >
                  <Ionicons
                    name={user.isVerified ? "checkmark-circle" : "time"}
                    size={14}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.fullName}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>

              {/* Status Pills */}
              <View style={styles.statusPills}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: user.isVerified ? "#E8F9F0" : "#FFF4E6",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      user.isVerified ? "shield-checkmark" : "shield-outline"
                    }
                    size={11}
                    color={user.isVerified ? "#34C759" : "#FF9500"}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: user.isVerified ? "#34C759" : "#FF9500" },
                    ]}
                  >
                    {user.isVerified
                      ? t("profile.verified")
                      : t("profile.unverified")}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: `${primaryColor}12` },
                  ]}
                >
                  <Ionicons name="person" size={11} color={primaryColor} />
                  <Text
                    style={[styles.statusPillText, { color: primaryColor }]}
                  >
                    {user.role}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Balance Card */}
          <View
            style={[
              styles.balanceCard,
              { backgroundColor: `${primaryColor}08` },
            ]}
          >
            <View style={styles.balanceInfo}>
              <View
                style={[styles.balanceIcon, { backgroundColor: primaryColor }]}
              >
                <Ionicons name="wallet-outline" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.balanceTextContainer}>
                <Text style={styles.balanceLabel}>
                  {t("profile.walletBalance")}
                </Text>
                {balanceLoading ? (
                  <ActivityIndicator size="small" color={primaryColor} />
                ) : (
                  <Text style={[styles.balanceAmount, { color: primaryColor }]}>
                    {balance !== null
                      ? `${balance.toLocaleString()} ${currency}`
                      : "N/A"}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.balanceActions}>
              <TouchableOpacity
                style={styles.balanceActionButton}
                onPress={() => router.push("/(stacks)/TopUpScreen")}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconCircle,
                    { backgroundColor: primaryColor },
                  ]}
                >
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.actionButtonText}>
                  {t("profile.topUp")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.balanceActionButton}
                onPress={() => router.push("/(stacks)/WithdrawalScreen")}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconCircle,
                    { backgroundColor: primaryColor },
                  ]}
                >
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.actionButtonText}>
                  {t("profile.withdraw")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.balanceActionButton}
                onPress={() => router.push("/(stacks)/PaymentHistoryScreen")}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconCircle,
                    { backgroundColor: primaryColor },
                  ]}
                >
                  <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.actionButtonText}>
                  {t("profile.history")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          style={[
            styles.quickActions,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <QuickActionButton
            icon="albums-outline"
            label={t("profile.analysis")}
            color={primaryColor}
            onPress={() => router.push("/(stacks)/AnalysisListScreen")}
          />
          <QuickActionButton
            icon="receipt-outline"
            label={t("profile.orders")}
            color={primaryColor}
            onPress={() => router.push("/(stacks)/OrderListScreen")}
          />
          <QuickActionButton
            icon="calendar-outline"
            label={t("profile.appointments")}
            color={primaryColor}
            onPress={() => router.push("/(stacks)/MyAppointmentsScreen")}
          />
          <QuickActionButton
            icon="clipboard-outline"
            label={t("profile.routines")}
            color={primaryColor}
            onPress={() => router.push("/(stacks)/MyRoutinesScreen")}
          />
          <QuickActionButton
            icon="medkit-outline"
            label={t("profile.subscriptions")}
            color={primaryColor}
            onPress={() => router.push("/(stacks)/MySubscriptionsScreen")}
          />
          <QuickActionButton
            icon="settings-outline"
            label={t("profile.settings")}
            color={primaryColor}
            onPress={() => router.push("/(stacks)/SettingsScreen")}
          />
          <QuickActionButton
            icon="return-down-back-outline"
            label={t("returnRequest.myRequests")}
            color="#FF6B6B"
            onPress={() => router.push("/(stacks)/MyReturnRequestsScreen")}
          />
          <QuickActionButton
            icon="alert-circle-outline"
            label={t("profile.updateAllergies")}
            color="#EF4444"
            onPress={() => router.push("/(stacks)/AllergyOnboardingScreen")}
          />
        </Animated.View>

        {/* Personal Information Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("profile.personalInfo")}</Text>
          </View>

          <View style={styles.infoCard}>
            <InfoField
              icon="person-outline"
              label={t("profile.fullName")}
              value={formData.fullName}
              isEditing={isEditing}
              onChangeText={(text) =>
                setFormData({ ...formData, fullName: text })
              }
              primaryColor={primaryColor}
            />

            <View style={styles.divider} />

            <InfoField
              icon="call-outline"
              label={t("profile.phone")}
              value={formData.phone}
              isEditing={isEditing}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
              primaryColor={primaryColor}
            />

            <View style={styles.divider} />

            {/* Date of Birth Field */}
            <View style={styles.fieldWrapper}>
              <View
                style={[
                  styles.fieldIcon,
                  { backgroundColor: `${primaryColor}10` },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={primaryColor}
                />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>{t("profile.dob")}</Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderBottomColor: primaryColor },
                    ]}
                    value={formData.dob}
                    onChangeText={(text) =>
                      setFormData({ ...formData, dob: text })
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999"
                  />
                ) : (
                  <Text style={styles.fieldValue}>
                    {formData.dob ? formatDate(formData.dob) : "Not set"}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Gender Field - Read Only */}
            <View style={styles.fieldWrapper}>
              <View
                style={[
                  styles.fieldIcon,
                  { backgroundColor: `${primaryColor}10` },
                ]}
              >
                <Ionicons
                  name={getGenderIcon(user.gender)}
                  size={18}
                  color={primaryColor}
                />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>{t("profile.gender")}</Text>
                <Text style={styles.fieldValue}>
                  {getGenderText(user.gender)}
                </Text>
                {isEditing && (
                  <Text style={styles.fieldHint}>
                    {t("profile.genderCannotChange")}
                  </Text>
                )}
              </View>

              {/* Show Lock icon when editing to indicate read-only */}
              {isEditing ? (
                <Ionicons name="lock-closed-outline" size={16} color="#999" />
              ) : (
                user.gender !== null &&
                user.gender !== undefined && (
                  <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                )
              )}
            </View>

            <View style={styles.divider} />

            {/* Email Field - Read Only */}
            <View style={styles.fieldWrapper}>
              <View
                style={[
                  styles.fieldIcon,
                  { backgroundColor: `${primaryColor}10` },
                ]}
              >
                <Ionicons name="mail-outline" size={18} color={primaryColor} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>{t("profile.email")}</Text>
                <Text style={styles.fieldValue}>{user.email}</Text>
                <Text style={styles.fieldHint}>{t("profile.emailHint")}</Text>
              </View>
            </View>

            {/* ✅ ALLERGIES SECTION (NEW) */}
            <View style={styles.divider} />

            <View style={styles.fieldWrapper}>
              <View
                style={[
                  styles.fieldIcon,
                  { backgroundColor: `${primaryColor}10` },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline" // Warning icon for allergies
                  size={18}
                  color={primaryColor}
                />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>{t("profile.allergies")}</Text>

                {isEditing ? (
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderBottomColor: primaryColor },
                    ]}
                    value={formData.allergies}
                    onChangeText={(text) =>
                      setFormData({ ...formData, allergies: text })
                    }
                    placeholder={t("profile.allergiesPlaceholder")} // e.g. "Peanuts, Pollen"
                    placeholderTextColor="#999"
                    multiline
                  />
                ) : (
                  <View style={styles.allergyTagsContainer}>
                    {user.allergies && user.allergies.length > 0 ? (
                      user.allergies.map((allergy: string, index: number) => (
                        <View
                          key={index}
                          style={[
                            styles.allergyTag,
                            { backgroundColor: "#FEE2E2" },
                          ]} // Red light background
                        >
                          <Text
                            style={[
                              styles.allergyTagText,
                              { color: "#EF4444" },
                            ]}
                          >
                            {allergy}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.fieldValue}>
                        {t("profile.noAllergies")}
                      </Text>
                    )}
                  </View>
                )}

                {isEditing && (
                  <Text style={styles.fieldHint}>
                    {t("profile.allergiesHint")}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Addresses Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t("profile.savedAddresses")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(stacks)/AddressDetailScreen")}
              style={[
                styles.addButton,
                { backgroundColor: `${primaryColor}15` },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={primaryColor} />
            </TouchableOpacity>
          </View>

          {user.addresses && user.addresses.length > 0 ? (
            user.addresses.map((address, index) => (
              <View key={address.addressId} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <View
                    style={[
                      styles.addressBadge,
                      { backgroundColor: `${primaryColor}15` },
                    ]}
                  >
                    <Ionicons name="location" size={16} color={primaryColor} />
                  </View>

                  <View style={styles.addressInfo}>
                    <Text style={styles.addressTitle}>
                      {t("profile.address")} {index + 1}
                    </Text>
                    <Text style={styles.addressType}>{t("profile.home")}</Text>
                  </View>

                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: `${primaryColor}10` },
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/(stacks)/AddressDetailScreen",
                          params: { addressId: address.addressId },
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color={primaryColor}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: "#FFE8E8" },
                      ]}
                      onPress={() => handleDeleteAddress(address.addressId)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#FF3B30"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.addressDetails}>
                  <Text style={styles.addressLine}>
                    {address.streetLine1}
                    {address.streetLine2 ? `, ${address.streetLine2}` : ""}
                  </Text>
                  <Text style={styles.addressLine}>{address.street}</Text>
                  <Text style={styles.addressLine}>
                    {address.wardOrSubDistrict}, {address.district},{" "}
                    {address.city}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: `${primaryColor}10` },
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={40}
                  color={primaryColor}
                />
              </View>
              <Text style={styles.emptyTitle}>{t("profile.noAddresses")}</Text>
              <Text style={styles.emptySubtitle}>
                {t("profile.addAddressDesc")}
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: primaryColor }]}
                onPress={() => router.push("/(stacks)/AddressDetailScreen")}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>
                  {t("profile.addAddress")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionButtons,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>
                  {t("profile.cancel")}
                </Text>
              </TouchableOpacity>

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
                    <Text style={styles.saveButtonText}>
                      {t("profile.saveChanges")}
                    </Text>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={styles.logoutButtonText}>{t("profile.logout")}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </View>
  );
}

// Quick Action Button Component
const QuickActionButton = ({ icon, label, color, bgColor, onPress }: any) => (
  <TouchableOpacity
    style={styles.quickActionButton}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

// Info Field Component
interface InfoFieldProps {
  icon: any;
  label: string;
  value: string;
  isEditing: boolean;
  onChangeText: (text: string) => void;
  keyboardType?: any;
  primaryColor: string;
}

const InfoField: React.FC<InfoFieldProps> = ({
  icon,
  label,
  value,
  isEditing,
  onChangeText,
  keyboardType = "default",
  primaryColor,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.fieldWrapper}>
      <View
        style={[styles.fieldIcon, { backgroundColor: `${primaryColor}10` }]}
      >
        <Ionicons name={icon} size={18} color={primaryColor} />
      </View>
      <View style={styles.fieldContent}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {isEditing ? (
          <TextInput
            style={[styles.fieldInput, { borderBottomColor: primaryColor }]}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            placeholder={`${t("profile.enter")} ${label.toLowerCase()}`}
            placeholderTextColor="#999"
          />
        ) : (
          <Text style={styles.fieldValue}>{value || t("profile.notSet")}</Text>
        )}
      </View>
      {!isEditing && value && (
        <Ionicons name="checkmark-circle" size={18} color="#34C759" />
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
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 400,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 32,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  editButton: {
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
  profileCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarWrapper: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    padding: 2,
    marginRight: 16,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 37,
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 37,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
    fontWeight: "500",
  },
  statusPills: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 2,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  balanceCard: {
    padding: 16,
    borderRadius: 16,
  },
  balanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  balanceTextContainer: {
    flex: 1,
  },
  balanceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  balanceActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  balanceActionButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 11,
    color: "#333",
    fontWeight: "600",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  quickActionButton: {
    width: quickActionItemWidth,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: QUICK_ACTION_SPACING,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    color: "#666",
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  fieldInput: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "600",
    borderBottomWidth: 2,
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  fieldHint: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 16,
  },
  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  addressBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addressInfo: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  addressType: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  addressActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addressDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  addressLine: {
    fontSize: 13,
    color: "#1A1A1A",
    fontWeight: "500",
    marginBottom: 3,
    lineHeight: 18,
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionButtons: {
    paddingHorizontal: 24,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FF3B30",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF3B30",
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FF3B30",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF3B30",
  },
  editAvatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  // ✅ Added styles for Allergies
  allergyTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  allergyTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  allergyTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
