import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from "react-i18next";
import { useWalletTransactions } from "@/hooks/useWalletTransactions";
import { WalletTransaction } from "@/services/paymentService";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FilterStatus =
  | "all"
  | "pending"
  | "completed"
  | "failed"
  | "expired"
  | "refunded";

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>("all");

  const {
    transactions = [],
    loading,
    error,
    total,
    currentPage,
    totalPages,
    refetch,
    fetchMore,
    hasMore,
  } = useWalletTransactions({
    page: 1,
    limit: 15,
    status: selectedFilter === "all" ? undefined : selectedFilter,
    autoFetch: true,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Refetch when filter changes
  useEffect(() => {
    refetch();
  }, [selectedFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      await fetchMore();
      setLoadingMore(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#FF9500";
      case "completed":
        return "#34C759";
      case "failed":
        return "#FF3B30";
      case "expired":
        return "#8E8E93";
      case "refunded":
        return "#007AFF";
      default:
        return "#8E8E93";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "time-outline";
      case "completed":
        return "checkmark-circle";
      case "failed":
        return "close-circle";
      case "expired":
        return "ban-outline";
      case "refunded":
        return "arrow-undo-circle";
      default:
        return "help-circle-outline";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "topup":
        return "arrow-down-circle";
      case "withdraw":
        return "arrow-up-circle";
      default:
        return "swap-horizontal";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "topup":
        return "#34C759";
      case "withdraw":
        return "#FF9500";
      default:
        return "#666";
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

  const formatAmount = (amount: string | number) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return numAmount.toLocaleString("vi-VN");
  };

  const filters: { label: string; value: FilterStatus }[] = [
    { label: t("paymentHistory.filters.all"), value: "all" },
    { label: t("paymentHistory.filters.pending"), value: "pending" },
    { label: t("paymentHistory.filters.completed"), value: "completed" },
    { label: t("paymentHistory.filters.failed"), value: "failed" },
    { label: t("paymentHistory.filters.expired"), value: "expired" },
    { label: t("paymentHistory.filters.refunded"), value: "refunded" },
  ];

  const renderFilterButton = (filter: {
    label: string;
    value: FilterStatus;
  }) => {
    const isSelected = selectedFilter === filter.value;
    return (
      <TouchableOpacity
        key={filter.value}
        style={[
          styles.filterButton,
          isSelected && {
            backgroundColor: primaryColor,
            borderColor: primaryColor,
          },
        ]}
        onPress={() => setSelectedFilter(filter.value)}
      >
        <Text
          style={[
            styles.filterButtonText,
            isSelected && styles.filterButtonTextActive,
          ]}
        >
          {filter.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTransactionCard = ({
    item,
  }: {
    item: WalletTransaction;
  }) => {
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);
    const typeIcon = getTypeIcon(item.paymentType);
    const typeColor = getTypeColor(item.paymentType);
    const isTopUp = item.paymentType === "topup";

    // Determine if transaction is successful (completed)
    const isSuccessful = item.status === "completed";
    const isFailed = item.status === "failed" || item.status === "expired" || item.status === "refunded";

    // Amount color and prefix logic
    let amountColor = "#666"; // Default gray
    let amountPrefix = "";

    if (isSuccessful) {
      amountColor = isTopUp ? "#34C759" : "#FF9500"; // Green for top-up, Orange for withdrawal
      amountPrefix = isTopUp ? "+" : "-";
    } else if (isFailed) {
      amountColor = "#999"; // Light gray for failed/expired/refunded
      amountPrefix = ""; // No prefix for failed transactions
    } else {
      // Pending
      amountColor = "#FF9500"; // Orange for pending
      amountPrefix = isTopUp ? "+" : "-";
    }

    return (
      <View style={styles.transactionCard}>
        {/* Icon and Type */}
        <View style={styles.cardLeft}>
          <View style={[styles.iconContainer, { backgroundColor: typeColor }]}>
            <Ionicons name={typeIcon as any} size={24} color="#FFF" />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionType}>
              {t(`paymentHistory.types.${item.paymentType}`)}
            </Text>
            <Text style={styles.paymentCode}>{item.paymentCode}</Text>
            <Text style={styles.transactionDate}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>

        {/* Amount and Status */}
        <View style={styles.cardRight}>
          <Text
            style={[
              styles.amount,
              { color: amountColor },
            ]}
          >
            {amountPrefix}
            {formatAmount(item.amount)} đ
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={statusIcon as any} size={14} color="#FFF" />
            <Text style={styles.statusText}>
              {t(`paymentHistory.status.${item.status}`)}
            </Text>
          </View>
          {item.paidAt && (
            <Text style={styles.paidDate}>
              {t("paymentHistory.paidAt")}: {formatDate(item.paidAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wallet-outline" size={64} color="#CCC" />
      <Text style={styles.emptyTitle}>{t("paymentHistory.empty")}</Text>
      <Text style={styles.emptyDesc}>{t("paymentHistory.emptyDesc")}</Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={primaryColor} />
        <Text style={styles.footerLoaderText}>
          {t("paymentHistory.loadingMore")}
        </Text>
      </View>
    );
  };

  if (loading && !refreshing && transactions.length === 0) {
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
            {t("paymentHistory.title")} 
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>{t("paymentHistory.loading")}</Text>
        </View>
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
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("paymentHistory.title")}</Text>
        <TouchableOpacity style={styles.backButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            {t("paymentHistory.totalTransactions")}
          </Text>
          <Text style={[styles.summaryValue, { color: primaryColor }]}>
            {total}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            {t("paymentHistory.currentPage")}
          </Text>
          <Text style={[styles.summaryValue, { color: primaryColor }]}>
            {currentPage} / {totalPages}
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          renderItem={({ item }) => renderFilterButton(item)}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: primaryColor }]}
            onPress={refetch}
          >
            <Text style={styles.retryButtonText}>
              {t("paymentHistory.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transactions List */}
      <FlatList
        data={transactions}
        renderItem={renderTransactionCard}
        keyExtractor={(item) => item.paymentId.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading && !error ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primaryColor]}
            tintColor={primaryColor}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
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
  summaryContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#E5E5E5",
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  filtersContainer: {
    backgroundColor: "#FFF",
    paddingVertical: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E5E5",
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    backgroundColor: "#FFF",
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  transactionCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionInfo: {
    flex: 1,
    justifyContent: "center",
  },
  transactionType: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  paymentCode: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: "#999",
  },
  cardRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  amount: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
  },
  paidDate: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
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
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#FF3B30",
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
