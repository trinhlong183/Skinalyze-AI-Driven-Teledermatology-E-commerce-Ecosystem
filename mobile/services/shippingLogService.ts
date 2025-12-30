import apiService from "./apiService";

export interface GHNTrackingLog {
  time: string;
  status: string;
}

export interface GHNTracking {
  status: string;
  expectedDeliveryTime: string;
  currentLocation: string;
  logs: GHNTrackingLog[];
}

export interface ShippingStaff {
  fullName: string;
  phone: string;
}

export interface ShippingLogTrackingData {
  orderId: string;
  status: "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED";
  shippingMethod: "INTERNAL" | "GHN";
  ghnOrderCode?: string;
  ghnTracking?: GHNTracking;
  shippingStaff?: ShippingStaff;
}

export interface ShippingLogTrackingResponse {
  statusCode: number;
  message: string;
  data: ShippingLogTrackingData;
  timestamp: string;
}

class ShippingLogService {
  /**
   * Get shipping tracking info for an order
   * Includes GHN tracking data if using GHN shipping method
   */
  async getShippingTracking(
    orderId: string,
    token: string
  ): Promise<ShippingLogTrackingData> {
    try {
      console.log("📦 Fetching shipping tracking for order:", orderId);

      const response = await apiService.get<ShippingLogTrackingResponse>(
        `/shipping-logs/track/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ Shipping tracking data received:", {
        orderId: response.data.orderId,
        status: response.data.status,
        shippingMethod: response.data.shippingMethod,
        hasGHNTracking: !!response.data.ghnTracking,
        hasStaff: !!response.data.shippingStaff,
      });

      return response.data;
    } catch (error: any) {
      console.error(
        "❌ Error fetching shipping tracking:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to fetch shipping tracking"
      );
    }
  }

  /**
   * Get status label in Vietnamese
   */
  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      // Internal statuses
      PICKED_UP: "Đã lấy hàng",
      IN_TRANSIT: "Đang vận chuyển",
      OUT_FOR_DELIVERY: "Đang giao hàng",
      DELIVERED: "Đã giao hàng",

      // GHN statuses - Complete list
      ready_to_pick: "Chờ lấy hàng",
      picking: "Đang lấy hàng",
      money_collect_picking: "Đang tương tác với người gửi",
      picked: "Lấy hàng thành công",
      storing: "Nhập kho",
      transporting: "Đang trung chuyển",
      sorting: "Đang phân loại",
      delivering: "Đang giao hàng",
      delivered: "Giao hàng thành công",
      money_collect_delivering: "Đang tương tác với người nhận",
      delivery_fail: "Giao hàng không thành công",
      waiting_to_return: "Chờ xác nhận giao lại",
      return: "Chuyển hoàn",
      return_transporting: "Đang trung chuyển hàng hoàn",
      return_sorting: "Đang phân loại hàng hoàn",
      returning: "Đang hoàn hàng",
      return_fail: "Hoàn hàng không thành công",
      returned: "Hoàn hàng thành công",
      cancel: "Đơn huỷ",
      exception: "Hàng ngoại lệ",
      lost: "Hàng thất lạc",
      damage: "Hàng hư hỏng",
    };

    return statusMap[status] || status;
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      // Internal statuses
      PICKED_UP: "#FFA500",
      IN_TRANSIT: "#007AFF",
      OUT_FOR_DELIVERY: "#FF9500",
      DELIVERED: "#34C759",

      // GHN statuses - Complete list with appropriate colors
      ready_to_pick: "#FFA500",
      picking: "#FFA500",
      money_collect_picking: "#FF9500",
      picked: "#34C759",
      storing: "#8E8E93",
      transporting: "#007AFF",
      sorting: "#007AFF",
      delivering: "#FF9500",
      delivered: "#34C759",
      money_collect_delivering: "#FF9500",
      delivery_fail: "#FF3B30",
      waiting_to_return: "#FF9500",
      return: "#FF9500",
      return_transporting: "#FF9500",
      return_sorting: "#FF9500",
      returning: "#FF9500",
      return_fail: "#FF3B30",
      returned: "#8E8E93",
      cancel: "#8E8E93",
      exception: "#FF3B30",
      lost: "#FF3B30",
      damage: "#FF3B30",
    };

    return colorMap[status] || "#8E8E93";
  }

  /**
   * Format datetime string
   * Returns empty string if date is invalid
   */
  formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) {
      return "Chưa có thông tin";
    }

    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Chưa có thông tin";
      }

      return date.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Chưa có thông tin";
    }
  }
}

export default new ShippingLogService();
