export interface ShippingLog {
  shippingLogId: string;
  orderId: string;
  order?: {
    orderId: string;
    customerId: string;
    status: string;
    shippingAddress: string;
    notes: string | null;
    customer?: {
      customerId: string;
      user?: {
        userId: string;
        email: string;
        fullName: string;
        phone: string;
      };
    };
  };
  shippingFee: number | null;
  carrierName: string | null;
  note: string | null;
  unexpectedCase: string | null;
  isCodCollected: boolean;
  isCodTransferred: boolean;
  status:
    | "PENDING"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "FAILED"
    | "RETURNED";
  totalAmount: string;
  codCollectDate: string | null;
  codTransferDate: string | null;
  estimatedDeliveryDate: string | null;
  returnedDate: string | null;
  deliveredDate: string | null;
  finishedPictures: string[];
  shippingStaff?: {
    userId: string;
    email: string;
    fullName: string;
    phone: string;
    role: string;
    photoUrl: string | null;
  };
  shippingStaffId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingLogsResponse {
  statusCode: number;
  message: string;
  data: ShippingLog[];
  timestamp: string;
}
