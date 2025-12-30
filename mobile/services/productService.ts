import apiService from "./apiService";

export interface Category {
  categoryId: string;
  categoryName: string;
  categoryDescription: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryListResponse {
  statusCode: number;
  message: string;
  data: Category[];
  timestamp: string;
}

interface CategoryResponse {
  statusCode: number;
  message: string;
  data: Category;
  timestamp: string;
}

export interface Review {
  userId: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  productId: string;
  productName: string;
  productDescription: string;
  stock: number;
  categories: Category[];
  brand: string;
  sellingPrice: number;
  productImages: string[];
  ingredients: string;
  suitableFor: string[];
  reviews: Review[];
  salePercentage: string;
  createdAt: string;
  updatedAt: string;
  aiReason?: string;
}

interface ProductListResponse {
  statusCode: number;
  message: string;
  data: {
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp: string;
}

interface ProductResponse {
  statusCode: number;
  message: string;
  data: Product;
  timestamp: string;
}

class ProductService {
  async getAllCategories(): Promise<Category[]> {
    try {
      const response = await apiService.get<CategoryListResponse>('/categories');
      
      // The response might be directly the data array or wrapped in response.data
      if (Array.isArray(response)) {
        return response;
      }
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      throw new Error('Failed to fetch categories');
    }
  }

  async getCategoryById(categoryId: string): Promise<Category> {
    try {
      const response = await apiService.get<CategoryResponse>(`/categories/${categoryId}`);
      
      if (response.data) {
        return response.data;
      }
      
      throw new Error('Invalid category response structure');
    } catch (error) {
      throw new Error('Failed to fetch category by ID');
    }
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await apiService.get<ProductListResponse>('/products');
      
      if (Array.isArray(response)) {
        return response;
      }
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      throw new Error('Failed to fetch products');
    }
  }

  async getProductById(productId: string): Promise<Product> {
    try {
      const response = await apiService.get<ProductResponse>(`/products/${productId}`);
      
      if (response.data) {
        return response.data;
      }
      
      throw new Error('Invalid product response structure');
    } catch (error) {
      throw new Error('Failed to fetch product by ID');
    }
  }

  /**
   * Search products with filters (server-side where possible)
   */
  async searchProducts(query: string, filters?: { minPrice?: number; maxPrice?: number; inStock?: boolean }, page: number = 1, limit: number = 50): Promise<{ products: Product[], pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append('search', query.trim());
      if (filters?.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
      if (filters?.inStock !== undefined) params.append('inStock', filters.inStock.toString());
      if (page > 1) params.append('page', page.toString());
      if (limit !== 50) params.append('limit', limit.toString());
      
      const queryString = params.toString();
      const url = `/products${queryString ? `?${queryString}` : ''}`;
      const response = await apiService.get<ProductListResponse>(url);
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return {
          products: response.data.data,
          pagination: {
            total: response.data.total,
            page: response.data.page,
            limit: response.data.limit,
            totalPages: response.data.totalPages
          }
        };
      }
      
      return { products: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    } catch (error) {
      throw new Error('Failed to search products');
    }
  }

  async getProductsByCategory(
    categoryId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ products: Product[]; total: number; totalPages: number }> {
    try {
      const response = await apiService.get<ProductListResponse>(
        `/products?categoryId=${categoryId}&page=${page}&limit=${limit}`
      );
      
      return {
        products: response.data.data,
        total: response.data.total,
        totalPages: response.data.totalPages,
      };
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return { products: [], total: 0, totalPages: 0 };
    }
  }

  /**
   * Get products on sale (client-side filtering)
   */
  async getProductsOnSale(): Promise<Product[]> {
    try {
      const allProducts = await this.getAllProducts();
      const saleProducts = allProducts.filter(product => parseFloat(product.salePercentage) > 0);
      return saleProducts;
    } catch (error) {
      // Gracefully handle error by returning empty array
      return [];
    }
  }

  /**
   * Calculate discounted price
   */
  calculateDiscountedPrice(product: Product): number {
    const salePercentage = parseFloat(product.salePercentage);
    if (salePercentage > 0) {
      return product.sellingPrice * (1 - salePercentage / 100);
    }
    return product.sellingPrice;
  }

  /**
   * Calculate average rating
   */
  calculateAverageRating(product: Product): number {
    if (!product.reviews || product.reviews.length === 0) return 0;
    const sum = product.reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / product.reviews.length;
  }

  /**
   * Check if product is in stock
   */
  isInStock(product: Product): boolean {
    return product.stock > 0;
  }

  /**
   * Get stock status with color
   */
  getStockStatus(product: Product): { status: string; color: string } {
    if (product.stock === 0) {
      return { status: 'Out of Stock', color: '#FF3B30' };
    } else if (product.stock < 10) {
      return { status: 'Low Stock', color: '#FF9500' };
    } else {
      return { status: 'In Stock', color: '#34C759' };
    }
  }

  /**
   * Format price with currency
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vn-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }

  /**
   * Get discount amount
   */
  getDiscountAmount(product: Product): number {
    const salePercentage = parseFloat(product.salePercentage);
    if (salePercentage > 0) {
      return product.sellingPrice * (salePercentage / 100);
    }
    return 0;
  }

  /**
   * Check if product has reviews
   */
  hasReviews(product: Product): boolean {
    return product.reviews && product.reviews.length > 0;
  }

  convertToVND(usdPrice: number): number {
    return usdPrice * 26243;
  }

  /**
   * Get products with pagination
   */
  async getProductsPaginated(page: number = 1, limit: number = 50): Promise<{ products: Product[], pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      const params = new URLSearchParams();
      if (page > 1) params.append('page', page.toString());
      if (limit !== 50) params.append('limit', limit.toString());
      
      const queryString = params.toString();
      const url = `/products${queryString ? `?${queryString}` : ''}`;
      const response = await apiService.get<ProductListResponse>(url);
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return {
          products: response.data.data,
          pagination: {
            total: response.data.total,
            page: response.data.page,
            limit: response.data.limit,
            totalPages: response.data.totalPages
          }
        };
      }
      
      return { products: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    } catch (error) {
      throw new Error('Failed to fetch paginated products');
    }
  }
}

export const productService = new ProductService();
export default productService;