import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import cartService from '@/services/cartService';
import tokenService from '@/services/tokenService';

interface CartCountContextType {
  count: number;
  isLoading: boolean;
  refreshCount: () => Promise<void>;
  incrementCount: (amount?: number) => void;
  decrementCount: (amount?: number) => void;
  resetCount: () => void;
}

export const CartCountContext = createContext<CartCountContextType>({
  count: 0,
  isLoading: true,
  refreshCount: async () => {},
  incrementCount: () => {},
  decrementCount: () => {},
  resetCount: () => {},
});

interface CartCountProviderProps {
  children: ReactNode;
}

export function CartCountProvider({ children }: CartCountProviderProps) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCartCount = useCallback(async () => {
    try {
      const token = await tokenService.getToken();
      if (!token) {
        setCount(0);
        setIsLoading(false);
        return;
      }

      const cartCount = await cartService.getCartCount(token);
      setCount(cartCount);
      ('🛒 Cart count updated:', cartCount);
    } catch (error) {
      console.error('❌ Error fetching cart count:', error);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  const refreshCount = useCallback(async () => {
    ('🔄 Refreshing cart count...');
    await fetchCartCount();
  }, [fetchCartCount]);

  const incrementCount = useCallback((amount: number = 1) => {
    setCount(prev => prev + amount);
    (`➕ Cart count incremented by ${amount}`);
  }, []);

  const decrementCount = useCallback((amount: number = 1) => {
    setCount(prev => Math.max(0, prev - amount));
    (`➖ Cart count decremented by ${amount}`);
  }, []);

  const resetCount = useCallback(() => {
    setCount(0);
    ('🔄 Cart count reset to 0');
  }, []);

  const value: CartCountContextType = {
    count,
    isLoading,
    refreshCount,
    incrementCount,
    decrementCount,
    resetCount,
  };

  return (
    <CartCountContext.Provider value={value}>
      {children}
    </CartCountContext.Provider>
  );
}