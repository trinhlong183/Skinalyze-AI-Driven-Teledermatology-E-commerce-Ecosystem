import orderService from "@/services/order.service";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface BatchOrderItem {
  shippingLogId: string;
  orderId: string;
  batchCode: string;
  status: string;
  order: {
    orderNumber?: string;
    shippingAddress: string;
    customer: {
      user: {
        fullName: string;
        phone: string;
      };
    };
    orderItems: Array<{
      product: {
        productName: string;
        sellingPrice: number;
      };
      quantity: number;
      priceAtTime: string;
    }>;
  };
  note?: string;
  isCodCollected: boolean;
  deliveredDate?: string;
}

const statusConfig = {
  PENDING: { label: "Chờ xử lý", color: "#FFA726", icon: "time" },
  ASSIGNED: { label: "Đã nhận", color: "#42A5F5", icon: "checkmark-circle" },
  PICKED_UP: { label: "Đã lấy hàng", color: "#AB47BC", icon: "cube" },
  IN_TRANSIT: { label: "Đang vận chuyển", color: "#9C27B0", icon: "navigate" },
  OUT_FOR_DELIVERY: { label: "Đang giao", color: "#66BB6A", icon: "bicycle" },
  DELIVERED: { label: "Đã giao", color: "#4CAF50", icon: "checkmark-done" },
  FAILED: { label: "Thất bại", color: "#EF5350", icon: "close-circle" },
  RETURNED: { label: "Đã trả lại", color: "#FF6F00", icon: "return-up-back" },
};

export default function BatchDetailScreen() {
  const { batchCode } = useLocalSearchParams<{ batchCode: string }>();
  const [orders, setOrders] = useState<BatchOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadBatchOrders();
  }, [batchCode]);

  const loadBatchOrders = async () => {
    if (!batchCode) return;

    try {
      setLoading(true);
      const data = await orderService.getBatchOrders(batchCode);
      setOrders(data as any);
    } catch (error) {
      console.error("Error loading batch orders:", error);
      Alert.alert("Lỗi", "Không thể tải chi tiết batch");
    } finally {
      setLoading(false);
    }
  };

  const calculateOrderTotal = (order: BatchOrderItem["order"]) => {
    return order.orderItems.reduce((sum, item) => {
      return sum + parseFloat(item.priceAtTime) * item.quantity;
    }, 0);
  };

  const getTotalAmount = () => {
    return orders.reduce((sum, item) => {
      return sum + calculateOrderTotal(item.order);
    }, 0);
  };

  const getCompletedCount = () => {
    return orders.filter((o) => o.status === "DELIVERED").length;
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const handleBulkUpdate = () => {
    if (selectedOrders.size === 0) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất 1 đơn hàng");
      return;
    }

    const selectedOrdersData = orders
      .filter((o) => selectedOrders.has(o.orderId))
      .map((o) => ({
        orderId: o.orderId,
        shippingLogId: o.shippingLogId,
        customerName: o.order.customer.user.fullName,
        address: o.order.shippingAddress,
        currentStatus: o.status, // Pass current status
      }));

    router.push({
      pathname: "/update-batch-bulk",
      params: {
        batchCode,
        orders: JSON.stringify(selectedOrdersData),
      },
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedOrders(new Set());
  };

  const renderOrderItem = ({ item }: { item: BatchOrderItem }) => {
    const statusInfo =
      statusConfig[item.status as keyof typeof statusConfig] ||
      statusConfig.PENDING;
    const orderTotal = calculateOrderTotal(item.order);

    const isSelected = selectedOrders.has(item.orderId);

    return (
      <TouchableOpacity
        style={[styles.orderItem, isSelected && styles.orderItemSelected]}
        onPress={() => {
          if (selectionMode) {
            toggleOrderSelection(item.orderId);
          } else {
            router.push(`/order-detail?id=${item.shippingLogId}`);
          }
        }}
      >
        {/* Selection Checkbox */}
        {selectionMode && (
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => toggleOrderSelection(item.orderId)}
          >
            <Ionicons
              name={isSelected ? "checkbox" : "square-outline"}
              size={24}
              color={isSelected ? "#2196F3" : "#999"}
            />
          </TouchableOpacity>
        )}

        <View style={styles.orderHeader}>
          <View style={styles.orderTitleRow}>
            <Text style={styles.orderNumber}>
              #{item.order.orderNumber || item.orderId.substring(0, 8)}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusInfo.color },
              ]}
            >
              <Ionicons name={statusInfo.icon as any} size={14} color="#fff" />
              <Text style={styles.statusText}>{statusInfo.label}</Text>
            </View>
          </View>
          <Text style={styles.orderAmount}>
            {orderTotal.toLocaleString("vi-VN")}đ
          </Text>
        </View>

        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.order.customer.user.fullName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.order.customer.user.phone}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={2}>
              {item.order.shippingAddress}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.itemsCount}>
            <Ionicons name="cube-outline" size={14} color="#666" />
            <Text style={styles.itemsCountText}>
              {item.order.orderItems.length} sản phẩm
            </Text>
          </View>
          {item.isCodCollected && (
            <View style={styles.codBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={styles.codBadgeText}>COD đã thu</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {!selectionMode && (
          <View style={styles.actionButtonsRow}>
            {item.status !== "DELIVERED" && item.status !== "FAILED" && (
              <TouchableOpacity
                style={styles.updateStatusButton}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(
                    `/update-batch-order?batchCode=${batchCode}&orderId=${item.orderId}&shippingLogId=${item.shippingLogId}`
                  );
                }}
              >
                <Ionicons name="create" size={16} color="#fff" />
                <Text style={styles.updateStatusText}>Cập nhật</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.viewDetailButton}
              onPress={() =>
                router.push(`/order-detail?id=${item.shippingLogId}`)
              }
            >
              <Text style={styles.viewDetailText}>Xem chi tiết</Text>
              <Ionicons name="chevron-forward" size={16} color="#2196F3" />
            </TouchableOpacity>
          </View>
        )}
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
          onPress={() => {
            if (selectionMode) {
              exitSelectionMode();
            } else {
              router.back();
            }
          }}
          style={styles.backButton}
        >
          <Ionicons
            name={selectionMode ? "close" : "arrow-back"}
            size={24}
            color="#333"
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {selectionMode
              ? `Đã chọn ${selectedOrders.size}`
              : "Chi tiết Batch"}
          </Text>
          <Text style={styles.headerSubtitle}>{batchCode}</Text>
        </View>
        {selectionMode ? (
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={() => {
              if (selectedOrders.size === orders.length) {
                setSelectedOrders(new Set());
              } else {
                setSelectedOrders(new Set(orders.map((o) => o.orderId)));
              }
            }}
          >
            <Text style={styles.selectAllText}>
              {selectedOrders.size === orders.length
                ? "Bỏ chọn"
                : "Chọn tất cả"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="layers" size={24} color="#2196F3" />
              <Text style={styles.summaryLabel}>Tổng đơn</Text>
              <Text style={styles.summaryValue}>{orders.length}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="checkmark-done" size={24} color="#4CAF50" />
              <Text style={styles.summaryLabel}>Đã giao</Text>
              <Text style={styles.summaryValue}>{getCompletedCount()}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="cash" size={24} color="#FF9800" />
              <Text style={styles.summaryLabel}>Tổng tiền</Text>
              <Text style={styles.summaryValue}>
                {Math.round(getTotalAmount() / 1000)}k
              </Text>
            </View>
          </View>
        </View>
      </View>
      {/* Action Buttons */}
      {orders.length > 0 && !selectionMode && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => {
              // Navigate to batch map view with all delivery locations
              const locations = orders.map((o) => ({
                orderId: o.orderId,
                address: o.order.shippingAddress,
                status: o.status,
                customerName: o.order.customer.user.fullName,
              }));
              router.push({
                pathname: "/batch-map",
                params: {
                  batchCode,
                  locations: JSON.stringify(locations),
                },
              });
            }}
          >
            <Ionicons name="map" size={20} color="#fff" />
            <Text style={styles.mapButtonText}>Xem bản đồ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bulkUpdateButton}
            onPress={() => setSelectionMode(true)}
          >
            <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
            <Text style={styles.bulkUpdateButtonText}>Chọn nhiều</Text>
          </TouchableOpacity>

          {getCompletedCount() === orders.length && (
            <TouchableOpacity
              style={styles.completeBatchButton}
              onPress={() => {
                router.push(`/complete-batch?batchCode=${batchCode}`);
              }}
            >
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.completeBatchText}>Hoàn thành Batch</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Orders List */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>
          Danh sách đơn hàng ({orders.length})
        </Text>
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.shippingLogId}
          contentContainerStyle={[
            styles.listContent,
            selectionMode && selectedOrders.size > 0 && { paddingBottom: 100 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Bulk Update Footer - Outside SafeAreaView to overlay */}
      {selectionMode && selectedOrders.size > 0 && (
        <View style={styles.bulkUpdateFooter}>
          <TouchableOpacity
            style={styles.bulkUpdateActionButton}
            onPress={handleBulkUpdate}
          >
            <Ionicons name="sync" size={20} color="#fff" />
            <Text style={styles.bulkUpdateActionText}>
              Cập nhật {selectedOrders.size} đơn
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  summarySection: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#e0e0e0",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
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
    fontSize: 16,
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
  orderAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  orderInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    marginBottom: 8,
  },
  itemsCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemsCountText: {
    fontSize: 12,
    color: "#666",
  },
  codBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4CAF50",
  },
  actionSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    borderRadius: 8,
  },
  mapButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  bulkUpdateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF9800",
    paddingVertical: 12,
    borderRadius: 8,
  },
  bulkUpdateButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  completeBatchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
  },
  completeBatchText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2196F3",
  },
  checkbox: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  orderItemSelected: {
    borderLeftColor: "#2196F3",
    backgroundColor: "#E3F2FD",
  },
  bulkUpdateFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  bulkUpdateActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 12,
  },
  bulkUpdateActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  updateStatusButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#FF9800",
    paddingVertical: 8,
    borderRadius: 8,
  },
  updateStatusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  viewDetailButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#E3F2FD",
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2196F3",
  },
  testUploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1976D2",
    paddingVertical: 12,
    borderRadius: 8,
  },
  testUploadButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
