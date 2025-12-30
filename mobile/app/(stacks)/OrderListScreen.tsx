import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import orderService, { Order, OrderStatus } from "@/services/orderService";
import tokenService from "@/services/tokenService";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from "react-i18next";

export default function OrderListScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "ALL">(
    "ALL"
  );

  const statusFilters: Array<{ key: OrderStatus | "ALL"; label: string }> = [
    { key: "ALL", label: t("orders.all") },
    { key: "PENDING", label: t("orders.pending") },
    { key: "CONFIRMED", label: t("orders.confirmed") },
    { key: "PROCESSING", label: t("orders.processing") },
    { key: "SHIPPING", label: t("orders.shipping") },
    { key: "DELIVERED", label: t("orders.delivered") },
    { key: "COMPLETED", label: t("orders.completed") },
    { key: "CANCELLED", label: t("orders.cancelled") },
    { key: "REJECTED", label: t("orders.rejected") },
  ];

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert(t("orders.loginRequired"), t("orders.loginRequired"));
      return;
    }

    try {
      setLoading(true);
      const token = await tokenService.getToken();
      if (!token) {
        Alert.alert(t("orders.loginRequired"), t("orders.loginRequired"));
        return;
      }
      const data = await orderService.getMyOrders(token);
      setOrders(data);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      Alert.alert(
        t("orders.loadError"),
        error.message || t("orders.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const filteredOrders =
    selectedStatus === "ALL"
      ? orders
      : orders.filter((order) => order.status === selectedStatus);

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={statusFilters}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedStatus === item.key && [
                styles.filterButtonActive,
                { backgroundColor: primaryColor },
              ],
            ]}
            onPress={() => setSelectedStatus(item.key)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedStatus === item.key && styles.filterButtonTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderOrderItem = ({ item }: { item: Order }) => {
    const totalAmount = orderService.calculateOrderTotal(item.orderItems);
    const totalItems = orderService.calculateTotalItems(item.orderItems);
    const firstProduct = item.orderItems[0]?.product;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() =>
          router.push({
            pathname: "/(stacks)/OrderDetailScreen",
            params: { orderId: item.orderId },
          } as any)
        }
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Ionicons name="receipt-outline" size={16} color="#666" />
            <Text style={styles.orderId}>#{item.orderId.slice(0, 8)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  orderService.getStatusColor(item.status) + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: orderService.getStatusColor(item.status) },
              ]}
            >
              {t("orders." + item.status.toLowerCase())}
            </Text>
          </View>
        </View>

        <View style={styles.orderBody}>
          {firstProduct && (
            <View style={styles.productRow}>
              <Image
                source={{ uri: firstProduct.productImages[0] }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {firstProduct.productName}
                </Text>
                <Text style={styles.productBrand}>{firstProduct.brand}</Text>
                <Text style={styles.productQuantity}>
                  x{item.orderItems[0].quantity}
                  {item.orderItems.length > 1 && (
                    <Text style={[styles.moreItems, { color: primaryColor }]}>
                      {" "}
                      +{item.orderItems.length - 1} {t("orders.moreItems")}
                    </Text>
                  )}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.orderFooter}>
            <View style={styles.orderInfoRow}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.orderDate}>
                {orderService.formatDate(item.createdAt)}
              </Text>
            </View>
            <View style={styles.orderInfoRow}>
              <Text style={styles.totalItemsText}>
                {totalItems} {t("orders.items")}
              </Text>
              <Text style={[styles.totalAmountText, { color: primaryColor }]}>
                {orderService.formatCurrency(item.payment.amount)}
              </Text>
            </View>
          </View>

          {/* Shipping Info */}
          {item.shippingLogs && item.shippingLogs.length > 0 && (
            <View style={styles.shippingInfoSection}>
              {item.shippingLogs[0].shippingMethod && (
                <View style={styles.shippingTag}>
                  <Ionicons
                    name={
                      item.shippingLogs[0].shippingMethod === "GHN"
                        ? "cube"
                        : "bicycle"
                    }
                    size={12}
                    color={primaryColor}
                  />
                  <Text
                    style={[styles.shippingTagText, { color: primaryColor }]}
                  >
                    {item.shippingLogs[0].shippingMethod === "GHN"
                      ? "GHN"
                      : "Nội bộ"}
                  </Text>
                </View>
              )}
              {item.shippingLogs[0].batchCode && (
                <View
                  style={[
                    styles.batchTag,
                    { backgroundColor: `${primaryColor}15` },
                  ]}
                >
                  <Ionicons name="albums" size={12} color={primaryColor} />
                  <Text style={[styles.batchTagText, { color: primaryColor }]}>
                    Batch: {item.shippingLogs[0].batchCode}
                  </Text>
                </View>
              )}
              {item.shippingLogs[0].ghnOrderCode && (
                <Text style={styles.ghnCode}>
                  GHN: {item.shippingLogs[0].ghnOrderCode}
                </Text>
              )}
            </View>
          )}

          {item.rejectionReason && (
            <View style={styles.rejectionContainer}>
              <Ionicons name="warning" size={16} color="#F44336" />
              <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
            </View>
          )}
        </View>

        <View style={styles.orderActions}>
          <TouchableOpacity
            style={styles.viewDetailButton}
            onPress={() =>
              router.push({
                pathname: "/(stacks)/OrderDetailScreen",
                params: { orderId: item.orderId },
              } as any)
            }
          >
            <Text
              style={[styles.viewDetailButtonText, { color: primaryColor }]}
            >
              {t("orders.viewDetails")}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={primaryColor} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cart-outline" size={80} color="#ccc" />
      <Text style={styles.emptyText}>
        {selectedStatus === "ALL"
          ? t("orders.noOrders")
          : t("orders.noStatusOrders", {
              status: orderService
                .getStatusLabel(selectedStatus as OrderStatus)
                .toLowerCase(),
            })}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>{t("orders.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("orders.title")}</Text>
        <View style={styles.placeholder} />
      </View>

      {renderStatusFilter()}

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.orderId}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primaryColor]}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
}

// Styles remain the same
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#2196F3",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#666",
  },
  filterButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderBody: {
    padding: 12,
  },
  productRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 12,
    color: "#666",
  },
  moreItems: {
    color: "#2196F3",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 12,
  },
  orderFooter: {
    gap: 8,
  },
  orderInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderDate: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  totalItemsText: {
    fontSize: 12,
    color: "#666",
  },
  totalAmountText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196F3",
  },
  shippingInfoSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  shippingTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
  },
  shippingTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2196F3",
  },
  batchTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
  },
  batchTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF9800",
  },
  ghnCode: {
    fontSize: 10,
    color: "#999",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  rejectionContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  rejectionText: {
    flex: 1,
    fontSize: 12,
    color: "#F44336",
    marginLeft: 6,
  },
  orderActions: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    padding: 12,
  },
  viewDetailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  viewDetailButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2196F3",
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
});
