import OrderService from "@/services/order.service";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StatusType =
  | "PENDING"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED";

interface StatusOption {
  value: StatusType;
  label: string;
  icon: string;
  color: string;
  description: string;
  requiresPhotos?: boolean;
  requiresNote?: boolean;
}

const ALL_STATUS_OPTIONS: StatusOption[] = [
  {
    value: "PENDING",
    label: "Chờ xử lý",
    icon: "time-outline",
    color: "#9E9E9E",
    description: "Đơn hàng đang chờ được xử lý",
  },
  {
    value: "PICKED_UP",
    label: "Đã lấy hàng",
    icon: "checkmark-circle",
    color: "#AB47BC",
    description: "Đã nhận hàng từ kho/cửa hàng",
  },
  {
    value: "IN_TRANSIT",
    label: "Đang vận chuyển",
    icon: "navigate",
    color: "#9C27B0",
    description: "Đang trên đường giao hàng",
  },
  {
    value: "OUT_FOR_DELIVERY",
    label: "Đang giao hàng",
    icon: "bicycle",
    color: "#66BB6A",
    description: "Đã đến gần địa chỉ, chuẩn bị giao",
  },
  {
    value: "DELIVERED",
    label: "Đã giao hàng",
    icon: "checkmark-done-circle",
    color: "#4CAF50",
    description: "Giao hàng thành công cho khách",
    requiresPhotos: true,
  },
  {
    value: "FAILED",
    label: "Giao thất bại",
    icon: "close-circle",
    color: "#EF5350",
    description: "Khách không nhận, đổi địa chỉ, v.v.",
    requiresNote: true,
  },
  {
    value: "RETURNED",
    label: "Đã trả lại",
    icon: "return-up-back",
    color: "#FF6F00",
    description: "Đã trả hàng về kho",
  },
];

// Function to get available status options based on current status
const getAvailableStatusOptions = (currentStatus?: string): StatusOption[] => {
  const normalizedStatus = currentStatus?.toUpperCase() as StatusType | undefined;

  switch (normalizedStatus) {
    case "PENDING":
      return ALL_STATUS_OPTIONS;

    case "PICKED_UP":
      return ALL_STATUS_OPTIONS.filter((s) => s.value !== "PENDING");

    case "IN_TRANSIT":
      return ALL_STATUS_OPTIONS.filter(
        (s) => s.value !== "PENDING" && s.value !== "PICKED_UP"
      );

    case "OUT_FOR_DELIVERY":
      return ALL_STATUS_OPTIONS.filter((s) =>
        ["OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"].includes(s.value)
      );

    case "DELIVERED":
      return ALL_STATUS_OPTIONS.filter((s) => s.value === "DELIVERED");

    case "FAILED":
    case "RETURNED":
      return ALL_STATUS_OPTIONS.filter((s) =>
        ["FAILED", "RETURNED"].includes(s.value)
      );

    default:
      return ALL_STATUS_OPTIONS;
  }
};

export default function UpdateBatchOrderScreen() {
  const { batchCode, orderId, shippingLogId, currentStatus } = useLocalSearchParams<{
    batchCode: string;
    orderId: string;
    shippingLogId: string;
    currentStatus?: string;
  }>();

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [note, setNote] = useState("");
  const [unexpectedCase, setUnexpectedCase] = useState("");
  const [pictures, setPictures] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  // Get available status options based on current status
  const availableStatusOptions = getAvailableStatusOptions(currentStatus);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Lỗi", "Cần quyền truy cập thư viện ảnh");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets) {
      const newPictures = result.assets.map((asset) => asset.uri);
      setPictures([...pictures, ...newPictures].slice(0, 5)); // Max 5 photos
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Lỗi", "Cần quyền truy cập camera");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setPictures([...pictures, result.assets[0].uri].slice(0, 5));
    }
  };

  const removePicture = (index: number) => {
    setPictures(pictures.filter((_, i) => i !== index));
  };

  const handleUpdate = async () => {
    if (!selectedStatus) {
      Alert.alert("Lỗi", "Vui lòng chọn trạng thái");
      return;
    }

    const statusOption = availableStatusOptions.find((s) => s.value === selectedStatus);

    if (statusOption?.requiresPhotos && pictures.length === 0) {
      Alert.alert("Lỗi", "Vui lòng chụp ảnh bằng chứng giao hàng");
      return;
    }

    if (statusOption?.requiresNote && !unexpectedCase.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do giao thất bại");
      return;
    }

    try {
      setUpdating(true);

      const updateData: any = {
        note: note.trim() || undefined,
      };

      if (selectedStatus === "FAILED") {
        updateData.unexpectedCase = unexpectedCase.trim();
      }

      if (pictures.length > 0) {
        // TODO: Upload pictures to server first
        updateData.finishedPictures = pictures;
      }

      await OrderService.updateBatchOrderStatus(
        batchCode,
        orderId,
        selectedStatus,
        updateData
      );

      Alert.alert("Thành công", "Đã cập nhật trạng thái đơn hàng", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Error updating order:", error);
      Alert.alert("Lỗi", error.message || "Không thể cập nhật trạng thái");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cập nhật trạng thái</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Order Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Batch Code:</Text>
          <Text style={styles.infoValue}>{batchCode}</Text>
          <Text style={styles.infoLabel}>Order ID:</Text>
          <Text style={styles.infoValue}>{orderId.substring(0, 8)}...</Text>
        </View>

        {/* Status Selection */}
        <Text style={styles.sectionTitle}>Chọn trạng thái</Text>
        {availableStatusOptions.map((status) => (
          <TouchableOpacity
            key={status.value}
            style={[
              styles.statusCard,
              selectedStatus === status.value && styles.statusCardSelected,
            ]}
            onPress={() => setSelectedStatus(status.value)}
          >
            <View
              style={[
                styles.statusIcon,
                { backgroundColor: status.color + "20" },
              ]}
            >
              <Ionicons
                name={status.icon as any}
                size={28}
                color={status.color}
              />
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusLabel}>{status.label}</Text>
              <Text style={styles.statusDescription}>{status.description}</Text>
            </View>
            <View style={styles.radioButton}>
              {selectedStatus === status.value && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
          </TouchableOpacity>
        ))}

        {/* Note Input */}
        <Text style={styles.sectionTitle}>Ghi chú (Tùy chọn)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Nhập ghi chú..."
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          placeholderTextColor="#999"
        />

        {/* Unexpected Case for FAILED */}
        {selectedStatus === "FAILED" && (
          <>
            <Text style={styles.sectionTitle}>Lý do thất bại *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Khách không nhận, đổi địa chỉ, v.v."
              value={unexpectedCase}
              onChangeText={setUnexpectedCase}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </>
        )}

        {/* Photo Upload for DELIVERED */}
        {selectedStatus === "DELIVERED" && (
          <>
            <Text style={styles.sectionTitle}>Ảnh bằng chứng *</Text>
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Ionicons name="camera" size={24} color="#2196F3" />
                <Text style={styles.photoButtonText}>Chụp ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Ionicons name="images" size={24} color="#2196F3" />
                <Text style={styles.photoButtonText}>Thư viện</Text>
              </TouchableOpacity>
            </View>

            {pictures.length > 0 && (
              <View style={styles.picturesGrid}>
                {pictures.map((uri, index) => (
                  <View key={index} style={styles.pictureItem}>
                    <Image source={{ uri }} style={styles.pictureImage} />
                    <TouchableOpacity
                      style={styles.removePictureButton}
                      onPress={() => removePicture(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF5350" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.photoHint}>
              Tối đa 5 ảnh ({pictures.length}/5)
            </Text>
          </>
        )}

        {/* Update Button */}
        <TouchableOpacity
          style={[styles.updateButton, updating && styles.updateButtonDisabled]}
          onPress={handleUpdate}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.updateButtonText}>Cập nhật trạng thái</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    color: "#1976D2",
    fontWeight: "600",
    marginTop: 8,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    marginTop: 8,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  statusCardSelected: {
    borderColor: "#2196F3",
    backgroundColor: "#E3F2FD",
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 12,
    color: "#666",
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2196F3",
  },
  textInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 16,
    textAlignVertical: "top",
  },
  photoButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E3F2FD",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2196F3",
  },
  picturesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  pictureItem: {
    width: "31%",
    aspectRatio: 1,
    position: "relative",
  },
  pictureImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removePictureButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  photoHint: {
    fontSize: 12,
    color: "#666",
    marginBottom: 16,
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  updateButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
