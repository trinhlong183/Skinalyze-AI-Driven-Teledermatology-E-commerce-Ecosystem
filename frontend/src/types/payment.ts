import { User } from "./user";

export type PaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "expired"
  | "refunded";
export type PaymentType =
  | "order"
  | "topup"
  | "withdraw"
  | "booking"
  | "subscription";
export type PaymentMethod = "cash" | "banking" | "sepay";
export type ShippingMethod = "INTERNAL" | "EXTERNAL";

export interface Payment {
  paymentId: number;
  paymentCode: string;
  paymentType: PaymentType;
  orderId: number | null;
  order: any | null;
  userId: string;
  planId: number | null;
  withdrawalRequestId: string | null;
  amount: string;
  paidAmount: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  sepayTransactionId: string | null;
  gateway: string | null;
  accountNumber: string | null;
  referenceCode: string | null;
  transferContent: string | null;
  transactionDate: string | null;
  webhookData: any | null;
  cartData: any | null;
  shippingAddress: string | null;
  toWardCode: string | null;
  toDistrictId: number | null;
  orderNotes: string | null;
  shippingMethod: ShippingMethod;
  customerId: string | null;
  expiredAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  appointment: any | null;
  user: User;
  customerSubscription: any | null;
}

export interface GetAllPaymentsParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  paymentType?: PaymentType;
}

export interface GetAllPaymentsResponse {
  success: boolean;
  data: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
