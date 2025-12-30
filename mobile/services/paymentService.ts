import { ApiResponse } from "@/types/api";
import apiService from "./apiService";

export interface CreatePaymentRequest {
  orderId?: string;
  userId: string;
  planId?: string;
  customerId?: string;
  cartData?: {
    items: any[];
  };
  shippingAddress?: string;
  orderNotes?: string;
  paymentType: "order" | "topup" | "subscription";
  amount: number;
  paymentMethod: "banking" | "momo" | "zalopay";
}

export interface BankingInfo {
  accountName: string;
  accountNumber: string;
  amount: number;
  bankName: string;
  note: string;
  qrCodeUrl: string;
  transferContent: string;
}

export interface CreatePaymentResponse {
  paymentId?: string;
  paymentCode?: string;
  checkoutUrl?: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  expiredAt?: string;
  bankingInfo?: BankingInfo;
}

export interface PaymentStatusResponse {
  paymentCode: string;
  status: "pending" | "completed" | "expired" | "failed";
  amount: number;
  paidAmount?: number;
  paymentMethod?: string;
  createdAt: string;
  expiredAt: string;
  paidAt?: string;
  paymentType: "order" | "topup" | "booking" | "subscription";
  order?: {
    orderId: string;
    status: string;
  } | null;
}

export interface WalletTransaction {
  paymentId: number;
  paymentCode: string;
  status: "pending" | "completed" | "failed" | "expired" | "refunded";
  amount: string;
  paidAmount?: string;
  paymentMethod?: string | null;
  paymentType: "topup" | "withdraw";
  createdAt: string;
  paidAt?: string | null;
  expiredAt?: string;
  userId: string;
  orderId?: string | null;
  user?: {
    userId: string;
    email: string;
    fullName: string;
    photoUrl?: string;
    phone?: string;
    role: string;
  };
}

export interface WalletTransactionsResponse {
  data: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Bank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported?: number;
  lookupSupported?: number;
}

interface VietQRBankResponse {
  code: string;
  desc: string;
  data: Bank[];
}

class PaymentService {
  /**
   * Create a top-up payment
   */
  async createTopUpPayment(
    userId: string,
    amount: number
  ): Promise<CreatePaymentResponse> {
    try {
      const requestBody: CreatePaymentRequest = {
        userId,
        paymentType: "topup",
        amount,
        paymentMethod: "banking",
      };

      console.log("Creating top-up payment:", requestBody);

      const response = await apiService.post<
        ApiResponse<CreatePaymentResponse>
      >("/payments", requestBody);

      return response.data;
    } catch (error: any) {
      console.error("Payment service error:", error);
      throw new Error(error.message || "Failed to create top-up payment");
    }
  }

  async getBanks(): Promise<Bank[]> {
    try {
      const response = await fetch("https://api.vietqr.io/v2/banks");
      const result: VietQRBankResponse = await response.json();

      if (result.code === "00" && result.data) {
        return result.data;
      }
      console.log(result.data);
      throw new Error("Failed to fetch banks");
    } catch (error) {
      console.error("Error fetching banks:", error);
      throw error;
    }
  }

  async checkPaymentStatus(
    paymentCode: string
  ): Promise<PaymentStatusResponse> {
    try {
      const response = await apiService.get<ApiResponse<PaymentStatusResponse>>(
        `/payments/check/${paymentCode}`
      );
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error("Error checking payment status:", error);
      throw error;
    }
  }

  /**
   * Get wallet transactions (TOPUP and WITHDRAW only)
   */
  async getWalletTransactions(
    page: number = 1,
    limit: number = 10,
    status?: "pending" | "completed" | "failed" | "expired" | "refunded"
  ): Promise<WalletTransactionsResponse> {
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };

      if (status) {
        params.status = status;
      }

      const response = await apiService.get<any>(
        "/payments/wallet/transactions",
        {
          params,
        }
      );

      console.log("Full API response:", response);

      // API returns { success: true, data: [...], total, page, limit, totalPages }
      // We need to return the whole response structure (excluding success field)
      return {
        data: response.data || [],
        total: response.total || 0,
        page: response.page || 1,
        limit: response.limit || 10,
        totalPages: response.totalPages || 1,
      };
    } catch (error: any) {
      console.error("Error fetching wallet transactions:", error);
      throw new Error(error.message || "Failed to fetch wallet transactions");
    }
  }
}

export default new PaymentService();
