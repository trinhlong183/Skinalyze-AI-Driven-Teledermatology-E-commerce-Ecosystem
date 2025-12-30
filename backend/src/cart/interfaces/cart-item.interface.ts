export interface CartItem {
  productId: string;
  productName?: string;
  price?: number;
  originalPrice?: number;
  salePercentage?: number;
  quantity: number;
  addedAt: Date;
  selected?: boolean;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  updatedAt: Date;
}
