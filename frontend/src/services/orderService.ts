import type { OrdersResponse, Order } from "@/types/order";

export class OrderService {
  /**
   * Get all orders (staff only)
   * @param params - Pagination and filter parameters
   */
  async getOrders(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: string;
  }): Promise<OrdersResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.search) queryParams.append("search", params.search);
      if (params?.status) queryParams.append("status", params.status);
      if (params?.customerId) queryParams.append("customerId", params.customerId);

      const queryString = queryParams.toString();
      const url = `/api/orders${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch orders");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to fetch orders"
      );
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    rejectionReason?: string
  ): Promise<{ success: boolean; message: string; data: Order }> {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status, rejectionReason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update order status");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to update order status"
      );
    }
  }

  /**
   * Get order details by ID
   */
  async getOrderById(orderId: string): Promise<{ data: Order }> {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch order details");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to fetch order details"
      );
    }
  }

  /**
   * Confirm order
   */
  async confirmOrder(
    orderId: string,
    processedBy: string,
    note?: string
  ): Promise<{ success: boolean; message: string; data: Order }> {
    try {
      const response = await fetch(`/api/orders/${orderId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ processedBy, note }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to confirm order");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to confirm order"
      );
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    reason: string,
    cancelledBy?: string
  ): Promise<{ success: boolean; message: string; data: Order }> {
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ reason, cancelledBy }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel order");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to cancel order"
      );
    }
  }
}

export const orderService = new OrderService();
