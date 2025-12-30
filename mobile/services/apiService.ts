import tokenService from "./tokenService";

const API_URL =
  process.env.EXPO_PUBLIC_BASE_API_URL || "https://api.nhatlonh.id.vn/api/v1";

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    console.log("🔗 API Base URL:", this.baseURL);
  }

  private getHeaders(options?: RequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options?.headers,
    };

    return headers;
  }

  private async request<T>(
    endpoint: string,
    method: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    try {
      let url = `${this.baseURL}${endpoint}`;

      // Add query params
      if (options?.params) {
        const validParams: Record<string, string> = {};
        for (const key in options.params) {
          const value = options.params[key];
          if (value !== null && value !== undefined) {
            validParams[key] = String(value);
          }
        }
        const query = new URLSearchParams(validParams).toString();
        if (query) {
          url += `?${query}`;
        }
      }
      

      // Get auth token and set Authorization header
      const headers = this.getHeaders(options) as Record<string, string>;
      const token = await tokenService.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const config: RequestInit = {
        method,
        headers,
      };

      if (body) {
        config.body = JSON.stringify(body);
        // console.log("Request body:", body);
      }

      const response = await fetch(url, config);
      
      if (response.status === 401) {
        console.warn("⚠️ Token expired or invalid (401). Clearing storage.");
        await tokenService.clearAll();
        // Sau khi clear, AuthContext (nếu đang lắng nghe) hoặc lần reload sau sẽ tự đẩy user ra màn hình Login
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", errorData);
        throw new Error(
          errorData.message || `Request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      // console.log("Response data at apiService:", data);

      return data;
    } catch (error) {
      console.error(`API ${method} Error:`, error);
      throw error;
    }
  }

  /**
   * Upload file using multipart/form-data
   */
  async uploadFile<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`📡 POST (multipart) ${url}`);

      const headers: Record<string, string> = {
        ...options?.headers,
      };

      const token = await tokenService.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Don't set Content-Type for FormData - browser/RN will set it automatically with boundary
      const config: RequestInit = {
        method: "POST",
        headers,
        body: formData,
      };

      const response = await fetch(url, config);

      if (response.status === 401) {
        console.warn("⚠️ Token expired during upload (401). Clearing storage.");
        await tokenService.clearAll();
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", errorData);
        throw new Error(
          errorData.message || `Upload failed with status ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Response data file upload at apiService:", data);
      return data;
    } catch (error) {
      console.error("API Upload Error:", error);
      throw error;
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, "GET", undefined, options);
  }

  async post<T>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, "POST", body, options);
  }

  async patch<T>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, "PATCH", body, options);
  }

  async put<T>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, "PUT", body, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, "DELETE", undefined, options);
  }
}

// Create and export a singleton instance
export const apiService = new ApiService(API_URL);

export default apiService;