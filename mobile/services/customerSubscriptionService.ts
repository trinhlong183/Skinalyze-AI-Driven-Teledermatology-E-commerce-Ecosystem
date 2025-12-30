// File: services/customerSubscriptionService.ts
import { ApiResponse } from "@/types/api";
import apiService from "./apiService";
import { CustomerSubscription } from "@/types/customerSubscription.type";
import { PaymentMethod } from "@/types/payment.type";
interface CreateCustomerSubscriptionDto {
  planId: string;
  paymentMethod?: PaymentMethod;
}

interface BankingInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  qrCodeUrl: string;
}

export interface SubscriptionPaymentResponse {
  paymentInfo: {
    paymentCode: string;
    bankingInfo: BankingInfo;
  };
}
class CustomerSubscriptionService {
  async getMyActiveSubscriptions(
    dermatologistId?: string
  ): Promise<CustomerSubscription[]> {
    try {
      const params: { dermatologistId?: string } = {};

      if (dermatologistId) {
        params.dermatologistId = dermatologistId;
      }

      const response = await apiService.get<
        ApiResponse<CustomerSubscription[]>
      >("/customer-subscriptions/my", { params });

      return response.data;
    } catch (error) {
      console.error("Error fetching my active subscriptions:", error);
      throw error;
    }
  }

  async createSubscriptionPayment(
    planId: string
  ): Promise<SubscriptionPaymentResponse> {
    try {
      const dto: CreateCustomerSubscriptionDto = {
        planId,
        paymentMethod: PaymentMethod.BANKING,
      };

      const response = await apiService.post<
        ApiResponse<SubscriptionPaymentResponse>
      >("/customer-subscriptions", dto);

      return response.data;
    } catch (error) {
      console.error("Error creating subscription payment:", error);
      throw error;
    }
  }

  async createSubscriptionWithWallet(
    planId: string
  ): Promise<CustomerSubscription> {
    try {
      const dto: CreateCustomerSubscriptionDto = {
        planId,
        paymentMethod: PaymentMethod.WALLET,
      };

      const response = await apiService.post<ApiResponse<CustomerSubscription>>(
        "/customer-subscriptions/use-wallet",
        dto
      );

      return response.data;
    } catch (error) {
      console.error("Error purchasing subscription with wallet:", error);
      throw error;
    }
  }
}

export default new CustomerSubscriptionService();
