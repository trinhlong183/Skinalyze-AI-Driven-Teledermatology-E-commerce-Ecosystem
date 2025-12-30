import { ShippingLogResponse } from "@/services/order.service";

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface Customer {
  id: string;
  name: string;
  user: User;
  email: string;
  avatar?: string;
}

export interface User {
  userId: string;
  phone: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  image?: string;
  brand: string;
}

export interface Order {
  id: string; // shippingLogId
  orderId: string; // actual orderId
  orderNumber: string;
  customer: Customer;
  pickupLocation: Location;
  deliveryLocation: Location;
  status:
    | "pending"
    | "accepted"
    | "picking"
    | "in_transit"
    | "delivering"
    | "completed"
    | "failed"
    | "returned";
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  totalAmount: number | null;
  shippingFee: number | null;
  distance?: number; // in km
  estimatedTime?: number; // in minutes
  notes?: string;
  isCodCollected: boolean;
  isCodTransferred: boolean;
  estimatedDeliveryDate?: string | null;
  items?: OrderItem[]; // Order items
  transactionStatus?: string; // Payment status
  batchCode?: string | null; // Batch code if order is in a batch
}

export type OrderStatus = Order["status"];

/**
 * Map API shipping log status to app order status
 */
export const mapAPIStatusToAppStatus = (
  apiStatus: ShippingLogResponse["status"]
): OrderStatus => {
  const statusMap: Record<ShippingLogResponse["status"], OrderStatus> = {
    PENDING: "pending",
    ASSIGNED: "accepted",
    PICKED_UP: "picking",
    IN_TRANSIT: "in_transit",
    OUT_FOR_DELIVERY: "delivering",
    DELIVERED: "completed",
    FAILED: "failed",
    RETURNED: "returned",
    CANCELLED: "failed", // Map CANCELLED to failed
  };

  return statusMap[apiStatus] || "pending";
};

/**
 * Map app order status to API status
 */
export const mapAppStatusToAPIStatus = (
  appStatus: OrderStatus
): ShippingLogResponse["status"] => {
  const statusMap: Record<OrderStatus, ShippingLogResponse["status"]> = {
    pending: "PENDING",
    accepted: "ASSIGNED",
    picking: "PICKED_UP",
    in_transit: "IN_TRANSIT",
    delivering: "OUT_FOR_DELIVERY",
    completed: "DELIVERED",
    failed: "FAILED",
    returned: "RETURNED",
  };

  return statusMap[appStatus] || "PENDING";
};

/**
 * Convert API shipping log to app order format
 */
export const convertAPIOrderToAppOrder = (
  apiLog: ShippingLogResponse
): Order => {
  // Check if order has full details (with user info and orderItems)
  const isFullOrder = "user" in apiLog.order.customer;
  const hasOrderItems = "orderItems" in apiLog.order;

  // Map order items if available
  const items =
    hasOrderItems &&
    (apiLog.order as any).orderItems?.map((item: any) => ({
      id: item.orderItemId,
      productId: item.productId,
      name: item.product.productName,
      description: item.product.productDescription,
      quantity: item.quantity,
      price: parseFloat(item.priceAtTime),
      image: item.product.productImages[0],
      brand: item.product.brand,
    }));

  // Get customer info (handle both FullOrder and SimpleOrder)
  const customerName = isFullOrder
    ? (apiLog.order.customer as any).user.fullName
    : "Customer";
  const customerPhone = isFullOrder
    ? (apiLog.order.customer as any).user.phone
    : "";
  const customerEmail = isFullOrder
    ? (apiLog.order.customer as any).user.email
    : "";
  const customerAvatar = isFullOrder
    ? (apiLog.order.customer as any).user.photoUrl
    : null;

  return {
    id: apiLog.shippingLogId,
    orderId: apiLog.orderId,
    orderNumber: apiLog.orderId.split("-")[0].toUpperCase(),
    customer: {
      id: apiLog.order.customer.customerId,
      name: customerName,
      user: {
        userId: isFullOrder ? (apiLog.order.customer as any).user.userId : "",
        phone: customerPhone,
      },
      email: customerEmail,
      avatar: customerAvatar || undefined,
    },
    // Pickup location: FPT University HCMC Campus
    pickupLocation: {
      latitude: 10.841416800000001,
      longitude: 106.81007447258705,
      address: "FPT University - HCMC Campus, Ho Chi Minh City, Vietnam",
    },
    deliveryLocation: {
      latitude: 10.7626,
      longitude: 106.6826,
      address: apiLog.order.shippingAddress,
    },
    status: mapAPIStatusToAppStatus(apiLog.status),
    createdAt: apiLog.createdAt,
    acceptedAt: apiLog.status !== "PENDING" ? apiLog.updatedAt : undefined,
    completedAt: apiLog.deliveredDate || undefined,
    totalAmount: apiLog.totalAmount ? parseFloat(apiLog.totalAmount) : null,
    shippingFee: apiLog.shippingFee ? parseFloat(apiLog.shippingFee) : null,
    notes: apiLog.note || apiLog.order.notes || undefined,
    isCodCollected: apiLog.isCodCollected,
    isCodTransferred: apiLog.isCodTransferred,
    estimatedDeliveryDate: apiLog.estimatedDeliveryDate,
    items: items || undefined,
    transactionStatus:
      "transaction" in apiLog.order
        ? (apiLog.order as any).transaction?.status
        : undefined,
    batchCode: apiLog.batchCode || undefined,
  };
};
