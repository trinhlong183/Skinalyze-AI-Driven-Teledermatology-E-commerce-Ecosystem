export enum ReturnRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum ReturnReason {
  DAMAGED = "DAMAGED",
  WRONG_ITEM = "WRONG_ITEM",
  DEFECTIVE = "DEFECTIVE",
  NOT_AS_DESCRIBED = "NOT_AS_DESCRIBED",
  CHANGE_MIND = "CHANGE_MIND",
  OTHER = "OTHER",
}

export interface ReturnRequest {
  returnRequestId: string;
  orderId: string;
  shippingLogId: string;
  customerId: string;
  reason: ReturnReason;
  reasonDetail?: string;
  evidencePhotos?: string[];
  status: ReturnRequestStatus;
  reviewedByStaffId?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  assignedStaffId?: string | null;
  assignedAt?: string | null;
  returnedToWarehouseAt?: string | null;
  returnCompletionPhotos?: string[] | null;
  completionNote?: string | null;
  isRefunded: boolean;
  refundAmount?: number | null;
  refundedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations - Backend trả về full objects
  order: {
    orderId: string;
    status: string;
    shippingAddress: string;
    toWardCode?: string | null;
    toDistrictId?: string | null;
    notes?: string | null;
    rejectionReason?: string | null;
    processedBy?: string | null;
    preferredShippingMethod: string;
    createdAt: string;
    updatedAt: string;
  };
  shippingLog: {
    shippingLogId: string;
    orderId: string;
    shippingFee?: number | null;
    carrierName?: string | null;
    note?: string | null;
    unexpectedCase?: string | null;
    isCodCollected: boolean;
    isCodTransferred: boolean;
    status: string;
    shippingMethod: string;
    ghnOrderCode?: string | null;
    ghnSortCode?: string | null;
    ghnShippingFee?: number | null;
    ghnTrackingData?: any | null;
    batchCode?: string | null;
    batchOrderIds?: any | null;
    totalAmount?: string | null;
    codCollectDate?: string | null;
    codTransferDate?: string | null;
    estimatedDeliveryDate?: string | null;
    returnedDate?: string | null;
    deliveredDate?: string | null;
    finishedPictures?: string[] | null;
    batchCompletionPhotos?: string[] | null;
    batchCompletionNote?: string | null;
    batchCompletedAt?: string | null;
    codCollected: boolean;
    totalCodAmount?: number | null;
    shippingStaffId?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  customer: {
    customerId: string;
    user: {
      userId: string;
      email: string;
      fullName: string;
      dob?: string;
      photoUrl?: string;
      phone?: string;
      gender?: string;
      role: string;
      createdAt: string;
      updatedAt: string;
      isActive: boolean;
      isVerified: boolean;
    };
    aiUsageAmount: number;
    pastDermatologicalHistory: any[];
    createdAt: string;
    updatedAt: string;
  };
  reviewedByStaff?: {
    userId: string;
    fullName: string;
    email: string;
  } | null;
  assignedStaff?: {
    userId: string;
    fullName: string;
    email: string;
  } | null;
}

export interface CreateReturnRequestDto {
  orderId: string;
  shippingLogId: string;
  reason: ReturnReason;
  reasonDetail?: string;
  evidencePhotos?: string[];
}

export interface ReviewReturnRequestDto {
  reviewNote?: string;
}

export interface CompleteReturnDto {
  completionNote?: string;
  returnCompletionPhotos?: string[];
}

export interface GetReturnRequestsResponse {
  statusCode: number;
  message: string;
  data: ReturnRequest[];
  timestamp: string;
}

export interface GetReturnRequestResponse {
  statusCode: number;
  message: string;
  data: ReturnRequest;
  timestamp: string;
}
