export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
}

export interface Payment {
  paymentId: string;
  paymentCode: string;
  status: PaymentStatus;
  amount: number;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  expiredAt: string;
}

export enum PaymentMethod {
  BANKING = "banking",
  CASH = "cash",
  WALLET = "wallet",
}

export enum PaymentType {
  ORDER = "order",
  TOPUP = "topup", // Nạp tiền vào ví
  BOOKING = "booking",
  SUBSCRIPTION = "subscription",
}
