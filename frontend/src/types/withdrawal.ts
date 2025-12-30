export enum WithdrawalType {
  WITHDRAW = "withdraw",
  REFUND = "refund",
}

export enum WithdrawalStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  APPROVED = "approved",
  REJECTED = "rejected",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface WithdrawalRequest {
  requestId: string;
  userId: string;
  otpCode: string;
  fullName: string;
  amount: number;
  type: WithdrawalType;
  bankName: string;
  accountNumber: string;
  notes?: string;
  status: WithdrawalStatus;
  processedBy?: string;
  processedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalsResponse {
  data: WithdrawalRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateWithdrawalStatusRequest {
  status: WithdrawalStatus;
  rejectionReason?: string;
  note?: string;
}

export interface RequestOTPRequest {
  amount: number;
}

export interface RequestOTPResponse {
  success: boolean;
  message: string;
}

export interface CreateWithdrawalRequest {
  otpCode: string;
  fullName: string;
  amount: number;
  type: "withdraw";
  bankName: string;
  accountNumber: string;
  notes?: string;
}

export interface CreateWithdrawalResponse {
  success: boolean;
  message: string;
  data: WithdrawalRequest;
}

export interface WalletTransaction {
  paymentId: number;
  paymentCode: string;
  paymentType: "topup" | "withdraw";
  amount: string;
  paidAmount: string;
  paymentMethod: string;
  status: string;
  transferContent: string | null;
  createdAt: string;
  paidAt: string | null;
  withdrawalRequestId: string | null;
}

export interface WalletTransactionsResponse {
  success: boolean;
  data: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
