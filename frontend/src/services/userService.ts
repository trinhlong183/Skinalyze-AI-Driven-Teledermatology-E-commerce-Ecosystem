import type {
  User,
  UsersResponse,
  CreateUserRequest,
  UpdateUserRequest,
} from "@/types/user";

export class UserService {
  /**
   * Get all users
   */
  async getUsers(page = 1, limit = 10): Promise<UsersResponse> {
    try {
      const response = await fetch(`/api/users?page=${page}&limit=${limit}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch users");
      }

      const result = await response.json();

      // Handle backend response format: { data: [...], message, statusCode }
      if (result.data && Array.isArray(result.data)) {
        return {
          users: result.data,
          total: result.data.length,
          page: page,
          limit: limit,
        };
      }

      // Handle if backend returns array directly
      if (Array.isArray(result)) {
        return {
          users: result,
          total: result.length,
          page: page,
          limit: limit,
        };
      }

      // Handle if backend returns { users: [...] }
      if (result.users && Array.isArray(result.users)) {
        return {
          users: result.users,
          total: result.total || result.users.length,
          page: result.page || page,
          limit: result.limit || limit,
        };
      }

      return result;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to fetch users");
    }
  }

  /**
   * Get a single user by ID
   */
  async getUser(userId: string): Promise<User> {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch user");
      }

      const result = await response.json();
      return result.data || result;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to fetch user");
    }
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserRequest): Promise<User> {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }

      const result = await response.json();
      return result.data || result;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to create user");
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(userId: string, data: UpdateUserRequest): Promise<User> {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }

      const result = await response.json();
      return result.data || result;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to update user");
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to delete user");
    }
  }

  /**
   * Reset user password (admin only)
   */
  async resetPassword(userId: string): Promise<{ newPassword: string }> {
    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reset password");
      }

      const result = await response.json();
      return result.data || result;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to reset password");
    }
  }
}

export const userService = new UserService();
