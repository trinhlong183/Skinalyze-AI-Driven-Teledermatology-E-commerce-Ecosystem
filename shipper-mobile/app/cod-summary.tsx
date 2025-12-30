import orderService from "@/services/order.service";
import { Order, convertAPIOrderToAppOrder } from "@/types/order";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CODSummaryScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCODOrders();
  }, []);

  const loadCODOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getMyDeliveries();
      const allOrders = response.map(convertAPIOrderToAppOrder);

      // Filter only orders with COD collected
      const codOrders = allOrders.filter((order) => order.isCodCollected);
      setOrders(codOrders);
    } catch (error) {
      console.error("Error loading COD orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCODOrders();
    setRefreshing(false);
  };

  const getTotalCOD = () => {
    return orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  };

  const getTransferredCOD = () => {
    return orders
      .filter((order) => order.isCodTransferred)
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  };

  const getPendingCOD = () => {
    return orders
      .filter((order) => !order.isCodTransferred)
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    return (
      <TouchableOpacity
        style={styles.orderItem}
        onPress={() => router.push(`/order-detail?id=${item.id}`)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderTitleRow}>
            <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
            {item.isCodTransferred ? (
              <View style={styles.transferredBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.transferredText}>Đã chuyển</Text>
              </View>
            ) : (
              <View style={styles.pendingBadge}>
                <Ionicons name="time" size={16} color="#FF9800" />
                <Text style={styles.pendingText}>Chưa chuyển</Text>
              </View>
            )}
          </View>
          <Text style={styles.orderAmount}>
            {(item.totalAmount || 0).toLocaleString("vi-VN")}đ
          </Text>
        </View>

        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={14} color="#666" />
            <Text style={styles.infoText}>{item.customer.name}</Text>
          </View>
          {item.codCollectDate && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={14} color="#666" />
              <Text style={styles.infoText}>
                {new Date(item.codCollectDate).toLocaleDateString("vi-VN")}
              </Text>
            </View>
          )}
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
        <Text style={styles.headerTitle}>Quản lý COD</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <View style={[styles.summaryCard, styles.totalCard]}>
          <View style={styles.summaryIcon}>
            <Ionicons name="cash" size={32} color="#4CAF50" />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Tổng COD</Text>
            <Text style={styles.summaryValue}>
              {getTotalCOD().toLocaleString("vi-VN")}đ
            </Text>
            <Text style={styles.summaryCount}>{orders.length} đơn hàng</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCardSmall, styles.transferredCard]}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.smallCardLabel}>Đã chuyển</Text>
            <Text style={styles.smallCardValue}>
              {getTransferredCOD().toLocaleString("vi-VN")}đ
            </Text>
          </View>

          <View style={[styles.summaryCardSmall, styles.pendingCard]}>
            <Ionicons name="time" size={24} color="#FF9800" />
            <Text style={styles.smallCardLabel}>Chưa chuyển</Text>
            <Text style={styles.smallCardValue}>
              {getPendingCOD().toLocaleString("vi-VN")}đ
            </Text>
          </View>
        </View>
      </View>

      {/* Orders List */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>Chi tiết các đơn hàng</Text>
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có đơn hàng COD nào</Text>
            </View>
          }
        />
      </View>
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
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 13,
    color: "#999",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCardSmall: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transferredCard: {
    borderTopWidth: 3,
    borderTopColor: "#4CAF50",
  },
  pendingCard: {
    borderTopWidth: 3,
    borderTopColor: "#FF9800",
  },
  smallCardLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
  },
  smallCardValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  listSection: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  orderItem: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  orderHeader: {
    marginBottom: 12,
  },
  orderTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  transferredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transferredText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4CAF50",
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FF9800",
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  orderInfo: {
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: "#666",
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
