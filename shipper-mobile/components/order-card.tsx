import { Order } from "@/types/order";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OrderCardProps {
  order: Order;
  onPress: (order: Order) => void;
  onAccept?: (order: Order) => void;
  onComplete?: (order: Order) => void;
}

const statusColors = {
  pending: "#FFA726",
  accepted: "#42A5F5",
  picking: "#AB47BC",
  in_transit: "#9C27B0",
  delivering: "#66BB6A",
  completed: "#78909C",
  failed: "#EF5350",
  returned: "#FF6F00",
};

const statusLabels = {
  pending: "Chờ nhận",
  accepted: "Đã nhận",
  picking: "Đang lấy hàng",
  in_transit: "Đang vận chuyển",
  delivering: "Đang giao",
  completed: "Hoàn thành",
  failed: "Thất bại",
  returned: "Đã trả lại",
};

export default function OrderCard({
  order,
  onPress,
  onAccept,
  onComplete,
}: OrderCardProps) {
  const statusColor = statusColors[order.status];
  const statusLabel = statusLabels[order.status];

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(order)}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={styles.amount}>
          {order.totalAmount
            ? `${order.totalAmount.toLocaleString("vi-VN")}đ`
            : "Chưa có"}
        </Text>
      </View>

      {/* Batch Code & COD Status */}
      {(order.batchCode || order.isCodCollected) && (
        <View style={styles.badgesRow}>
          {order.batchCode && (
            <TouchableOpacity
              style={styles.batchBadge}
              onPress={(e) => {
                e.stopPropagation();
                // Import router at the top: import { router } from 'expo-router';
                const { router } = require("expo-router");
                router.push(`/batch-detail?batchCode=${order.batchCode}`);
              }}
            >
              <Ionicons name="layers" size={14} color="#FF9800" />
              <Text style={styles.batchText}>{order.batchCode}</Text>
              <Ionicons name="chevron-forward" size={14} color="#FF9800" />
            </TouchableOpacity>
          )}
          {order.isCodCollected && (
            <View style={styles.codCollectedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={styles.codCollectedText}>COD đã thu</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.customerInfo}>
        {order.customer.avatar ? (
          <Image
            source={{ uri: order.customer.avatar }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={24} color="#666" />
          </View>
        )}
        <View style={styles.customerDetails}>
          <Text style={styles.customerName}>{order.customer.name}</Text>
          <Text style={styles.customerPhone}>
            {order.customer.user.phone || "Chưa có SĐT"}
          </Text>
        </View>
      </View>

      <View style={styles.locations}>
        <View style={styles.locationRow}>
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={20} color="#42A5F5" />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Lấy hàng</Text>
            <Text style={styles.locationAddress} numberOfLines={2}>
              {order.pickupLocation.address}
            </Text>
          </View>
        </View>

        <View style={styles.locationDivider} />

        <View style={styles.locationRow}>
          <View style={styles.locationIcon}>
            <Ionicons name="flag" size={20} color="#66BB6A" />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Giao hàng</Text>
            <Text style={styles.locationAddress} numberOfLines={2}>
              {order.deliveryLocation.address}
            </Text>
          </View>
        </View>
      </View>

      {order.distance && order.estimatedTime && (
        <View style={styles.distanceInfo}>
          <View style={styles.distanceItem}>
            <Ionicons name="navigate" size={16} color="#666" />
            <Text style={styles.distanceText}>
              {order.distance.toFixed(1)} km
            </Text>
          </View>
          <View style={styles.distanceItem}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={styles.distanceText}>{order.estimatedTime} phút</Text>
          </View>
        </View>
      )}

      {/* Tracking Button for picking/delivering status
      {(order.status === 'picking' || order.status === 'delivering') && (
        <TrackingButton order={order} />
      )} */}

      {order.status === "pending" && onAccept && (
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => onAccept(order)}
        >
          <Text style={styles.actionButtonText}>Nhận đơn</Text>
        </TouchableOpacity>
      )}

      {order.status === "delivering" && onComplete && (
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={() => onComplete(order)}
        >
          <Text style={styles.actionButtonText}>Hoàn thành</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#66BB6A",
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  customerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: "#666",
  },
  locations: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationIcon: {
    width: 32,
    alignItems: "center",
    paddingTop: 2,
  },
  locationInfo: {
    flex: 1,
    marginLeft: 8,
  },
  locationLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  locationDivider: {
    width: 2,
    height: 12,
    backgroundColor: "#e0e0e0",
    marginLeft: 15,
    marginVertical: 4,
  },
  distanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  distanceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distanceText: {
    fontSize: 14,
    color: "#666",
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  acceptButton: {
    backgroundColor: "#42A5F5",
  },
  completeButton: {
    backgroundColor: "#66BB6A",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  batchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  batchText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FF9800",
  },
  codCollectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  codCollectedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4CAF50",
  },
});
