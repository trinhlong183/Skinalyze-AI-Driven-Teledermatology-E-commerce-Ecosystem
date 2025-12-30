import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import returnRequestService, {
  ReturnReason,
  CreateReturnRequestDto,
} from "../../services/returnRequestService";
import tokenService from "../../services/tokenService";
import CustomAlert from "../../components/CustomAlert";

const RETURN_REASONS = [
  { value: ReturnReason.DAMAGED, icon: "alert-circle" as const },
  { value: ReturnReason.WRONG_ITEM, icon: "swap-horizontal" as const },
  { value: ReturnReason.DEFECTIVE, icon: "bug" as const },
  { value: ReturnReason.NOT_AS_DESCRIBED, icon: "information-circle" as const },
  { value: ReturnReason.CHANGE_MIND, icon: "reload" as const },
  { value: ReturnReason.OTHER, icon: "ellipsis-horizontal" as const },
];

export default function CreateReturnRequestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();

  const orderId = params.orderId as string;
  const shippingLogId = params.shippingLogId as string;

  const [selectedReason, setSelectedReason] = useState<ReturnReason | null>(
    null
  );
  const [reasonDetail, setReasonDetail] = useState("");
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Alert states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "error" as "success" | "error" | "warning" | "info",
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "error",
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      title,
      message,
      type,
      onConfirm: onConfirm || (() => setAlertVisible(false)),
    });
    setAlertVisible(true);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets) {
        const uris = result.assets.map((asset) => asset.uri);
        setEvidencePhotos([...evidencePhotos, ...uris].slice(0, 5));
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setEvidencePhotos(evidencePhotos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      showAlert(
        t("returnRequest.error"),
        t("returnRequest.selectReasonError"),
        "warning"
      );
      return;
    }

    if (!reasonDetail.trim()) {
      showAlert(
        t("returnRequest.error"),
        t("returnRequest.provideDetailsError"),
        "warning"
      );
      return;
    }

    try {
      setLoading(true);
      const token = await tokenService.getToken();

      if (!token) {
        showAlert(t("returnRequest.error"), t("common.unauthorized"), "error");
        return;
      }

      // Upload evidence photos first if any
      let uploadedPhotoUrls: string[] = [];
      if (evidencePhotos.length > 0) {
        try {
          console.log(
            `📤 Uploading ${evidencePhotos.length} evidence photos...`
          );
          uploadedPhotoUrls = await Promise.all(
            evidencePhotos.map((uri) =>
              returnRequestService.uploadEvidencePhoto(uri)
            )
          );
          console.log("✅ All photos uploaded:", uploadedPhotoUrls);
        } catch (uploadError) {
          console.error("❌ Photo upload failed:", uploadError);
          showAlert(
            t("returnRequest.error"),
            "Failed to upload evidence photos. Please try again.",
            "error"
          );
          return;
        }
      }

      const data: CreateReturnRequestDto = {
        orderId,
        shippingLogId,
        reason: selectedReason,
        reasonDetail: reasonDetail.trim(),
        evidencePhotos:
          uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined,
      };

      await returnRequestService.createReturnRequest(token, data);

      showAlert(
        t("returnRequest.success"),
        t("returnRequest.requestCreated"),
        "success",
        () => {
          setAlertVisible(false);
          router.back();
        }
      );
    } catch (error: any) {
      console.error("❌ Create return request error:", error);
      showAlert(
        t("returnRequest.error"),
        error.response?.data?.message || t("returnRequest.createError"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("returnRequest.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Select Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("returnRequest.selectReason")}
          </Text>
          <View style={styles.reasonGrid}>
            {RETURN_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonCard,
                  selectedReason === reason.value && styles.reasonCardActive,
                ]}
                onPress={() => setSelectedReason(reason.value)}
              >
                <Ionicons
                  name={reason.icon}
                  size={24}
                  color={selectedReason === reason.value ? "#FF6B6B" : "#666"}
                />
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason.value && styles.reasonTextActive,
                  ]}
                >
                  {t(`returnRequest.reasons.${reason.value.toLowerCase()}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reason Detail */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("returnRequest.description")}
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder={t("returnRequest.descriptionPlaceholder")}
            placeholderTextColor="#999"
            value={reasonDetail}
            onChangeText={setReasonDetail}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Evidence Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("returnRequest.evidencePhotos")}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {t("returnRequest.evidencePhotosDesc")}
          </Text>

          <View style={styles.photoGrid}>
            {evidencePhotos.map((uri, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))}

            {evidencePhotos.length < 5 && (
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={handlePickImage}
              >
                <Ionicons name="camera" size={32} color="#999" />
                <Text style={styles.addPhotoText}>
                  {t("returnRequest.addPhoto")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {t("returnRequest.submit")}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* CustomAlert */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={t("common.ok")}
        onConfirm={alertConfig.onConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  reasonCard: {
    width: "48%",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    gap: 8,
  },
  reasonCardActive: {
    borderColor: "#FF6B6B",
    backgroundColor: "#FFF5F5",
  },
  reasonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  reasonTextActive: {
    color: "#FF6B6B",
  },
  textArea: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: "#333",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photoContainer: {
    position: "relative",
    width: 100,
    height: 100,
  },
  photoPreview: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  removePhotoButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addPhotoText: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
