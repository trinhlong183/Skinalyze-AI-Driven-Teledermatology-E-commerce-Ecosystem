import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState, useContext, useMemo } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

import skinAnalysisService from "@/services/skinAnalysisService";
import { AuthContext } from "@/contexts/AuthContext";
import CustomAlert from "@/components/CustomAlert";
import { useCustomAlert } from "@/hooks/useCustomAlert";
import { useThemeColor, hexToRgba } from "@/hooks/useThemeColor";

export default function ManualSkinAnalysisScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { t } = useTranslation("translation", { keyPrefix: "manualAnalysis" });

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [isPickingImages, setIsPickingImages] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    alertState,
    showAlert,
    handleConfirm: handleAlertConfirm,
    handleCancel: handleAlertCancel,
  } = useCustomAlert();
  const { primaryColor } = useThemeColor();

  const tintedPrimary = useMemo(
    () => hexToRgba(primaryColor, 0.12),
    [primaryColor]
  );
  const borderPrimary = useMemo(
    () => hexToRgba(primaryColor, 0.35),
    [primaryColor]
  );
  const disabledPrimary = useMemo(
    () => hexToRgba(primaryColor, 0.45),
    [primaryColor]
  );

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert({
        title: t("alerts.permissionDenied.title"),
        message: t("alerts.permissionDenied.message"),
        type: "warning",
      });
      return;
    }

    setIsPickingImages(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false, // Do not allow editing to speed up multi-selection
        allowsMultipleSelection: true, // Allow multiple selection
        quality: 0.8,
        selectionLimit: 5, // Limit images to 5
      });

      if (!result.canceled) {
        const newUris = result.assets.map((asset) => asset.uri);
        setImageUris((prev) => [...prev, ...newUris]);
      }
    } catch (error) {
      showAlert({
        title: t("alerts.pickError.title"),
        message: t("alerts.pickError.message"),
        type: "error",
      });
    } finally {
      setIsPickingImages(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImageUris((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (!chiefComplaint.trim()) {
      showAlert({
        title: t("alerts.missing.title"),
        message: t("alerts.missing.mainConcern"),
        type: "warning",
      });
      return;
    }
    if (!symptoms.trim()) {
      showAlert({
        title: t("alerts.missing.title"),
        message: t("alerts.missing.symptoms"),
        type: "warning",
      });
      return;
    }

    if (!user?.userId) return;

    setIsSubmitting(true);
    try {
      // B2: Gọi API tạo Manual Entry
      await skinAnalysisService.createManualEntry({
        chiefComplaint,
        patientSymptoms: symptoms,
        notes,
        imageUris: imageUris,
      });

      // B3: Thành công -> Quay lại
      showAlert({
        title: t("alerts.success.title"),
        message: t("alerts.success.message"),
        type: "success",
        confirmText: t("alerts.success.confirm"),
        onConfirm: () => router.back(),
      });
    } catch (error: any) {
      console.error(error);
      showAlert({
        title: t("alerts.submitFailed.title"),
        message: error?.message || t("alerts.submitFailed.message"),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Pressable
              style={[
                styles.backButton,
                { backgroundColor: tintedPrimary, borderColor: borderPrimary },
              ]}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={22} color={primaryColor} />
              <Text style={[styles.backButtonText, { color: primaryColor }]}>
                {t("actions.back")}
              </Text>
            </Pressable>
          </View>
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>{t("title")}</Text>
            <Text style={styles.subtitle}>{t("subtitle")}</Text>
          </View>

          {/* Card 1: Condition Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("condition.cardTitle")}</Text>

            {/* Chief Complaint */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("condition.mainConcern")}
                <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t("condition.mainConcernPlaceholder")}
                placeholderTextColor="#999"
                value={chiefComplaint}
                onChangeText={setChiefComplaint}
              />
            </View>

            {/* Symptoms */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("condition.symptoms")}
                <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t("condition.symptomsPlaceholder")}
                placeholderTextColor="#999"
                value={symptoms}
                onChangeText={setSymptoms}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("condition.notes")}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t("condition.notesPlaceholder")}
                placeholderTextColor="#999"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/*  Photos */}
          <View style={styles.card}>
            <View style={styles.imageHeaderRow}>
              <Text style={styles.cardTitle}>{t("photos.title")}</Text>
              <Text style={styles.imageCount}>
                {t("photos.count", { current: imageUris.length, total: 5 })}
              </Text>
            </View>
            <Text style={styles.helperText}>{t("photos.helper")}</Text>

            {/* List of Images */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageList}
            >
              {/* Add Photo Button */}
              {imageUris.length < 5 && (
                <Pressable
                  style={[
                    styles.addImageButton,
                    {
                      backgroundColor: tintedPrimary,
                      borderColor: borderPrimary,
                    },
                  ]}
                  onPress={pickImages}
                  disabled={isPickingImages}
                >
                  {isPickingImages ? (
                    <ActivityIndicator color={primaryColor} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={32} color={primaryColor} />
                      <Text
                        style={[styles.addImageText, { color: primaryColor }]}
                      >
                        {t("photos.addButton")}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}

              {/* Render selected photos */}
              {imageUris.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: uri }} style={styles.thumbnail} />
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Footer Button */}
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: primaryColor, shadowColor: primaryColor },
              (isSubmitting || isPickingImages) && {
                backgroundColor: disabledPrimary,
                shadowColor: disabledPrimary,
              },
              (isSubmitting || isPickingImages) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || isPickingImages}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>{t("actions.submit")}</Text>
            )}
          </Pressable>
        </View>

        <CustomAlert
          visible={alertState.visible}
          title={alertState.title}
          message={alertState.message}
          confirmText={alertState.confirmText}
          cancelText={alertState.cancelText}
          type={alertState.type}
          onConfirm={handleAlertConfirm}
          onCancel={alertState.cancelText ? handleAlertCancel : undefined}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5ff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerContainer: {
    marginBottom: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  backButtonText: {
    marginLeft: 4,
    fontSize: 15,
    fontWeight: "600",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    // Shadow
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },
  required: {
    color: "#d9534f",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },

  // Image Section Styles
  imageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  imageCount: {
    fontSize: 14,
    color: "#888",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 16,
  },
  imageList: {
    flexDirection: "row",
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addImageText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  imageWrapper: {
    position: "relative",
    marginRight: 12,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  // Footer Styles
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
    // Fixed at bottom
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.9,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
