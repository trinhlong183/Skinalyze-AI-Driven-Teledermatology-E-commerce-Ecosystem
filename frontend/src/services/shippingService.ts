import type { ShippingLog, ShippingLogsResponse } from "@/types/shipping";

export class ShippingService {
  /**
   * Get all shipping logs
   */
  async getAllShippingLogs(): Promise<ShippingLog[]> {
    try {
      const response = await fetch("/api/shipping-logs", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to fetch shipping logs");
      }

      const result: ShippingLogsResponse = await response.json();
      return result.data || [];
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to fetch shipping logs");
    }
  }

  /**
   * Get shipping logs for a specific order
   */
  async getShippingLogsByOrder(orderId: string): Promise<ShippingLog[]> {
    try {
      const response = await fetch(`/api/shipping-logs/order/${orderId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to fetch shipping logs");
      }

      const result: ShippingLogsResponse = await response.json();
      return result.data || [];
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to fetch shipping logs");
    }
  }

  /**
   * Get available shipping logs (unassigned, status PENDING)
   */
  async getAvailableShippingLogs(): Promise<ShippingLog[]> {
    try {
      const response = await fetch("/api/shipping-logs/available", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to fetch available logs");
      }

      const result: ShippingLogsResponse = await response.json();
      return result.data || [];
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to fetch available logs");
    }
  }

  /**
   * Get my deliveries (assigned to current staff)
   */
  async getMyDeliveries(): Promise<ShippingLog[]> {
    try {
      const response = await fetch("/api/shipping-logs/my-deliveries", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to fetch my deliveries");
      }

      const result: ShippingLogsResponse = await response.json();
      return result.data || [];
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to fetch my deliveries");
    }
  }

  /**
   * Assign shipping log to current staff member
   */
  async assignToMe(shippingLogId: string): Promise<ShippingLog> {
    try {
      const response = await fetch(`/api/shipping-logs/${shippingLogId}/assign-to-me`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to assign delivery");
      }

      const result = await response.json();
      return result.data;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to assign delivery");
    }
  }

  /**
   * Admin assign shipping log to specific staff
   */
  async assignStaff(
    shippingLogId: string,
    staffId: string,
    force?: boolean
  ): Promise<ShippingLog> {
    try {
      const response = await fetch(`/api/shipping-logs/${shippingLogId}/assign-staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ staffId, force }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to assign staff");
      }

      const result = await response.json();
      return result.data;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to assign staff");
    }
  }

  /**
   * Create new shipping log
   */
  async createShippingLog(data: {
    orderId: string;
    carrierName?: string;
    shippingFee: number;
    estimatedDeliveryDate?: string;
    note?: string;
  }): Promise<ShippingLog> {
    try {
      const response = await fetch("/api/shipping-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          status: "PENDING", // New shipping logs start as PENDING
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to create shipping log");
      }

      const result = await response.json();
      return result.data;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to create shipping log");
    }
  }

  /**
   * Update shipping log status
   */
  async updateShippingLog(
    shippingLogId: string,
    data: {
      status?: string;
      note?: string;
      isCodCollected?: boolean;
      codCollectDate?: string;
      carrierName?: string;
    }
  ): Promise<ShippingLog> {
    try {
      const response = await fetch(`/api/shipping-logs/${shippingLogId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to update shipping log");
      }

      const result = await response.json();
      return result.data;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to update shipping log");
    }
  }

  /**
   * Upload delivery proof pictures
   */
  async uploadFinishedPictures(
    shippingLogId: string,
    pictures: File[]
  ): Promise<ShippingLog> {
    try {
      const formData = new FormData();
      pictures.forEach((file) => {
        formData.append("pictures", file);
      });

      const response = await fetch(
        `/api/shipping-logs/${shippingLogId}/upload-finished-pictures`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to upload pictures");
      }

      const result = await response.json();
      return result.data;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to upload pictures");
    }
  }
}

export const shippingService = new ShippingService();
