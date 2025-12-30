import apiService from "./apiService";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPING"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";
export type PaymentMethod =
  | "wallet"
  | "cod"
  | "banking"
  | "bank_transfer"
  | "momo"
  | "zalopay"
  | "vnpay"
  | "cash";

export interface User {
  userId: string;
  email: string;
  fullName: string;
  dob: string;
  photoUrl: string | null;
  phone: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isVerified: boolean;
}

export interface Customer {
  customerId: string;
  user: User;
  aiUsageAmount: number;
  pastDermatologicalHistory: string[];
  purchaseHistory: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  productId: string;
  productName: string;
  productDescription: string;
  stock: number;
  brand: string;
  sellingPrice: number;
  productImages: string[];
  ingredients: string;
  suitableFor: string[];
  reviews: any[];
  salePercentage: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  orderItemId: string;
  orderId: string;
  product: Product;
  productId: string;
  priceAtTime: string;
  quantity: number;
}

export interface ShippingLog {
  shippingLogId: string;
  orderId: string;
  shippingFee: string | null;
  carrierName: string | null;
  note: string | null;
  unexpectedCase: string | null;
  isCodCollected: boolean;
  isCodTransferred: boolean;
  status: string;
  totalAmount: string | null;
  codCollectDate: string | null;
  codTransferDate: string | null;
  estimatedDeliveryDate: string | null;
  returnedDate: string | null;
  deliveredDate: string | null;
  finishedPictures: string | null;
  shippingStaffId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  orderId: string;
  customer: Customer;
  customerId: string;
  payment: any | null;
  paymentId: string | null;
  status: OrderStatus;
  shippingAddress: string;
  notes: string | null;
  rejectionReason: string | null;
  processedBy: string | null;
  orderItems: OrderItem[];
  shippingLogs: ShippingLog[];
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  statusCode: number;
  message: string;
  data: Order[];
  timestamp: string;
}

export interface OrderDetailResponse {
  statusCode: number;
  message: string;
  data: Order;
  timestamp: string;
}

export interface CheckoutPayload {
  shippingAddress: string;
  province: string;
  district: string;
  ward: string;
  shippingMethod: "INTERNAL" | "GHN";
  totalAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CheckoutResponse {
  statusCode: number;
  message: string;
  data: {
    order?: Order;
    message: string;
    payment?: any; // For banking payment method
  };
  timestamp: string;
}

class OrderService {
  /**
   * Checkout cart and create order
   */
  async checkout(token: string, payload: CheckoutPayload): Promise<any> {
    try {
      ("🛒 Creating checkout order...");

      const response = await apiService.post<CheckoutResponse>(
        "/orders/checkout",
        payload
      );
      console.log("✅ Checkout successful:", response.data);

      // For banking payment, return the whole response data (includes payment info)
      if (payload.paymentMethod === "banking" && response.data.payment) {
        return response.data;
      }

      // For other payment methods, return the order
      if (!response.data.order) {
        throw new Error("Order data is missing from response");
      }
      return response.data.order;
    } catch (error) {
      console.error("❌ Checkout error:", error);
      throw error;
    }
  }

  /**
   * Get all orders for the current user
   */
  async getMyOrders(token: string): Promise<Order[]> {
    try {
      const response = await apiService.get<OrdersResponse>(
        "/orders/my-orders"
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrderById(orderId: string, token: string): Promise<Order> {
    try {
      const response = await apiService.get<OrderDetailResponse>(
        `/orders/${orderId}`
      );
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching order detail:", error);
      throw error;
    }
  }

  /**
   * Calculate total price for an order
   */
  calculateOrderTotal(orderItems: OrderItem[]): number {
    return orderItems.reduce((total, item) => {
      return total + parseFloat(item.priceAtTime) * item.quantity;
    }, 0);
  }

  /**
   * Calculate total items count
   */
  calculateTotalItems(orderItems: OrderItem[]): number {
    return orderItems.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: OrderStatus): string {
    const colorMap: Record<OrderStatus, string> = {
      PENDING: "#FFA500",
      CONFIRMED: "#FF9800",
      PROCESSING: "#2196F3",
      SHIPPING: "#9C27B0",
      DELIVERED: "#4CAF50",
      COMPLETED: "#4CAF50",
      CANCELLED: "#F44336",
      REJECTED: "#F44336",
    };
    return colorMap[status] || "#757575";
  }

  /**
   * Get status label
   */
  getStatusLabel(status: OrderStatus): string {
    const labelMap: Record<OrderStatus, string> = {
      PENDING: "Pending",
      CONFIRMED: "Confirmed", // Added for CONFIRMED
      PROCESSING: "Processing",
      SHIPPING: "Shipping", // Changed from SHIPPED to SHIPPING
      DELIVERED: "Delivered",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
      REJECTED: "Rejected",
    };
    return labelMap[status] || status;
  }

  /**
   * Get payment method label
   */
  getPaymentMethodLabel(method: PaymentMethod): string {
    const labelMap: Record<PaymentMethod, string> = {
      wallet: "Wallet Balance",
      cod: "Cash on Delivery",
      banking: "Bank Transfer (SePay)",
      bank_transfer: "Direct Bank Transfer",
      momo: "MoMo",
      zalopay: "ZaloPay",
      vnpay: "VNPay",
      cash: "Cash",
    };
    return labelMap[method] || method;
  }

  async confirmCompleteOrder(
    orderId: string,
    token: string,
    feedback?: string
  ): Promise<Order> {
    try {
      const payload = feedback ? { feedback } : {};

      const response = await apiService.post<OrderDetailResponse>(
        `/orders/${orderId}/complete`,
        payload
      );

      return response.data;
    } catch (error) {
      console.error("Error completing order:", error);
      throw error;
    }
  }

  /**
   * Format currency (VND)
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
}

export default new OrderService();
