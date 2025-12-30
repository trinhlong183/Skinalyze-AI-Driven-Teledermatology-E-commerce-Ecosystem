import { GetAllPaymentsParams, GetAllPaymentsResponse } from "@/types/payment";

export const paymentService = {
  /**
   * Get all payments (Admin/Staff only)
   */
  async getAllPayments(
    params?: GetAllPaymentsParams
  ): Promise<GetAllPaymentsResponse> {
    const queryParams = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 50),
    });

    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.paymentType) {
      queryParams.append("paymentType", params.paymentType);
    }

    const response = await fetch(`/api/payments?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch payments");
    }

    return response.json();
  },
};
