import apiService from "./apiService";

export interface WithdrawalRequestOTPPayload {
  amount: number;
}

export interface WithdrawalCreatePayload {
  otpCode: string;
  fullName: string;
  amount: number;
  type: string;
  bankName: string;
  accountNumber: string;
  notes?: string;
}

interface WithdrawalOTPResponse {
  statusCode: number;
  message: string;
  data?: any;
  timestamp: string;
}

interface WithdrawalResponse {
  statusCode: number;
  message: string;
  data: {
    withdrawalId: string;
    userId: string;
    amount: number;
    accountNumber: string;
    bankName: string;
    fullName: string;
    status: string;
    createdAt: string;
  };
  timestamp: string;
}

class WithdrawalService {
  async requestOTP(payload: WithdrawalRequestOTPPayload): Promise<any> {
    try {
      console.log("📤 Requesting OTP for withdrawal:", payload.amount);
      const response = await apiService.post<WithdrawalOTPResponse>(
        "/withdrawals/request-otp",
        payload
      );
      console.log("✅ OTP requested successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error requesting OTP:", error);
      throw new Error("Failed to request OTP");
    }
  }

  async createWithdrawal(payload: WithdrawalCreatePayload): Promise<any> {
    try {
      console.log("📤 Creating withdrawal request");
      const response = await apiService.post<WithdrawalResponse>(
        "/withdrawals",
        payload
      );
      console.log("✅ Withdrawal created successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error creating withdrawal:", error);
      throw new Error("Failed to create withdrawal");
    }
  }

  async getWithdrawalHistory(): Promise<any[]> {
    try {
      console.log("📋 Fetching withdrawal history");
      const response = await apiService.get<any>("/withdrawals/history");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching withdrawal history:", error);
      throw new Error("Failed to fetch withdrawal history");
    }
  }
}

export const withdrawalService = new WithdrawalService();
export default withdrawalService;
