import OrderService from "@/services/order.service";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Batch {
  batchCode: string;
  orderCount: number;
  totalAmount: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  completedCount: number;
  createdAt: string;
  shippingStaffId: string;
  shippingStaff?: {
    fullName: string;
    phone: string;
  };
  orders: Array<{
    shippingLogId: string;
    orderId: string;
    status: string;
    totalAmount: number;
  }>;
}

const statusConfig = {
  PENDING: { label: "Chờ lấy hàng", color: "#FFA726", icon: "time" },
  IN_PROGRESS: { label: "Đang giao", color: "#2196F3", icon: "bicycle" },
  COMPLETED: { label: "Hoàn thành", color: "#4CAF50", icon: "checkmark-done" },
};

export default function MyBatchesScreen() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await OrderService.getAllBatches();

      // Calculate actual batch status from orders
      const batchesWithCorrectStatus = data.map((batch: any) => {
        const orders = batch.orders || [];
        let calculatedStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED" =
          "PENDING";

        // Check if all orders are completed
        const allCompleted = orders.every(
          (order: any) =>
            order.status === "DELIVERED" ||
            order.status === "FAILED" ||
            order.status === "RETURNED"
        );

        // Check if any order is in delivery process
        const anyInProgress = orders.some(
          (order: any) =>
            order.status === "IN_TRANSIT" ||
            order.status === "OUT_FOR_DELIVERY" ||
            order.status === "PICKED_UP" ||
            order.status === "ASSIGNED"
        );

        if (allCompleted && orders.length > 0) {
          calculatedStatus = "COMPLETED";
        } else if (anyInProgress) {
          calculatedStatus = "IN_PROGRESS";
        }

        return {
          ...batch,
          status: calculatedStatus,
        };
      });

      console.log(
        "🔍 Batches with calculated status:",
        batchesWithCorrectStatus.map((b: any) => ({
          batchCode: b.batchCode,
          apiStatus: data.find((d: any) => d.batchCode === b.batchCode)?.status,
          calculatedStatus: b.status,
          orderStatuses: b.orders?.map((o: any) => o.status) || [],
        }))
      );

      setBatches(batchesWithCorrectStatus);
    } catch (error) {
      console.error("Error loading batches:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách batch");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBatches();
    setRefreshing(false);
  };

  const handlePickupBatch = async (batchCode: string, status: string) => {
    // Check if batch is already picked up
    if (status !== "PENDING") {
      Alert.alert("Thông báo", "Batch này đã được bắt đầu giao rồi");
      return;
    }

    Alert.alert("Xác nhận", "Bạn có chắc muốn bắt đầu giao batch này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Bắt đầu",
        onPress: async () => {
          try {
            await OrderService.pickupBatch(batchCode);
            Alert.alert("Thành công", "Đã bắt đầu giao batch", [
              {
                text: "OK",
                onPress: () => {
                  // Navigate to batch detail screen to see the delivery map
                  router.push(`/batch-detail?batchCode=${batchCode}`);
                },
              },
            ]);
          } catch (error: any) {
            const errorMsg = error.message || "Không thể pickup batch";
            Alert.alert("Lỗi", errorMsg);
            // Reload batches in case status changed
            await loadBatches();
          }
        },
      },
    ]);
  };

  const renderBatchItem = ({ item }: { item: Batch }) => {
    const statusInfo = statusConfig[item.status];
    const progress =
      item.orderCount > 0
        ? Math.round((item.completedCount / item.orderCount) * 100)
        : 0;

    return (
      <TouchableOpacity
        style={styles.batchCard}
        onPress={() => router.push(`/batch-detail?batchCode=${item.batchCode}`)}
      >
        <View style={styles.batchHeader}>
          <View style={styles.batchTitleRow}>
            <Ionicons name="layers" size={20} color="#2196F3" />
            <Text style={styles.batchCode}>{item.batchCode}</Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}
          >
            <Ionicons name={statusInfo.icon as any} size={14} color="#fff" />
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
        </View>

        <View style={styles.batchStats}>
          <View style={styles.statItem}>
            <Ionicons name="cube" size={18} color="#666" />
            <Text style={styles.statLabel}>{item.orderCount} đơn</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="checkmark-done" size={18} color="#4CAF50" />
            <Text style={styles.statLabel}>
              {item.completedCount} hoàn thành
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="cash" size={18} color="#FF9800" />
            <Text style={styles.statLabel}>
              {item.totalAmount.toLocaleString("vi-VN")}đ
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>

        {/* Created Date */}
        <Text style={styles.createdDate}>
          Tạo lúc: {new Date(item.createdAt).toLocaleString("vi-VN")}
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {item.status === "PENDING" && (
            <TouchableOpacity
              style={styles.pickupButton}
              onPress={(e) => {
                e.stopPropagation();
                handlePickupBatch(item.batchCode, item.status);
              }}
            >
              <Ionicons name="bicycle" size={18} color="#fff" />
              <Text style={styles.pickupButtonText}>Bắt đầu giao</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() =>
              router.push(`/batch-detail?batchCode=${item.batchCode}`)
            }
          >
            <Text style={styles.viewButtonText}>Xem chi tiết</Text>
            <Ionicons name="chevron-forward" size={18} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
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
        <Text style={styles.headerTitle}>Batch của tôi</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{batches.length}</Text>
            <Text style={styles.summaryLabel}>Tổng batch</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {batches.filter((b) => b.status === "IN_PROGRESS").length}
            </Text>
            <Text style={styles.summaryLabel}>Đang giao</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {batches.filter((b) => b.status === "COMPLETED").length}
            </Text>
            <Text style={styles.summaryLabel}>Hoàn thành</Text>
          </View>
        </View>
      </View>

      {/* Batches List */}
      <FlatList
        data={batches}
        renderItem={renderBatchItem}
        keyExtractor={(item) => item.batchCode}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="layers-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có batch nào</Text>
          </View>
        }
      />
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
  summarySection: {
    padding: 16,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#e0e0e0",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  batchCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  batchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  batchTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  batchCode: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  batchStats: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#e0e0e0",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
    width: 40,
    textAlign: "right",
  },
  createdDate: {
    fontSize: 12,
    color: "#999",
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  pickupButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    borderRadius: 8,
  },
  pickupButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  viewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#E3F2FD",
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2196F3",
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#999",
    marginTop: 16,
  },
});
