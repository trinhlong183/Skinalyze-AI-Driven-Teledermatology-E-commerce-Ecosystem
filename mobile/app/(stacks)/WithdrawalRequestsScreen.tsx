import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import userService, { WithdrawalRequest } from "@/services/userService";
import tokenService from "@/services/tokenService";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from "react-i18next";

export default function WithdrawalRequestsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();

  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadWithdrawalRequests();
    }
  }, [isAuthenticated]);

  const loadWithdrawalRequests = async () => {
    try {
      setLoading(true);
      const token = await tokenService.getToken();
      if (!token) return;

      const data = await userService.getWithdrawalRequests(token);
      setRequests(data);
    } catch (error: any) {
      console.error("Error loading withdrawal requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWithdrawalRequests();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#FF9500";
      case "verified":
        return "#007AFF";
      case "approved":
        return "#34C759";
      case "completed":
        return "#34C759";
      case "rejected":
        return "#FF3B30";
      case "cancelled":
        return "#8E8E93";
      default:
        return "#8E8E93";
    }
  };

  const getStatusLabel = (status: string) => {
    const statusKey = `withdrawalRequests.status.${status}`;
    return t(statusKey, { defaultValue: status });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "time-outline";
      case "verified":
        return "checkmark-circle-outline";
      case "approved":
        return "checkmark-done-circle-outline";
      case "completed":
        return "checkmark-done-circle";
      case "rejected":
        return "close-circle-outline";
      case "cancelled":
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

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toLocaleString("vi-VN");
  };

  const renderRequestCard = (request: WithdrawalRequest) => {
    const statusColor = getStatusColor(request.status);
    const statusLabel = getStatusLabel(request.status);
    const statusIcon = getStatusIcon(request.status);

    return (
      <View key={request.requestId} style={styles.requestCard}>
        {/* Header with status */}
        <View style={styles.cardHeader}>
          <View style={styles.statusContainer}>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Ionicons name={statusIcon as any} size={16} color="#FFF" />
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.requestDate}>
            {formatDate(request.createdAt)}
          </Text>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>
            {t("withdrawalRequests.withdrawalAmount")}
          </Text>
          <Text style={[styles.amount, { color: primaryColor }]}>
            {formatAmount(request.amount)} đ
          </Text>
        </View>

        {/* Bank Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color="#666" />
            <Text style={styles.infoLabel}>{t("withdrawalRequests.bank")}</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {request.bankName.toUpperCase()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={16} color="#666" />
            <Text style={styles.infoLabel}>
              {t("withdrawalRequests.accountNumber")}
            </Text>
            <Text style={styles.infoValue}>{request.accountNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.infoLabel}>
              {t("withdrawalRequests.accountHolder")}
            </Text>
            <Text style={styles.infoValue}>
              {request.fullName.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Rejection Reason */}
        {request.rejectionReason && (
          <View style={styles.rejectionBox}>
            <Ionicons name="information-circle" size={20} color="#FF3B30" />
            <Text style={styles.rejectionText}>{request.rejectionReason}</Text>
          </View>
        )}

        {/* Notes */}
        {request.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>
              {t("withdrawalRequests.notes")}
            </Text>
            <Text style={styles.notesText}>{request.notes}</Text>
          </View>
        )}

        {/* Timeline */}
        {(request.verifiedAt || request.approvedAt || request.completedAt) && (
          <View style={styles.timeline}>
            {request.verifiedAt && (
              <View style={styles.timelineItem}>
                <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                <Text style={styles.timelineText}>
                  {t("withdrawalRequests.verified")}{" "}
                  {formatDate(request.verifiedAt)}
                </Text>
              </View>
            )}
            {request.approvedAt && (
              <View style={styles.timelineItem}>
                <Ionicons
                  name="checkmark-done-circle"
                  size={16}
                  color="#34C759"
                />
                <Text style={styles.timelineText}>
                  {t("withdrawalRequests.approved")}{" "}
                  {formatDate(request.approvedAt)}
                </Text>
              </View>
            )}
            {request.completedAt && (
              <View style={styles.timelineItem}>
                <Ionicons name="checkmark-done" size={16} color="#34C759" />
                <Text style={styles.timelineText}>
                  {t("withdrawalRequests.completed")}{" "}
                  {formatDate(request.completedAt)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("withdrawalRequests.title")}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>
            {t("withdrawalRequests.loading")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("withdrawalRequests.title")}</Text>
        <TouchableOpacity style={styles.backButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>
              {t("withdrawalRequests.empty")}
            </Text>
            <Text style={styles.emptyDesc}>
              {t("withdrawalRequests.emptyDesc")}
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map((request) => renderRequestCard(request))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  requestsList: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusContainer: {
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
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  requestDate: {
    fontSize: 12,
    color: "#999",
  },
  amountSection: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  amountLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  amount: {
    fontSize: 28,
    fontWeight: "bold",
  },
  infoSection: {
    paddingTop: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  rejectionText: {
    flex: 1,
    fontSize: 13,
    color: "#FF3B30",
    lineHeight: 18,
  },
  notesBox: {
    backgroundColor: "#F8F8F8",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },
  timeline: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 8,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineText: {
    fontSize: 12,
    color: "#666",
  },
});
