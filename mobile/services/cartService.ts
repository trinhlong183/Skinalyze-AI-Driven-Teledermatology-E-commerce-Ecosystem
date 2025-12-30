import apiService from "./apiService";
import productService from "./productService";

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  addedAt: string;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  updatedAt: string;
}

interface CartResponse {
  statusCode: number;
  message: string;
  data: Cart;
  timestamp: string;
}

interface CartCountResponse {
  statusCode: number;
  message: string;
  data: {
    count: number;
  };
  timestamp: string;
}

interface ClearCartResponse {
  statusCode: number;
  message: string;
  timestamp: string;
}

interface AddToCartPayload {
  productId: string;
  quantity: number;
}

interface UpdateCartItemPayload {
  quantity: number;
}

class CartService {
  async getUserCart(): Promise<Cart> {
    try {
      ("🛒 Fetching user cart...");
      const response = await apiService.get<CartResponse>("/cart");
      ("✅ Cart retrieved successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching cart:", error);
      throw new Error("Failed to fetch cart");
    }
  }

  async addToCart(token: string, payload: AddToCartPayload): Promise<Cart> {
    try {
      (`🛒 Adding product ${payload.productId} to cart...`);
      const response = await apiService.post<CartResponse>(
        "/cart/add",
        payload
      );
      ("✅ Product added to cart successfully");
      return response.data;
    } catch (error: any) {
      console.error("❌ Error adding to cart:", error);

      // Extract meaningful error message from API response
      if (error.message) {
        // Pass through the API error message
        throw new Error(error.message);
      }

      throw new Error("Failed to add product to cart");
    }
  }

  async updateCartItem(
    token: string,
    productId: string,
    payload: UpdateCartItemPayload
  ): Promise<Cart> {
    try {
      (`🛒 Updating cart item ${productId}...`);
      const response = await apiService.patch<CartResponse>(
        `/cart/item/${productId}`,
        payload
      );
      ("✅ Cart item updated successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error updating cart item:", error);
      throw new Error("Failed to update cart item");
    }
  }

  async removeFromCart(token: string, productId: string): Promise<Cart> {
    try {
      (`🛒 Removing product ${productId} from cart...`);
      const response = await apiService.delete<CartResponse>(
        `/cart/item/${productId}`
      );
      ("✅ Product removed from cart successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error removing from cart:", error);
      throw new Error("Failed to remove product from cart");
    }
  }

  async clearCart(token: string): Promise<void> {
    try {
      ("🛒 Clearing cart...");
      await apiService.delete<ClearCartResponse>("/cart");
      ("✅ Cart cleared successfully");
    } catch (error) {
      console.error("❌ Error clearing cart:", error);
      throw new Error("Failed to clear cart");
    }
  }

  async getCartCount(token: string): Promise<number> {
    try {
      ("🛒 Fetching cart count...");
      const response = await apiService.get<CartCountResponse>("/cart/count");
      (`✅ Cart count: ${response.data.count}`);
      return response.data.count;
    } catch (error) {
      console.error("❌ Error fetching cart count:", error);
      throw new Error("Failed to fetch cart count");
    }
  }

  calculateSubtotal(cart: Cart): number {
    return cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  isProductInCart(cart: Cart, productId: string): boolean {
    return cart.items.some((item) => item.productId === productId);
  }

  getCartItem(cart: Cart, productId: string): CartItem | undefined {
    return cart.items.find((item) => item.productId === productId);
  }

  async getCartItemsWithImages(cart: Cart): Promise<CartItemWithImage[]> {
    try {
      const itemsWithImages = await Promise.all(
        cart.items.map(async (item) => {
          try {
            const product = await productService.getProductById(item.productId);
            return {
              ...item,
              productImage: product.productImages?.[0] || undefined,
            };
          } catch (error) {
            console.error(
              `Error fetching image for product ${item.productId}:`,
              error
            );
            return {
              ...item,
              productImage: undefined,
            };
          }
        })
      );
      return itemsWithImages;
    } catch (error) {
      console.error("Error fetching cart items with images:", error);
      throw new Error("Failed to fetch cart items with images");
    }
  }
}

export interface CartItemWithImage extends CartItem {
  productImage?: string;
}

export const cartService = new CartService();
export default cartService;
