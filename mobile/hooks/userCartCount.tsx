import { useContext } from 'react';
import { CartCountContext } from '@/contexts/CartCountContext';

export function useCartCount() {
  const context = useContext(CartCountContext);
  
  if (!context) {
    throw new Error('useCartCount must be used within a CartCountProvider');
  }
  
  return context;
}