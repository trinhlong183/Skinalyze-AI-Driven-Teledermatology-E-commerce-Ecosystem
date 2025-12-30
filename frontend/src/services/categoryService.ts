import type { Category } from "@/types/product";

export class CategoryService {
  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch("/api/categories", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch categories");
      }

      const result = await response.json();

      // Handle backend response format: { data: [...], message, statusCode }
      if (result.data && Array.isArray(result.data)) {
        return result.data;
      }

      // Fallback if already in array format
      if (Array.isArray(result)) {
        return result;
      }

      return [];
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to fetch categories");
    }
  }

  /**
   * Create a new category
   */
  async createCategory(
    data: Omit<Category, "categoryId" | "createdAt" | "updatedAt">
  ): Promise<Category> {
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create category");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to create category");
    }
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    categoryId: string,
    data: Omit<Category, "categoryId" | "createdAt" | "updatedAt">
  ): Promise<Category> {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update category");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to update category");
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete category");
      }
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to delete category");
    }
  }
}

export const categoryService = new CategoryService();
