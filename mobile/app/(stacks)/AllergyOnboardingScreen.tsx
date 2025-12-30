import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import userService from "@/services/userService";
import tokenService from "@/services/tokenService";
import { useAuth } from "@/hooks/useAuth";
import CustomAlert from "@/components/CustomAlert";

// Common allergies list
const COMMON_ALLERGIES = [
  { id: "peanuts", icon: "nutrition", label: "Peanuts" },
  { id: "shellfish", icon: "fish", label: "Shellfish" },
  { id: "dairy", icon: "water", label: "Dairy" },
  { id: "eggs", icon: "egg", label: "Eggs" },
  { id: "gluten", icon: "pizza", label: "Gluten/Wheat" },
  { id: "soy", icon: "leaf", label: "Soy" },
  { id: "tree_nuts", icon: "nutrition-outline", label: "Tree Nuts" },
  { id: "alcohol", icon: "wine", label: "Alcohol" },
  { id: "fragrances", icon: "rose", label: "Fragrances" },
  { id: "latex", icon: "hand-right", label: "Latex" },
  { id: "pollen", icon: "flower", label: "Pollen" },
  { id: "dust", icon: "cloud", label: "Dust Mites" },
];

export default function AllergyOnboardingScreen() {
  const router = useRouter();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { refreshUser } = useAuth();

  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [customAllergies, setCustomAllergies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"welcome" | "allergies">("welcome");

  // Alert state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
    confirmText?: string;
    onConfirm: () => void;
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

  const showAlert = (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string,
    onConfirm: () => void = hideAlert
  ) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      onConfirm,
    });
  };

  const toggleAllergy = (allergyId: string) => {
    if (selectedAllergies.includes(allergyId)) {
      setSelectedAllergies(selectedAllergies.filter((id) => id !== allergyId));
    } else {
      setSelectedAllergies([...selectedAllergies, allergyId]);
    }
  };

  const addCustomAllergy = () => {
    const trimmed = customAllergy.trim();
    if (trimmed && !customAllergies.includes(trimmed)) {
      setCustomAllergies([...customAllergies, trimmed]);
      setCustomAllergy("");
    }
  };

  const removeCustomAllergy = (allergy: string) => {
    setCustomAllergies(customAllergies.filter((a) => a !== allergy));
  };

  const handleSkip = async () => {
    try {
      setLoading(true);
      const token = await tokenService.getToken();
      if (!token) {
        showAlert("error", t("common.error"), t("profile.loginAgain"));
        return;
      }

      // Save empty allergies array
      await userService.updateProfile(token, { allergies: [] });
      await refreshUser();

      // Navigate to home
      router.replace("/(tabs)/HomeScreen");
    } catch (error: any) {
      console.error("Error skipping allergies:", error);
      showAlert("error", t("common.error"), error.message || t("onboarding.skipError"));
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    try {
      setLoading(true);
      const token = await tokenService.getToken();
      if (!token) {
        showAlert("error", t("common.error"), t("profile.loginAgain"));
        return;
      }

      // Combine selected common allergies and custom allergies
      const selectedLabels = selectedAllergies.map(
        (id) => COMMON_ALLERGIES.find((a) => a.id === id)?.label || ""
      );
      const allAllergies = [...selectedLabels, ...customAllergies].filter(
        (a) => a.trim() !== ""
      );

      // Save to backend
      await userService.updateProfile(token, { allergies: allAllergies });
      await refreshUser();

      showAlert(
        "success",
        t("onboarding.successTitle"),
        t("onboarding.successMessage"),
        () => {
          hideAlert();
          router.replace("/(tabs)/HomeScreen");
        }
      );
    } catch (error: any) {
      console.error("Error saving allergies:", error);
      showAlert("error", t("common.error"), error.message || t("onboarding.saveError"));
    } finally {
      setLoading(false);
    }
  };

  if (step === "welcome") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
        <View style={[styles.header, { paddingTop: insets.top }]} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.welcomeContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Icon */}
          <View
            style={[
              styles.welcomeIconContainer,
              { backgroundColor: `${primaryColor}15` },
            ]}
          >
            <Ionicons name="heart" size={80} color={primaryColor} />
          </View>

          {/* Welcome Text */}
          <Text style={styles.welcomeTitle}>{t("onboarding.welcomeTitle")}</Text>
          <Text style={styles.welcomeSubtitle}>
            {t("onboarding.welcomeSubtitle")}
          </Text>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: `${primaryColor}15` },
                ]}
              >
                <Ionicons name="shield-checkmark" size={24} color={primaryColor} />
              </View>
              <Text style={styles.featureText}>
                {t("onboarding.feature1")}
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: `${primaryColor}15` },
                ]}
              >
                <Ionicons name="search" size={24} color={primaryColor} />
              </View>
              <Text style={styles.featureText}>
                {t("onboarding.feature2")}
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: `${primaryColor}15` },
                ]}
              >
                <Ionicons name="sparkles" size={24} color={primaryColor} />
              </View>
              <Text style={styles.featureText}>
                {t("onboarding.feature3")}
              </Text>
            </View>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: primaryColor }]}
            onPress={() => setStep("allergies")}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {t("onboarding.getStarted")}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep("welcome")}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("onboarding.allergyTitle")}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Section */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={primaryColor} />
          <Text style={styles.infoText}>{t("onboarding.allergyInfo")}</Text>
        </View>

        {/* Common Allergies Section */}
        <Text style={styles.sectionTitle}>
          {t("onboarding.commonAllergies")}
        </Text>
        <View style={styles.allergiesGrid}>
          {COMMON_ALLERGIES.map((allergy) => {
            const isSelected = selectedAllergies.includes(allergy.id);
            return (
              <TouchableOpacity
                key={allergy.id}
                style={[
                  styles.allergyChip,
                  isSelected && {
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                  },
                ]}
                onPress={() => toggleAllergy(allergy.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={allergy.icon as any}
                  size={20}
                  color={isSelected ? "#FFF" : "#666"}
                />
                <Text
                  style={[
                    styles.allergyChipText,
                    isSelected && { color: "#FFF", fontWeight: "600" },
                  ]}
                >
                  {allergy.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom Allergies Section */}
        <Text style={styles.sectionTitle}>{t("onboarding.otherAllergies")}</Text>
        <View style={styles.customInputContainer}>
          <TextInput
            style={styles.customInput}
            placeholder={t("onboarding.customPlaceholder")}
            placeholderTextColor="#999"
            value={customAllergy}
            onChangeText={setCustomAllergy}
            onSubmitEditing={addCustomAllergy}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: primaryColor }]}
            onPress={addCustomAllergy}
            disabled={!customAllergy.trim()}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Custom Allergies List */}
        {customAllergies.length > 0 && (
          <View style={styles.customAllergiesList}>
            {customAllergies.map((allergy, index) => (
              <View key={index} style={styles.customAllergyTag}>
                <Text style={styles.customAllergyText}>{allergy}</Text>
                <TouchableOpacity
                  onPress={() => removeCustomAllergy(allergy)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Summary */}
        {(selectedAllergies.length > 0 || customAllergies.length > 0) && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              {t("onboarding.selectedCount", {
                count: selectedAllergies.length + customAllergies.length,
              })}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={loading}
        >
          <Text style={styles.skipButtonText}>{t("onboarding.skip")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: primaryColor },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>
                {t("onboarding.continue")}
              </Text>
              <Ionicons name="checkmark" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        onConfirm={alertConfig.onConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  scrollView: {
    flex: 1,
  },
  welcomeContent: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  welcomeIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    width: "100%",
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  scrollContent: {
    padding: 24,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1976D2",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  allergiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  allergyChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    backgroundColor: "#FFF",
    gap: 8,
  },
  allergyChipText: {
    fontSize: 14,
    color: "#666",
  },
  customInputContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  customInput: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1A1A1A",
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  customAllergiesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  customAllergyTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 16,
    gap: 6,
  },
  customAllergyText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  summaryTitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  bottomActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  continueButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
