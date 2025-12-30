export interface Product {
  productId: string;
  productName: string;
  productDescription: string;
  stock: number;
  brand: string;
  sellingPrice: number;
  productImages: string[];
  ingredients: string;
  suitableFor: string[];
  reviews: Review[];
  salePercentage: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  date: string;
  rating: number;
  userId: string;
  comment: string;
}

export interface OrderItem {
  orderItemId: string;
  orderId: string;
  product: Product;
  productId: string;
  priceAtTime: string;
  quantity: number;
}

export interface Customer {
  customerId: string;
  user?: {
    userId: string;
    email: string;
    fullName?: string;
    phoneNumber?: string;
  };
  aiUsageAmount?: number;
  pastDermatologicalHistory?: string[];
  purchaseHistory?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  transactionId: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  orderId: string;
  customer: Customer;
  customerId: string;
  payment: Payment | null;
  paymentId: string | null;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REJECTED";
  shippingAddress: string;
  notes: string | null;
  rejectionReason: string | null;
  processedBy: string | null;
  orderItems: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  statusCode: number;
  message: string;
  data: Order[];
  total?: number;
  page?: number;
  limit?: number;
  timestamp: string;
}
