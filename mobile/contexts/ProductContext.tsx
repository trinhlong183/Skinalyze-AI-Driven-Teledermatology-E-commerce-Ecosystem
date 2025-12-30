import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Product, Category } from '@/services/productService';
import productService from '@/services/productService';

interface ProductContextType {
  products: Product[];
  categories: Category[];
  saleProducts: Product[];
  isLoading: boolean;
  error: string | null;
  userSkinConditions: string[];
  refreshProducts: () => Promise<void>;
  searchProducts: (query: string) => Product[];
  getProductById: (productId: string) => Product | undefined;
  getProductsByCategory: (categoryId: string) => Product[];
  getCategoryById: (categoryId: string) => Category | undefined;
  setUserSkinConditions: (conditions: string[]) => void;
  getProductsSortedBySkinConditions: (conditions?: string[]) => Product[];
}

export const ProductContext = createContext<ProductContextType>({
  products: [],
  categories: [],
  saleProducts: [],
  isLoading: true,
  error: null,
  userSkinConditions: [],
  refreshProducts: async () => {},
  searchProducts: () => [],
  getProductById: () => undefined,
  getProductsByCategory: () => [],
  getCategoryById: () => undefined,
  setUserSkinConditions: () => {},
  getProductsSortedBySkinConditions: () => [],
});

interface ProductProviderProps {
  children: ReactNode;
}

export function ProductProvider({ children }: ProductProviderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSkinConditions, setUserSkinConditions] = useState<string[]>([]);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch products and categories in parallel
      const [productsData, categoriesData] = await Promise.all([
        productService.getAllProducts(),
        productService.getAllCategories(),
      ]);

      // In fetchAllData, pre-compute values
      const processedProducts = productsData.map(product => ({
        ...product,
        _discountedPrice: productService.calculateDiscountedPrice(product),
        _avgRating: productService.calculateAverageRating(product),
        _stockStatus: productService.getStockStatus(product),
      }));

      setProducts(processedProducts);
      setCategories(categoriesData);

      // Filter sale products on client side
      const onSaleProducts = productsData.filter(
        (product) => parseFloat(product.salePercentage) > 0
      );
      setSaleProducts(onSaleProducts);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProducts = async () => {
    await fetchAllData();
  };

  // Client-side search (faster than API call)
  const searchProducts = (query: string): Product[] => {
    if (!query.trim()) return products;

    const lowerQuery = query.toLowerCase();
    return products.filter(
      (product) =>
        product.productName.toLowerCase().includes(lowerQuery) ||
        product.productDescription.toLowerCase().includes(lowerQuery) ||
        product.brand.toLowerCase().includes(lowerQuery) ||
        product.categories.some(cat => 
          cat.categoryName.toLowerCase().includes(lowerQuery)
        )
    );
  };

  const getProductById = (productId: string): Product | undefined => {
    return products.find((p) => p.productId === productId);
  };

  const getProductsByCategory = (categoryId: string): Product[] => {
    return products.filter((product) =>
      product.categories.some((cat) => cat.categoryId === categoryId)
    );
  };

  const getCategoryById = (categoryId: string): Category | undefined => {
    return categories.find((c) => c.categoryId === categoryId);
  };

  /**
   * Calculate how many skin conditions a product matches
   * @param product - The product to check
   * @param conditions - Array of skin conditions (e.g., ['oily', 'sensitive'])
   * @returns Number of matching conditions
   */
  const calculateSkinMatchScore = (product: Product, conditions: string[]): number => {
    if (!product.suitableFor || !conditions.length) return 0;

    const normalizedConditions = conditions.map(c => c.toLowerCase().trim());
    const normalizedSuitableFor = product.suitableFor.map(s => 
      s.toLowerCase().trim().replace(/[\[\]"]/g, '')
    );

    return normalizedConditions.reduce((score, condition) => {
      if (normalizedSuitableFor.some(suitable => 
        suitable.includes(condition) || condition.includes(suitable)
      )) {
        return score + 1;
      }
      return score;
    }, 0);
  };

  /**
   * Get products sorted by relevance to user's skin conditions
   * Products matching more conditions appear first
   * @param conditions - Optional override for skin conditions
   */
  const getProductsSortedBySkinConditions = (conditions?: string[]): Product[] => {
    const skinConditions = conditions || userSkinConditions;
    
    if (!skinConditions.length) return products;

    return [...products].sort((a, b) => {
      const scoreA = calculateSkinMatchScore(a, skinConditions);
      const scoreB = calculateSkinMatchScore(b, skinConditions);
      
      // Sort by match score (descending), then by rating, then by name
      if (scoreB !== scoreA) return scoreB - scoreA;
      
      // Secondary sort by average rating
      const ratingA = (a as any)._avgRating || 0;
      const ratingB = (b as any)._avgRating || 0;
      if (ratingB !== ratingA) return ratingB - ratingA;
      
      return a.productName.localeCompare(b.productName);
    });
  };

  const value: ProductContextType = {
    products,
    categories,
    saleProducts,
    isLoading,
    error,
    userSkinConditions,
    refreshProducts,
    searchProducts,
    getProductById,
    getProductsByCategory,
    getCategoryById,
    setUserSkinConditions,
    getProductsSortedBySkinConditions,
  };

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}