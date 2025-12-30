import OrderService from "@/services/order.service";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface OrderUpdate {
  orderId: string;
  shippingLogId: string;
  customerName: string;
  address: string;
  currentStatus?: string; // Current status of the order
  status: "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED";
  note?: string;
  unexpectedCase?: string;
  photos: string[];
}

const statusOptions = [
  {
    value: "OUT_FOR_DELIVERY",
    label: "Đang giao",
    icon: "bicycle",
    color: "#66BB6A",
    description: "Đã đến gần địa chỉ",
  },
  {
    value: "DELIVERED",
    label: "Đã giao",
    icon: "checkmark-done",
    color: "#4CAF50",
    description: "Giao hàng thành công",
    requiresPhotos: true,
  },
  {
    value: "FAILED",
    label: "Thất bại",
    icon: "close-circle",
    color: "#EF5350",
    description: "Không giao được",
    requiresReason: true,
  },
];

export default function UpdateBatchBulkScreen() {
  const { batchCode, orders: ordersParam, batchStatus } = useLocalSearchParams<{
    batchCode: string;
    orders: string;
    batchStatus?: string;
  }>();

  const [orders, setOrders] = useState<OrderUpdate[]>([]);
  const [commonStatus, setCommonStatus] = useState<string>("DELIVERED");
  const [commonNote, setCommonNote] = useState("");
  const [commonPhotos, setCommonPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [disabledStatuses, setDisabledStatuses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (ordersParam) {
      try {
        const parsed = JSON.parse(ordersParam);
        const initialOrders = parsed.map((o: any) => ({
          orderId: o.orderId,
          shippingLogId: o.shippingLogId,
          customerName: o.customerName,
          address: o.address,
          currentStatus: o.currentStatus,
          status: "DELIVERED" as const,
          note: "",
          unexpectedCase: "",
          photos: [],
        }));
        setOrders(initialOrders);

        // Collect all unique current statuses to disable them
        const currentStatuses = new Set<string>(
          parsed
            .map((o: any) => o.currentStatus as string)
            .filter((status: string) => status)
        );
        setDisabledStatuses(currentStatuses);
      } catch (error) {
        console.error("Error parsing orders:", error);
        Alert.alert("Lỗi", "Không thể tải thông tin đơn hàng");
      }
    }
  }, [ordersParam]);

  const pickImages = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Lỗi", "Cần cấp quyền truy cập thư viện ảnh");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
      });

      if (!result.canceled) {
        const newPhotos = result.assets.map((asset) => asset.uri);
        if (commonPhotos.length + newPhotos.length > 10) {
          Alert.alert("Thông báo", "Tối đa 10 ảnh");
          return;
        }
        setCommonPhotos([...commonPhotos, ...newPhotos]);
      }
    } catch (error) {
      console.error("Error picking images:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Lỗi", "Cần cấp quyền truy cập camera");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
      });

      if (!result.canceled) {
        if (commonPhotos.length >= 10) {
          Alert.alert("Thông báo", "Tối đa 10 ảnh");
          return;
        }
        setCommonPhotos([...commonPhotos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Lỗi", "Không thể chụp ảnh");
    }
  };

  const removePhoto = (index: number) => {
    setCommonPhotos(commonPhotos.filter((_, i) => i !== index));
  };

  const applyCommonStatus = () => {
    setOrders(
      orders.map((order) => ({
        ...order,
        status: commonStatus as any,
        note: commonNote,
        photos: [...commonPhotos],
      }))
    );
    Alert.alert(
      "Thành công",
      `Đã áp dụng status "${commonStatus}" cho ${orders.length} đơn`
    );
  };

  const handleSubmit = async () => {
    // Validation
    const selectedStatusOption = statusOptions.find(
      (s) => s.value === commonStatus
    );

    if (selectedStatusOption?.requiresPhotos && commonPhotos.length === 0) {
      Alert.alert(
        "Thông báo",
        "Vui lòng chụp ít nhất 1 ảnh bằng chứng cho đơn DELIVERED"
      );
      return;
    }

    if (selectedStatusOption?.requiresReason && !commonNote.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập lý do không giao được");
      return;
    }

    Alert.alert(
      "Xác nhận",
      `Cập nhật ${orders.length} đơn hàng với status "${selectedStatusOption?.label}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              setSubmitting(true);

              // Upload photos first if needed (for DELIVERED status)
              let photoUrls: string[] = [];
              if (commonPhotos.length > 0 && commonStatus === "DELIVERED") {
                console.log("📤 Uploading photos...");
                try {
                  // Convert URIs to proper format for upload
                  const pictures = commonPhotos.map((uri, index) => ({
                    uri,
                    name: `delivery-proof-${Date.now()}-${index}.jpg`,
                    type: "image/jpeg",
                  }));

                  const uploadResult = await OrderService.uploadBatchPhotos(
                    batchCode,
                    pictures
                  );
                  photoUrls = uploadResult.urls;
                  console.log("✅ Photos uploaded:", photoUrls);
                } catch (uploadError) {
                  console.error("❌ Photo upload failed:", uploadError);
                  Alert.alert("Lỗi", "Không thể upload ảnh. Vui lòng thử lại.");
                  setSubmitting(false);
                  return;
                }
              }

              // Prepare bulk update data according to API spec
              const updates = orders.map((order) => {
                const update: any = {
                  orderId: order.orderId,
                  status: commonStatus,
                };

                // Add note if provided (for all statuses)
                if (commonNote.trim()) {
                  update.note = commonNote;
                }

                // Add finishedPictures for DELIVERED status
                if (commonStatus === "DELIVERED" && photoUrls.length > 0) {
                  update.finishedPictures = photoUrls;
                }

                // Add unexpectedCase for FAILED status
                if (commonStatus === "FAILED" && commonNote.trim()) {
                  update.unexpectedCase = commonNote;
                }

                return update;
              });

              console.log("📦 Bulk update request:", { updates });

              // Call bulk update API
              await OrderService.updateBatchOrdersBulk(batchCode, updates);

              Alert.alert("Thành công", "Đã cập nhật tất cả đơn hàng", [
                {
                  text: "OK",
                  onPress: () => {
                    router.back();
                  },
                },
              ]);
            } catch (error: any) {
              console.error("Error bulk updating:", error);
              Alert.alert(
                "Lỗi",
                error.message || "Không thể cập nhật đơn hàng"
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const renderOrderItem = ({ item }: { item: OrderUpdate }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Ionicons name="cube" size={20} color="#2196F3" />
        <Text style={styles.orderCustomer}>{item.customerName}</Text>
      </View>
      <Text style={styles.orderAddress} numberOfLines={2}>
        {item.address}
      </Text>
      <View
        style={[
          styles.orderStatus,
          {
            backgroundColor:
              statusOptions.find((s) => s.value === item.status)?.color ||
              "#999",
          },
        ]}
      >
        <Text style={styles.orderStatusText}>
          {statusOptions.find((s) => s.value === item.status)?.label}
        </Text>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Cập nhật hàng loạt</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Batch Info */}
        <View style={styles.infoCard}>
          <Ionicons name="layers" size={24} color="#2196F3" />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>Batch Code</Text>
            <Text style={styles.infoValue}>{batchCode}</Text>
          </View>
          <View style={styles.orderCountBadge}>
            <Text style={styles.orderCountText}>{orders.length} đơn</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Ionicons name="information-circle" size={20} color="#FF9800" />
          <Text style={styles.instructionText}>
            Chọn status chung và upload ảnh bằng chứng một lần cho tất cả đơn
            hàng
          </Text>
        </View>

        {/* Common Status Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn trạng thái chung</Text>
          <View style={styles.statusGrid}>
            {statusOptions.map((option) => {
              const isDisabled = disabledStatuses.has(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusCard,
                    commonStatus === option.value && styles.statusCardActive,
                    { borderColor: option.color },
                    isDisabled && styles.statusCardDisabled,
                  ]}
                  onPress={() => {
                    if (!isDisabled) {
                      setCommonStatus(option.value);
                    }
                  }}
                  disabled={isDisabled}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={32}
                    color={
                      isDisabled
                        ? "#ccc"
                        : commonStatus === option.value
                        ? option.color
                        : "#999"
                    }
                  />
                  <Text
                    style={[
                      styles.statusLabel,
                      isDisabled && styles.statusLabelDisabled,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.statusDescription,
                      isDisabled && styles.statusDescriptionDisabled,
                    ]}
                  >
                    {option.description}
                  </Text>
                  {isDisabled && (
                    <Text style={styles.statusDisabledBadge}>
                      Đang ở trạng thái này
                    </Text>
                  )}
                  {!isDisabled && option.requiresPhotos && (
                    <Text style={styles.statusRequirement}>Cần ảnh</Text>
                  )}
                  {!isDisabled && option.requiresReason && (
                    <Text style={styles.statusRequirement}>Cần lý do</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Common Photos */}
        {(commonStatus === "DELIVERED" || commonPhotos.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Ảnh bằng chứng chung (Tối đa 10)
            </Text>
            <Text style={styles.photoCount}>
              Đã chọn: {commonPhotos.length}/10
            </Text>

            {/* Photo Grid */}
            <View style={styles.photoGrid}>
              {commonPhotos.map((uri, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF5350" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Upload Buttons */}
            {commonPhotos.length < 10 && (
              <View style={styles.uploadButtons}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.uploadButtonText}>Chụp ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.uploadButton, styles.galleryButton]}
                  onPress={pickImages}
                >
                  <Ionicons name="images" size={20} color="#fff" />
                  <Text style={styles.uploadButtonText}>Thư viện</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Common Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Ghi chú chung {commonStatus === "FAILED" && "(Bắt buộc)"}
          </Text>
          <TextInput
            style={styles.noteInput}
            placeholder={
              commonStatus === "FAILED"
                ? "Nhập lý do không giao được..."
                : "Nhập ghi chú chung..."
            }
            placeholderTextColor="#999"
            value={commonNote}
            onChangeText={setCommonNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Apply Button */}
        <TouchableOpacity
          style={styles.applyButton}
          onPress={applyCommonStatus}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.applyButtonText}>
            Áp dụng cho {orders.length} đơn
          </Text>
        </TouchableOpacity>

        {/* Orders List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh sách đơn hàng</Text>
          <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.orderId}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                Cập nhật {orders.length} đơn
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#E3F2FD",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  orderCountBadge: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  orderCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  instructionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF3E0",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: "#F57C00",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statusCard: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  statusCardActive: {
    backgroundColor: "#f5f5f5",
  },
  statusCardDisabled: {
    opacity: 0.4,
    backgroundColor: "#f9f9f9",
    borderColor: "#ccc",
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
  },
  statusLabelDisabled: {
    color: "#999",
  },
  statusDescription: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  statusDescriptionDisabled: {
    color: "#aaa",
  },
  statusRequirement: {
    fontSize: 10,
    color: "#FF9800",
    marginTop: 4,
    fontWeight: "600",
  },
  statusDisabledBadge: {
    fontSize: 10,
    color: "#EF5350",
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center",
  },
  photoCount: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  removePhotoButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  uploadButtons: {
    flexDirection: "row",
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    borderRadius: 8,
  },
  galleryButton: {
    backgroundColor: "#9C27B0",
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  noteInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 80,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF9800",
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  orderItem: {
    paddingVertical: 12,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  orderCustomer: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  orderAddress: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  orderStatus: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
