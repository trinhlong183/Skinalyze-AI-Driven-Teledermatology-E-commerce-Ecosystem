import OrderService from "@/services/order.service";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  description: string;
  icon: string;
  color: string;
}

const ALL_STATUS_OPTIONS: StatusOption[] = [
  {
    value: "PENDING",
    label: "Chờ xử lý",
    description: "Đơn hàng đang chờ được xử lý",
    icon: "time-outline",
    color: "#9E9E9E",
  },
  {
    value: "PICKED_UP",
    label: "Đã lấy hàng",
    description: "Đã nhận hàng từ kho/cửa hàng",
    icon: "checkmark-circle",
    color: "#AB47BC",
  },
  {
    value: "IN_TRANSIT",
    label: "Đang vận chuyển",
    description: "Đang trên đường giao hàng",
    icon: "navigate",
    color: "#9C27B0",
  },
  {
    value: "OUT_FOR_DELIVERY",
    label: "Đang giao hàng",
    description: "Đã đến gần địa chỉ giao hàng",
    icon: "bicycle",
    color: "#66BB6A",
  },
  {
    value: "DELIVERED",
    label: "Đã giao hàng",
    description: "Giao hàng thành công",
    icon: "checkmark-done-circle",
    color: "#4CAF50",
  },
  {
    value: "FAILED",
    label: "Giao thất bại",
    description: "Không thể giao hàng",
    icon: "close-circle",
    color: "#EF5350",
  },
  {
    value: "RETURNED",
    label: "Đã trả lại",
    description: "Đã trả hàng về kho",
    icon: "return-up-back",
    color: "#FF6F00",
  },
];

// Function to get available status options based on current status
const getAvailableStatusOptions = (currentStatus?: string): StatusOption[] => {
  // Normalize current status to uppercase
  const normalizedStatus = currentStatus?.toUpperCase() as StatusType | undefined;

  switch (normalizedStatus) {
    case "PENDING":
      // PENDING can go to any status
      return ALL_STATUS_OPTIONS;

    case "PICKED_UP":
      // Hide PENDING
      return ALL_STATUS_OPTIONS.filter((s) => s.value !== "PENDING");

    case "IN_TRANSIT":
      // Hide PENDING and PICKED_UP
      return ALL_STATUS_OPTIONS.filter(
        (s) => s.value !== "PENDING" && s.value !== "PICKED_UP"
      );

    case "OUT_FOR_DELIVERY":
      // Only show OUT_FOR_DELIVERY, DELIVERED, FAILED, RETURNED
      return ALL_STATUS_OPTIONS.filter((s) =>
        ["OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"].includes(s.value)
      );

    case "DELIVERED":
      // Only show DELIVERED (cannot change anymore)
      return ALL_STATUS_OPTIONS.filter((s) => s.value === "DELIVERED");

    case "FAILED":
    case "RETURNED":
      // Only allow FAILED or RETURNED
      return ALL_STATUS_OPTIONS.filter((s) =>
        ["FAILED", "RETURNED"].includes(s.value)
      );

    default:
      // If no current status or unknown status, show all options
      return ALL_STATUS_OPTIONS;
  }
};

export default function UpdateStatusScreen() {
  const { id, currentStatus } = useLocalSearchParams<{
    id: string;
    currentStatus?: string;
  }>();
  const [selectedStatus, setSelectedStatus] = useState<StatusType | null>(null);
  const [note, setNote] = useState("");
  const [unexpectedCase, setUnexpectedCase] = useState("");
  const [updating, setUpdating] = useState(false);

  // Get available status options based on current status
  const availableStatusOptions = getAvailableStatusOptions(currentStatus);

  const handleUpdateStatus = async () => {
    if (!selectedStatus) {
      Alert.alert("Lỗi", "Vui lòng chọn trạng thái");
      return;
    }

    if (selectedStatus === "FAILED" && !unexpectedCase.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do giao thất bại");
      return;
    }

    try {
      setUpdating(true);

      const data: any = {};
      if (note.trim()) {
        data.note = note.trim();
      }
      if (unexpectedCase.trim()) {
        data.unexpectedCase = unexpectedCase.trim();
      }

      await OrderService.updateShippingStatus(id, selectedStatus, data);

      Alert.alert("Thành công", "Đã cập nhật trạng thái đơn hàng", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Error updating status:", error);
      Alert.alert("Lỗi", error.message || "Không thể cập nhật trạng thái");
    } finally {
      setUpdating(false);
    }
  };

  const renderStatusOption = (option: StatusOption) => {
    const isSelected = selectedStatus === option.value;

    return (
      <TouchableOpacity
        key={option.value}
        style={[styles.statusCard, isSelected && styles.statusCardSelected]}
        onPress={() => setSelectedStatus(option.value)}
      >
        <View
          style={[
            styles.statusIcon,
            { backgroundColor: option.color + "20" },
            isSelected && { backgroundColor: option.color },
          ]}
        >
          <Ionicons
            name={option.icon as any}
            size={28}
            color={isSelected ? "#fff" : option.color}
          />
        </View>

        <View style={styles.statusInfo}>
          <Text
            style={[
              styles.statusLabel,
              isSelected && styles.statusLabelSelected,
            ]}
          >
            {option.label}
          </Text>
          <Text style={styles.statusDescription}>{option.description}</Text>
        </View>

        {isSelected && (
          <Ionicons name="radio-button-on" size={24} color={option.color} />
        )}
      </TouchableOpacity>
    );
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
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Current Status */}
        {currentStatus && (
          <View style={styles.currentStatusCard}>
            <Text style={styles.currentStatusLabel}>Trạng thái hiện tại:</Text>
            <Text style={styles.currentStatusValue}>{currentStatus}</Text>
          </View>
        )}

        {/* Status Options */}
        <Text style={styles.sectionTitle}>Chọn trạng thái mới:</Text>
        {availableStatusOptions.map(renderStatusOption)}

        {/* Note Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            Ghi chú <Text style={styles.optional}>(Tùy chọn)</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Thêm ghi chú về tình trạng đơn hàng..."
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Unexpected Case Input (for FAILED status) */}
        {selectedStatus === "FAILED" && (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              Lý do giao thất bại <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Nhập lý do không thể giao hàng..."
              value={unexpectedCase}
              onChangeText={setUnexpectedCase}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Update Button */}
        <TouchableOpacity
          style={[
            styles.updateButton,
            !selectedStatus && styles.updateButtonDisabled,
          ]}
          onPress={handleUpdateStatus}
          disabled={!selectedStatus || updating}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  currentStatusCard: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  currentStatusLabel: {
    fontSize: 13,
    color: "#1976D2",
    marginBottom: 4,
  },
  currentStatusValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1976D2",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
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
    borderColor: "#4CAF50",
    backgroundColor: "#F1F8E9",
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  statusLabelSelected: {
    color: "#2E7D32",
  },
  statusDescription: {
    fontSize: 13,
    color: "#666",
  },
  inputSection: {
    marginTop: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  optional: {
    fontSize: 12,
    color: "#999",
    fontWeight: "400",
  },
  required: {
    fontSize: 12,
    color: "#EF5350",
    fontWeight: "400",
  },
  textArea: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minHeight: 80,
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
