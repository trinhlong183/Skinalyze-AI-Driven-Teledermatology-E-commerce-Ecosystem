import orderService from "@/services/order.service";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
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
  PENDING: {
    label: "Chờ duyệt",
    color: "#FF9800",
    icon: "hourglass-outline",
    bgColor: "#FFF8E1",
  },
  APPROVED: {
    label: "Đã duyệt",
    color: "#2196F3",
    icon: "checkmark-circle-outline",
    bgColor: "#E3F2FD",
  },
  REJECTED: {
    label: "Từ chối",
    color: "#F44336",
    icon: "close-circle-outline",
    bgColor: "#FFEBEE",
  },
  IN_PROGRESS: {
    label: "Đang xử lý",
    color: "#9C27B0",
    icon: "sync-outline",
    bgColor: "#F3E5F5",
  },
  COMPLETED: {
    label: "Hoàn thành",
    color: "#4CAF50",
    icon: "checkmark-done-outline",
    bgColor: "#E8F5E9",
  },
  CANCELLED: {
    label: "Đã hủy",
    color: "#757575",
    icon: "ban-outline",
    bgColor: "#FAFAFA",
  },
};

const reasonLabels: Record<string, string> = {
  DAMAGED: "Hàng hư hỏng",
  WRONG_ITEM: "Giao sai",
  DEFECTIVE: "Hàng lỗi",
  NOT_AS_DESCRIBED: "Sai mô tả",
  CHANGE_MIND: "Đổi ý",
  OTHER: "Khác",
};

export default function ReturnRequestsScreen() {
  const [activeTab, setActiveTab] = useState<ReturnStatus | "ALL">("PENDING");
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadReturnRequests();
    }, [])
  );

  const loadReturnRequests = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAllReturnRequests();
      setRequests(data);
      filterRequests(data, activeTab, searchQuery);
    } catch (error) {
      console.error("Error loading return requests:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách yêu cầu trả hàng");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReturnRequests();
    setRefreshing(false);
  };

  const filterRequests = (
    data: ReturnRequest[],
    tab: ReturnStatus | "ALL",
    query: string
  ) => {
    let filtered = data;

    if (tab !== "ALL") {
      filtered = filtered.filter((r) => r.status === tab);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.orderId?.toLowerCase().includes(q) ||
          r.returnRequestId?.toLowerCase().includes(q) ||
          r.customer?.user?.fullName?.toLowerCase().includes(q) ||
          r.customer?.user?.phone?.includes(q) ||
          reasonLabels[r.reason]?.toLowerCase().includes(q)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleTabChange = (tab: ReturnStatus | "ALL") => {
    setActiveTab(tab);
    filterRequests(requests, tab, searchQuery);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterRequests(requests, activeTab, query);
  };

  const getTabCount = (status: ReturnStatus | "ALL") => {
    if (status === "ALL") return requests.length;
    return requests.filter((r) => r.status === status).length;
  };

  const renderTabButton = (
    status: ReturnStatus | "ALL",
    label: string,
    icon: string
  ) => {
    const isActive = activeTab === status;
    const count = getTabCount(status);

    return (
      <TouchableOpacity
        key={status}
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
        onPress={() => handleTabChange(status)}
        activeOpacity={0.7}
      >
        <View style={styles.tabContent}>
          <Ionicons
            name={icon as any}
            size={20}
            color={isActive ? "#4CAF50" : "#999"}
          />
          <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
            {label}
          </Text>
        </View>
        {count > 0 && (
          <View
            style={[
              styles.badge,
              { backgroundColor: isActive ? "#4CAF50" : "#E0E0E0" },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: isActive ? "#fff" : "#666" },
              ]}
            >
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Vừa xong";
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const renderReturnRequestItem = ({ item }: { item: ReturnRequest }) => {
    const statusInfo = statusConfig[item.status];
    const customerName =
      item.customer?.user?.fullName || item.customer?.fullName || "N/A";
    const customerPhone =
      item.customer?.user?.phone || item.customer?.phone || "N/A";

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() =>
          router.push(
            `/return-request-detail?id=${item.returnRequestId}` as any
          )
        }
        activeOpacity={0.7}
      >
        {/* Status Indicator Strip */}
        <View
          style={[
            styles.statusStrip,
            { backgroundColor: statusInfo.color },
          ]}
        />

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.idBadge}>
                <Text style={styles.idText}>
                  #{item.returnRequestId.substring(0, 8).toUpperCase()}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: statusInfo.bgColor },
                ]}
              >
                <Ionicons
                  name={statusInfo.icon as any}
                  size={14}
                  color={statusInfo.color}
                />
                <Text
                  style={[styles.statusLabel, { color: statusInfo.color }]}
                >
                  {statusInfo.label}
                </Text>
              </View>
            </View>
            <Text style={styles.timeAgo}>{formatDate(item.createdAt)}</Text>
          </View>

          {/* Order Info */}
          <View style={styles.orderInfo}>
            <Ionicons name="cube-outline" size={16} color="#666" />
            <Text style={styles.orderText}>
              Đơn hàng #{item.orderId.substring(0, 8).toUpperCase()}
            </Text>
          </View>

          {/* Customer Info */}
          <View style={styles.customerInfo}>
            <View style={styles.customerRow}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={18} color="#42A5F5" />
              </View>
              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>{customerName}</Text>
                <View style={styles.phoneRow}>
                  <Ionicons name="call-outline" size={12} color="#999" />
                  <Text style={styles.customerPhone}>{customerPhone}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Reason Box */}
          <View style={styles.reasonBox}>
            <View style={styles.reasonHeader}>
              <View style={styles.reasonIconBox}>
                <Ionicons name="alert-circle" size={16} color="#FF9800" />
              </View>
              <View style={styles.reasonContent}>
                <Text style={styles.reasonTitle}>
                  {reasonLabels[item.reason] || item.reason}
                </Text>
                {item.reasonDetail && (
                  <Text style={styles.reasonText} numberOfLines={2}>
                    {item.reasonDetail}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Footer */}
          {item.evidencePhotos && item.evidencePhotos.length > 0 && (
            <View style={styles.footer}>
              <View style={styles.photoTag}>
                <Ionicons name="images-outline" size={14} color="#42A5F5" />
                <Text style={styles.photoText}>
                  {item.evidencePhotos.length} hình ảnh
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
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
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Trả hàng</Text>
            <Text style={styles.headerSubtitle}>
              {requests.length} yêu cầu
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadReturnRequests}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#BBB"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearch("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {renderTabButton("ALL", "Tất cả", "list-outline")}
        {renderTabButton("PENDING", "Chờ duyệt", "hourglass-outline")}
        {renderTabButton("APPROVED", "Đã duyệt", "checkmark-circle-outline")}
        {renderTabButton("IN_PROGRESS", "Xử lý", "sync-outline")}
        {renderTabButton("COMPLETED", "Hoàn thành", "checkmark-done-outline")}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filteredRequests}
        renderItem={renderReturnRequestItem}
        keyExtractor={(item) => item.returnRequestId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4CAF50"]}
            tintColor="#4CAF50"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={64} color="#E0E0E0" />
            </View>
            <Text style={styles.emptyTitle}>Không có yêu cầu nào</Text>
            <Text style={styles.emptySubtitle}>
              Các yêu cầu trả hàng sẽ hiển thị ở đây
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 2,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F9F4",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  tabsContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: "#E8F5E9",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  tabTextActive: {
    color: "#4CAF50",
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 7,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusStrip: {
    height: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    flexWrap: "wrap",
  },
  idBadge: {
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  idText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 0,
    minWidth: 60,
  },
  timeAgo: {
    fontSize: 12,
    color: "#BBB",
    fontWeight: "500",
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  orderText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  customerInfo: {
    marginBottom: 14,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  customerDetails: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  customerPhone: {
    fontSize: 13,
    color: "#999",
  },
  reasonBox: {
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  reasonHeader: {
    flexDirection: "row",
    gap: 10,
  },
  reasonIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  reasonContent: {
    flex: 1,
    gap: 4,
  },
  reasonTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E65100",
  },
  reasonText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  photoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F7FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  photoText: {
    fontSize: 12,
    color: "#42A5F5",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
});
