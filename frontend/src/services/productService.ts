import { http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  Product,
  ProductsResponse,
  CreateProductRequest,
  ProductQueryParams,
} from "@/types/product";

export const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export class ProductService {
  /**
   * Get products with optional pagination, search, and filter parameters.
   */
  async getProducts(
    params: ProductQueryParams = {},
    options: { signal?: AbortSignal } = {}
  ): Promise<ProductsResponse> {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      brand,
      minPrice,
      maxPrice,
      inStock,
    } = params;

    try {
      const response = await http.get<
        ApiResponse<{
          data: Product[];
          total: number;
          page: number;
          limit: number;
          totalPages?: number;
        }>
      >("/api/products", {
        params: {
          page,
          limit,
          search,
          categoryId,
          brand,
          minPrice,
          maxPrice,
          inStock,
        },
        signal: options.signal,
      });

      const payload = response.data;
      if (payload && Array.isArray(payload.data)) {
        const total = payload.total ?? payload.data.length;
        const currentPage = payload.page ?? page;
        const currentLimit = payload.limit ?? limit;
        const totalPages =
          payload.totalPages ??
          Math.max(1, Math.ceil(total / Math.max(currentLimit, 1)));

        return {
          products: payload.data,
          total,
          page: currentPage,
          limit: currentLimit,
          totalPages,
        };
      }

      throw new Error("Unexpected response format when fetching products");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      throw new Error(getErrorMessage(error, "Failed to fetch products"));
    }
  }

  /**
   * Get a single product by ID
   */
  async getProduct(
    productId: string,
    options: { signal?: AbortSignal } = {}
  ): Promise<Product> {
    try {
      const response = await http.get<ApiResponse<Product>>(
        `/api/products/${productId}`,
        {
          signal: options.signal,
        }
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      throw new Error(getErrorMessage(error, "Failed to fetch product"));
    }
  }

  /**
   * Create a new product
   */
  async createProduct(data: CreateProductRequest): Promise<Product> {
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create product");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "Failed to create product"));
    }
  }

  /**
   * Create a new product with file upload
   */
  async createProductWithFiles(
    data: Omit<CreateProductRequest, "productImages">,
    files: File[],
    existingUrls?: string[]
  ): Promise<Product> {
    try {
      const formData = new FormData();

      // Append all text fields
      formData.append("productName", data.productName);
      formData.append("productDescription", data.productDescription);
      formData.append("stock", data.stock.toString());
      formData.append("brand", data.brand);
      formData.append("sellingPrice", data.sellingPrice.toString());
      formData.append("ingredients", data.ingredients);
      formData.append("salePercentage", (data.salePercentage || 0).toString());

      // Append arrays as JSON strings
      formData.append("categoryIds", JSON.stringify(data.categoryIds));
      formData.append("suitableFor", JSON.stringify(data.suitableFor));

      // Append existing image URLs if provided
      if (existingUrls && existingUrls.length > 0) {
        formData.append("existingImageUrls", JSON.stringify(existingUrls));
      }

      // Append image files
      files.forEach((file) => formData.append("images", file));

      const response = await fetch("/api/products/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create product with files");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to create product with files");
    }
  }

  /**
   * Update an existing product (with optional file upload)
   */
  async updateProduct(
    productId: string,
    data: Partial<CreateProductRequest>
  ): Promise<Product> {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update product");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to update product");
    }
  }

  /**
   * Update a product with images (with optional new files and keeping existing ones)
   */
  async updateProductWithImages(
    productId: string,
    data: Omit<CreateProductRequest, "productImages">,
    files?: File[],
    imagesToKeep?: string[]
  ): Promise<Product> {
    try {
      const formData = new FormData();

      // Append all text fields
      formData.append("productName", data.productName);
      formData.append("productDescription", data.productDescription);
      formData.append("stock", data.stock.toString());
      formData.append("brand", data.brand);
      formData.append("sellingPrice", data.sellingPrice.toString());
      formData.append("ingredients", data.ingredients);
      formData.append("salePercentage", (data.salePercentage || 0).toString());

      // Append arrays as JSON strings
      formData.append("categoryIds", JSON.stringify(data.categoryIds));
      formData.append("suitableFor", JSON.stringify(data.suitableFor));

      // Append existing images to keep (if any)
      if (imagesToKeep && imagesToKeep.length > 0) {
        formData.append("imagesToKeep", JSON.stringify(imagesToKeep));
      }

      // Append new image files (if any)
      if (files && files.length > 0) {
        files.forEach((file) => formData.append("images", file));
      }

      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update product");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to update product");
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<void> {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete product");
      }
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to delete product");
    }
  }

  /**
   * Update product stock
   */
  async updateStock(productId: string, stock: number): Promise<Product> {
    try {
      const response = await fetch(`/api/products/${productId}/stock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ stock }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update stock");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to update stock");
    }
  }
}

export const productService = new ProductService();
