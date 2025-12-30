import type {
  WithdrawalsResponse,
  UpdateWithdrawalStatusRequest,
  RequestOTPRequest,
  RequestOTPResponse,
  CreateWithdrawalRequest,
  CreateWithdrawalResponse,
  WalletTransactionsResponse,
} from "@/types/withdrawal";

export class WithdrawalService {
  async getWalletTransactions(params?: {
    page?: number;
    limit?: number;
  }): Promise<WalletTransactionsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const response = await fetch(
      `/api/payments/wallet/transactions${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const error: any = new Error(data.message || data.error || "Failed to fetch wallet transactions");
      error.response = { status: response.status, data };
      throw error;
    }

    return data;
  }

  async requestOTP(data: RequestOTPRequest): Promise<RequestOTPResponse> {
    const response = await fetch("/api/withdrawals/request-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      const error: any = new Error(responseData.message || responseData.error || "Failed to request OTP");
      error.response = { status: response.status, data: responseData };
      throw error;
    }

    return responseData;
  }

  async createWithdrawal(
    data: CreateWithdrawalRequest
  ): Promise<CreateWithdrawalResponse> {
    const response = await fetch("/api/withdrawals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      const error: any = new Error(responseData.message || responseData.error || "Failed to create withdrawal request");
      error.response = { status: response.status, data: responseData };
      throw error;
    }

    return responseData;
  }


  async getWithdrawals(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<WithdrawalsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.status) queryParams.append("status", params.status);

      const response = await fetch(
        `/api/withdrawals${
          queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch withdrawal requests");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch withdrawal requests"
      );
    }
  }

  async getWithdrawalById(
    requestId: string
  ): Promise<{ data: import("@/types/withdrawal").WithdrawalRequest }> {
    try {
      const response = await fetch(`/api/withdrawals/${requestId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch withdrawal request");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch withdrawal request"
      );
    }
  }

  async updateWithdrawalStatus(
    requestId: string,
    data: UpdateWithdrawalStatusRequest
  ): Promise<{
    success: boolean;
    message: string;
    data: import("@/types/withdrawal").WithdrawalRequest;
  }> {
    try {
      const response = await fetch(`/api/withdrawals/${requestId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update withdrawal status");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to update withdrawal status"
      );
    }
  }
}

export const withdrawalService = new WithdrawalService();
