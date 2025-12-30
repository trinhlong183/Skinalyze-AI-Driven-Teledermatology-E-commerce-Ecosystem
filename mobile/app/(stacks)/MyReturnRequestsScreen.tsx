import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import returnRequestService, {
  ReturnRequest,
  ReturnRequestStatus,
  ReturnReason,
} from "../../services/returnRequestService";
import tokenService from "../../services/tokenService";
import CustomAlert from "../../components/CustomAlert";

export default function MyReturnRequestsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Alert states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "error" as "success" | "error" | "warning" | "info",
    confirmText: "OK",
    cancelText: undefined as string | undefined,
    onConfirm: () => {},
    onCancel: undefined as (() => void) | undefined,
  });

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "error",
    options?: {
      confirmText?: string;
      cancelText?: string;
      onConfirm?: () => void;
      onCancel?: () => void;
    }
  ) => {
    setAlertConfig({
      title,
      message,
      type,
      confirmText: options?.confirmText || "OK",
      cancelText: options?.cancelText,
      onConfirm: options?.onConfirm || (() => setAlertVisible(false)),
      onCancel: options?.onCancel,
    });
    setAlertVisible(true);
  };

  const loadReturnRequests = async () => {
    try {
      const token = await tokenService.getToken();
      if (!token) return;

      const data = await returnRequestService.getMyReturnRequests(token);
      setRequests(data);
    } catch (error) {
      console.error("Load return requests error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReturnRequests();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadReturnRequests();
  };

  const handleCancelRequest = async (returnRequestId: string) => {
    showAlert(
      t("returnRequest.cancelTitle"),
      t("returnRequest.cancelConfirm"),
      "warning",
      {
        cancelText: t("common.no"),
        confirmText: t("common.yes"),
        onCancel: () => setAlertVisible(false),
        onConfirm: async () => {
          setAlertVisible(false);
          try {
            const token = await tokenService.getToken();
            if (!token) return;

            await returnRequestService.cancelReturnRequest(
              token,
              returnRequestId
            );
            showAlert(
              t("returnRequest.success"),
              t("returnRequest.cancelSuccess"),
              "success"
            );
            loadReturnRequests();
          } catch (error: any) {
            showAlert(
              t("returnRequest.error"),
              error.response?.data?.message || t("returnRequest.cancelError"),
              "error"
            );
          }
        },
      }
    );
  };

  const getStatusColor = (status: ReturnRequestStatus) => {
    switch (status) {
      case ReturnRequestStatus.PENDING:
        return "#FFA726";
      case ReturnRequestStatus.APPROVED:
        return "#42A5F5";
      case ReturnRequestStatus.IN_PROGRESS:
        return "#7E57C2";
      case ReturnRequestStatus.COMPLETED:
        return "#66BB6A";
      case ReturnRequestStatus.REJECTED:
        return "#EF5350";
      case ReturnRequestStatus.CANCELLED:
        return "#9E9E9E";
      default:
        return "#999";
    }
  };

  const getStatusIcon = (status: ReturnRequestStatus) => {
    switch (status) {
      case ReturnRequestStatus.PENDING:
        return "time-outline";
      case ReturnRequestStatus.APPROVED:
        return "checkmark-circle-outline";
      case ReturnRequestStatus.IN_PROGRESS:
        return "sync-outline";
      case ReturnRequestStatus.COMPLETED:
        return "checkmark-done-circle-outline";
      case ReturnRequestStatus.REJECTED:
        return "close-circle-outline";
      case ReturnRequestStatus.CANCELLED:
        return "ban-outline";
      default:
        return "help-circle-outline";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderRequestCard = (request: ReturnRequest) => {
    const statusColor = getStatusColor(request.status);
    const statusIcon = getStatusIcon(request.status);
    const canCancel = request.status === ReturnRequestStatus.PENDING;

    return (
      <View key={request.returnRequestId} style={styles.requestCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.statusBadgeContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColor}15` },
              ]}
            >
              <Ionicons
                name={statusIcon as any}
                size={16}
                color={statusColor}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {t(`returnRequest.status.${request.status.toLowerCase()}`)}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDate}>{formatDate(request.createdAt)}</Text>
        </View>

        {/* Order Info */}
        <View style={styles.orderInfo}>
          <Text style={styles.orderLabel}>{t("returnRequest.orderId")}</Text>
          <Text style={styles.orderValue}>
            {request.orderId.substring(0, 8)}...
          </Text>
        </View>

        {/* Reason */}
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>{t("returnRequest.reason")}</Text>
          <Text style={styles.reasonValue}>
            {t(`returnRequest.reasons.${request.reason.toLowerCase()}`)}
          </Text>
          {request.reasonDetail && (
            <Text style={styles.reasonDetail}>{request.reasonDetail}</Text>
          )}
        </View>

        {/* Review Note (if rejected) */}
        {request.status === ReturnRequestStatus.REJECTED &&
          request.reviewNote && (
            <View style={styles.reviewNoteContainer}>
              <Ionicons name="information-circle" size={16} color="#EF5350" />
              <Text style={styles.reviewNoteText}>{request.reviewNote}</Text>
            </View>
          )}

        {/* Actions */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelRequest(request.returnRequestId)}
          >
            <Ionicons name="close-circle-outline" size={18} color="#EF5350" />
            <Text style={styles.cancelButtonText}>
              {t("returnRequest.cancel")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("returnRequest.myRequests")}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>{t("returnRequest.loading")}</Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>{t("returnRequest.myRequests")}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="archive-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>{t("returnRequest.empty")}</Text>
            <Text style={styles.emptyDesc}>{t("returnRequest.emptyDesc")}</Text>
          </View>
        ) : (
          requests.map((request) => renderRequestCard(request))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* CustomAlert */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
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
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadgeContainer: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardDate: {
    fontSize: 12,
    color: "#999",
  },
  orderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  orderLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  orderValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "700",
  },
  reasonContainer: {
    marginTop: 12,
  },
  reasonLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
    marginBottom: 4,
  },
  reasonValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "700",
  },
  reasonDetail: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
    lineHeight: 20,
  },
  reviewNoteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
  },
  reviewNoteText: {
    flex: 1,
    fontSize: 13,
    color: "#EF5350",
    lineHeight: 18,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF5350",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF5350",
  },
});
