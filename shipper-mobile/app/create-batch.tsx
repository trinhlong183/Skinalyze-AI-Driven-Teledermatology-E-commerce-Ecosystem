import OrderService from "@/services/order.service";
import StorageService from "@/services/storage.service";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface BatchOrder {
  shippingLogId: string;
  orderId: string;
  orderNumber: string;
  shippingAddress: string;
  totalAmount: number;
  status: string;
}

export default function CreateBatchScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const [orders, setOrders] = useState<BatchOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadBatchSuggestions();
    loadCurrentUser();
  }, [customerId]);

  const loadCurrentUser = async () => {
    try {
      const user = await StorageService.getUserInfo();
      console.log("Current user:", user);
      if (user && user.userId) {
        setCurrentUserId(user.userId);
      } else {
        console.error("User info missing userId:", user);
      }
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  const loadBatchSuggestions = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      const data = await OrderService.getBatchSuggestions(customerId);

      // Map to simpler structure - handle API response with order nested object
      const mappedOrders: BatchOrder[] = data.map((log: any) => ({
        shippingLogId: log.shippingLogId,
        orderId: log.orderId,
        orderNumber: log.order?.orderNumber || log.orderId.substring(0, 8),
        shippingAddress: log.order?.shippingAddress || "Chưa có địa chỉ",
        totalAmount: log.totalAmount || 0,
        status: log.status,
      }));

      setOrders(mappedOrders);
    } catch (error) {
      console.error("Error loading batch suggestions:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const createBatch = async () => {
    if (selectedOrders.length < 2) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất 2 đơn hàng để tạo batch");
      return;
    }

    if (!currentUserId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng");
      return;
    }

    try {
      setCreating(true);
      const result = await OrderService.createBatchDelivery(
        selectedOrders,
        currentUserId,
        note || "Giao gom 1 lần"
      );

      console.log("Batch creation result:", result);

      // Handle new response structure: { batchCode, orderCount, shippingLogs }
      const batchCode =
        result?.batchCode || result?.shippingLogs?.[0]?.batchCode || "N/A";
      const orderCount =
        result?.orderCount ||
        result?.shippingLogs?.length ||
        selectedOrders.length;

      Alert.alert(
        "Thành công",
        `Đã tạo batch giao hàng!\nMã batch: ${batchCode}\nSố đơn: ${orderCount}`,
        [
          {
            text: "Xem chi tiết",
            onPress: () => {
              router.back();
              router.push(`/batch-detail?batchCode=${batchCode}`);
            },
          },
          {
            text: "Về trang chủ",
            onPress: () => router.back(),
            style: "cancel",
          },
        ]
      );
    } catch (error: any) {
      console.error("Error creating batch:", error);
      Alert.alert("Lỗi", error.message || "Không thể tạo batch");
    } finally {
      setCreating(false);
    }
  };

  const totalAmount = useMemo(() => {
    const total = orders
      .filter((order) => selectedOrders.includes(order.orderId))
      .reduce((sum, order) => {
        const amount = Number(order.totalAmount) || 0;
        return sum + amount;
      }, 0);
    console.log("Selected orders:", selectedOrders);
    console.log(
      "Orders data:",
      orders.filter((o) => selectedOrders.includes(o.orderId))
    );
    console.log("Total amount:", total);
    return total;
  }, [orders, selectedOrders]);

  const renderOrderItem = ({ item }: { item: BatchOrder }) => {
    const isSelected = selectedOrders.includes(item.orderId);

    return (
      <TouchableOpacity
        style={[styles.orderItem, isSelected && styles.orderItemSelected]}
        onPress={() => toggleOrderSelection(item.orderId)}
      >
        <View style={styles.checkbox}>
          {isSelected && (
            <Ionicons name="checkmark" size={20} color="#4CAF50" />
          )}
        </View>

        <View style={styles.orderContent}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
            <Text style={styles.orderAmount}>
              {item.totalAmount.toLocaleString("vi-VN")}đ
            </Text>
          </View>
          <Text style={styles.orderAddress} numberOfLines={2}>
            {item.shippingAddress}
          </Text>
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
        <Text style={styles.headerTitle}>Tạo batch giao hàng</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Chọn các đơn hàng cùng địa chỉ</Text>
        <Text style={styles.infoSubtitle}>
          Giao nhiều đơn cùng lúc để tiết kiệm thời gian
        </Text>
      </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.shippingLogId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              Không có đơn hàng nào phù hợp để tạo batch
            </Text>
          </View>
        }
      />

      {/* Bottom Bar */}
      {orders.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.noteContainer}>
            <TextInput
              style={styles.noteInput}
              placeholder="Ghi chú (tùy chọn)"
              value={note}
              onChangeText={setNote}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>Đã chọn</Text>
              <View style={styles.summaryValueRow}>
                <Text style={styles.summaryCount}>
                  {selectedOrders.length} đơn
                </Text>
                <Text style={styles.summaryDivider}>•</Text>
                <Text style={styles.summaryAmount}>
                  {Math.round(totalAmount).toLocaleString("vi-VN")}đ
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.createButton,
                (selectedOrders.length < 2 || creating) &&
                  styles.createButtonDisabled,
              ]}
              onPress={createBatch}
              disabled={selectedOrders.length < 2 || creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="layers" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Tạo batch</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  infoCard: {
    backgroundColor: "#E3F2FD",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1976D2",
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 13,
    color: "#1976D2",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 200,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  orderItemSelected: {
    borderColor: "#4CAF50",
    backgroundColor: "#F1F8E9",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  orderContent: {
    flex: 1,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  orderAddress: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: "#999",
    marginTop: 16,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  noteContainer: {
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryInfo: {
    flex: 1,
    marginRight: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  summaryValueRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
  },
  summaryCount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  summaryDivider: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginHorizontal: 8,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4CAF50",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
