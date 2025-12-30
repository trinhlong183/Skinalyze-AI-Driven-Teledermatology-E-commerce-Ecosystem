export interface Review {
  userId: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Category {
  categoryId: string;
  categoryName: string;
  categoryDescription: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  productId?: string;
  productName: string;
  productDescription: string;
  stock: number;
  categoryIds?: string[]; // For form data
  categories?: Category[]; // For API response
  brand: string;
  sellingPrice: number;
  productImages: string[];
  ingredients: string;
  suitableFor: string[];
  reviews?: Review[] | null;
  salePercentage: number | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface CreateProductRequest {
  productName: string;
  productDescription: string;
  stock: number;
  categoryIds: string[];
  brand: string;
  sellingPrice: number;
  productImages: string[];
  ingredients: string;
  suitableFor: string[];
  salePercentage?: number;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  productId: string;
}
