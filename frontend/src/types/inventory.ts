export interface Inventory {
  inventoryId: string;
  productId: string;
  originalPrice: number;
  currentStock: number;
  reservedStock: number;
  createdAt: string;
  updatedAt: string;
  product: {
    productId: string;
    productName: string;
    brand: string;
    sellingPrice: number;
    productImages: string[];
    salePercentage: number;
  };
}

export interface InventoryResponse {
  status: string;
  message: string;
  data: Inventory[];
}

export interface StockAdjustmentRequest {
  productId: string;
  adjustmentType: "INCREASE" | "DECREASE";
  quantity: number;
  reason?: string;
  requestedBy: string;
  originalPrice?: number;
}

export interface StockAdjustmentResponse {
  status: string;
  message: string;
  data: {
    adjustmentId: string;
    productId: string;
    adjustmentType: string;
    quantity: number;
    reason?: string;
    requestedBy: string;
    originalPrice?: number;
    status: string;
    createdAt: string;
  };
}

export interface PendingAdjustment {
  adjustmentId: string;
  productId: string;
  adjustmentType: "INCREASE" | "DECREASE";
  quantity: number;
  reason?: string;
  requestedBy: string;
  originalPrice?: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  product?: {
    productId: string;
    productName: string;
    brand: string;
    sellingPrice: number;
    productImages: string[];
  };
  requestedByUser?: {
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
  };
}

export interface AdjustmentApprovalRequest {
  adjustmentId: string;
  status: "APPROVED" | "REJECTED";
  reviewedBy: string;
  rejectionReason?: string;
}

export interface DirectStockAdjustment {
  productId: string;
  quantity: number; // Positive to add, negative to remove
}

export interface AdjustmentHistory {
  adjustmentId: string;
  adjustmentType: "INCREASE" | "DECREASE";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  requestedByUser?: {
    userId: string;
    fullName: string;
    email: string;
  };
  reviewedByUser?: {
    userId: string;
    fullName: string;
    email: string;
  };
}
