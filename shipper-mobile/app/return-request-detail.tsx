import orderService from "@/services/order.service";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ReturnStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

interface ReturnRequest {
  returnRequestId: string;
  orderId: string;
  shippingLogId: string;
  customerId: string;
  reason: string;
  reasonDetail: string;
  evidencePhotos: string[];
  status: ReturnStatus;
  reviewedByStaffId?: string;
  reviewedAt?: string;
  reviewNote?: string;
  assignedStaffId?: string;
  assignedAt?: string;
  returnedToWarehouseAt?: string;
  returnCompletionPhotos?: string[];
  completionNote?: string;
  createdAt: string;
  updatedAt: string;
  order?: any;
  shippingLog?: any;
  customer?: any;
  reviewedByStaff?: any;
  assignedStaff?: any;
}

const statusConfig = {
  PENDING: { label: "Chờ duyệt", color: "#FFA726", icon: "time" },
  APPROVED: { label: "Đã duyệt", color: "#42A5F5", icon: "checkmark-circle" },
  REJECTED: { label: "Từ chối", color: "#EF5350", icon: "close-circle" },
  IN_PROGRESS: { label: "Đang xử lý", color: "#AB47BC", icon: "sync" },
  COMPLETED: { label: "Hoàn thành", color: "#4CAF50", icon: "checkmark-done" },
  CANCELLED: { label: "Đã hủy", color: "#9E9E9E", icon: "ban" },
};

const reasonLabels: Record<string, string> = {
  DAMAGED: "Hàng bị hư hỏng",
  WRONG_ITEM: "Giao sai hàng",
  DEFECTIVE: "Hàng lỗi",
  NOT_AS_DESCRIBED: "Không đúng mô tả",
  CHANGE_MIND: "Đổi ý",
  OTHER: "Lý do khác",
};

export default function ReturnRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">(
    "approve"
  );
  const [reviewNote, setReviewNote] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadReturnRequestDetail();
  }, [id]);

  const loadReturnRequestDetail = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await orderService.getReturnRequestDetail(id);
      setReturnRequest(data);
    } catch (error) {
      console.error("Error loading return request detail:", error);
      Alert.alert("Lỗi", "Không thể tải chi tiết yêu cầu trả hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    setReviewAction("approve");
    setReviewNote("");
    setShowReviewModal(true);
  };

  const handleReject = () => {
    setReviewAction("reject");
    setReviewNote("");
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!returnRequest) return;

    try {
      setProcessing(true);
      setShowReviewModal(false);

      if (reviewAction === "approve") {
        await orderService.approveReturnRequest(
          returnRequest.returnRequestId,
          reviewNote
        );
        Alert.alert("Thành công", "Đã duyệt yêu cầu trả hàng", [
          { text: "OK", onPress: () => loadReturnRequestDetail() },
        ]);
      } else {
        await orderService.rejectReturnRequest(
          returnRequest.returnRequestId,
          reviewNote
        );
        Alert.alert("Thành công", "Đã từ chối yêu cầu trả hàng", [
          { text: "OK", onPress: () => loadReturnRequestDetail() },
        ]);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể xử lý yêu cầu");
    } finally {
      setProcessing(false);
    }
  };

  const handleAssign = async () => {
    if (!returnRequest) return;

    Alert.alert("Xác nhận", "Bạn có chắc muốn nhận việc lấy hàng trả về này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận",
        onPress: async () => {
          try {
            setProcessing(true);
            await orderService.assignReturnRequest(
              returnRequest.returnRequestId
            );
            Alert.alert("Thành công", "Đã nhận việc lấy hàng trả về", [
              { text: "OK", onPress: () => loadReturnRequestDetail() },
            ]);
          } catch (error: any) {
            Alert.alert("Lỗi", error.message || "Không thể nhận việc");
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const handleComplete = () => {
    if (!returnRequest) return;
    router.push(`/complete-return?id=${returnRequest.returnRequestId}` as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!returnRequest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF5350" />
          <Text style={styles.errorText}>Không tìm thấy yêu cầu trả hàng</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = statusConfig[returnRequest.status];
  const customerName = returnRequest.customer?.user?.fullName || "N/A";
  const customerPhone = returnRequest.customer?.user?.phone || "N/A";
  const shippingAddress =
    returnRequest.order?.shippingAddress ||
    returnRequest.shippingLog?.note ||
    "Không có thông tin";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chi tiết trả hàng</Text>
          <Text style={styles.headerSubtitle}>
            #{returnRequest.returnRequestId.substring(0, 8)}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusBadgeLarge,
              { backgroundColor: statusInfo.color },
            ]}
          >
            <Ionicons name={statusInfo.icon as any} size={24} color="#fff" />
            <Text style={styles.statusTextLarge}>{statusInfo.label}</Text>
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã đơn:</Text>
              <Text style={styles.infoValue}>
                #{returnRequest.orderId.substring(0, 8)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái đơn:</Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color:
                      returnRequest.order?.status === "DELIVERED"
                        ? "#4CAF50"
                        : "#666",
                  },
                ]}
              >
                {returnRequest.order?.status === "DELIVERED"
                  ? "Đã giao"
                  : returnRequest.order?.status || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-circle" size={16} color="#666" />
              <Text style={styles.infoText}>{customerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={16} color="#666" />
              <Text style={styles.infoText}>{customerPhone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.infoText}>{shippingAddress}</Text>
            </View>
          </View>
        </View>

        {/* Return Reason */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={20} color="#FF9800" />
            <Text style={styles.sectionTitle}>Lý do trả hàng</Text>
          </View>
          <View style={styles.reasonCard}>
            <Text style={styles.reasonTitle}>
              {reasonLabels[returnRequest.reason] || returnRequest.reason}
            </Text>
            {returnRequest.reasonDetail && (
              <Text style={styles.reasonText}>
                {returnRequest.reasonDetail}
              </Text>
            )}
          </View>
        </View>

        {/* Evidence Photos */}
        {returnRequest.evidencePhotos &&
          returnRequest.evidencePhotos.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="images" size={20} color="#4CAF50" />
                <Text style={styles.sectionTitle}>
                  Ảnh chứng minh ({returnRequest.evidencePhotos.length})
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photosContainer}
              >
                {returnRequest.evidencePhotos.map((photo, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.photoWrapper}
                    onPress={() => setSelectedPhoto(photo)}
                  >
                    <Image source={{ uri: photo }} style={styles.photo} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

        {/* Review Info (if reviewed) */}
        {returnRequest.reviewedAt && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-done" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Thông tin duyệt</Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Người duyệt:</Text>
                <Text style={styles.infoValue}>
                  {returnRequest.reviewedByStaff?.fullName || "N/A"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Thời gian:</Text>
                <Text style={styles.infoValue}>
                  {new Date(returnRequest.reviewedAt).toLocaleString("vi-VN")}
                </Text>
              </View>
              {returnRequest.reviewNote && (
                <View style={styles.noteBox}>
                  <Text style={styles.noteLabel}>Ghi chú:</Text>
                  <Text style={styles.noteText}>
                    {returnRequest.reviewNote}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Assignment Info (if assigned) */}
        {returnRequest.assignedAt && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-add" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Thông tin nhận việc</Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Người nhận:</Text>
                <Text style={styles.infoValue}>
                  {returnRequest.assignedStaff?.fullName || "N/A"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Thời gian:</Text>
                <Text style={styles.infoValue}>
                  {new Date(returnRequest.assignedAt).toLocaleString("vi-VN")}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Completion Info (if completed) */}
        {returnRequest.returnedToWarehouseAt && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Thông tin hoàn thành</Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Thời gian về kho:</Text>
                <Text style={styles.infoValue}>
                  {new Date(returnRequest.returnedToWarehouseAt).toLocaleString(
                    "vi-VN"
                  )}
                </Text>
              </View>
              {returnRequest.completionNote && (
                <View style={styles.noteBox}>
                  <Text style={styles.noteLabel}>Ghi chú:</Text>
                  <Text style={styles.noteText}>
                    {returnRequest.completionNote}
                  </Text>
                </View>
              )}
            </View>

            {/* Completion Photos */}
            {returnRequest.returnCompletionPhotos &&
              returnRequest.returnCompletionPhotos.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosContainer}
                  style={{ marginTop: 12 }}
                >
                  {returnRequest.returnCompletionPhotos.map((photo, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.photoWrapper}
                      onPress={() => setSelectedPhoto(photo)}
                    >
                      <Image source={{ uri: photo }} style={styles.photo} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      {returnRequest.status === "PENDING" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            disabled={processing}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Từ chối</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApprove}
            disabled={processing}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Duyệt</Text>
          </TouchableOpacity>
        </View>
      )}

      {returnRequest.status === "APPROVED" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.assignButton]}
            onPress={handleAssign}
            disabled={processing}
          >
            <Ionicons name="bicycle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Nhận việc lấy hàng</Text>
          </TouchableOpacity>
        </View>
      )}

      {returnRequest.status === "IN_PROGRESS" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={handleComplete}
            disabled={processing}
          >
            <Ionicons name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Xác nhận về kho</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {reviewAction === "approve" ? "Duyệt yêu cầu" : "Từ chối yêu cầu"}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập ghi chú (không bắt buộc)"
              value={reviewNote}
              onChangeText={setReviewNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={submitReview}
              >
                <Text style={styles.modalButtonTextConfirm}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.photoViewerOverlay}>
          <TouchableOpacity
            style={styles.photoViewerClose}
            onPress={() => setSelectedPhoto(null)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.photoViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
  headerBack: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  statusBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  statusTextLarge: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  infoCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
    minWidth: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: "#333",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
  },
  reasonCard: {
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  reasonTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F57C00",
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  photosContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  photoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  noteBox: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  noteLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    backgroundColor: "#EF5350",
  },
  assignButton: {
    backgroundColor: "#2196F3",
  },
  completeButton: {
    backgroundColor: "#4CAF50",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 100,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f5f5f5",
  },
  modalButtonConfirm: {
    backgroundColor: "#4CAF50",
  },
  modalButtonTextCancel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  modalButtonTextConfirm: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoViewerClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  photoViewerImage: {
    width: "90%",
    height: "80%",
  },
});
