/* eslint-disable @typescript-eslint/no-explicit-any */
class ApiError extends Error {
  status: number;
  response: unknown;

  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = response;
  }
}

export interface CustomRequestInit extends RequestInit {
  params?: Record<string, any>;
}

/**
 * Hàm request cơ sở
 * Tự động đính kèm 'credentials: "include"' để gửi cookie (như httpOnly access_token)
 */
async function baseRequest<T>(
  endpoint: string,
  options: CustomRequestInit = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;
  const defaultHeaders = new Headers(fetchOptions.headers as HeadersInit);

  if (!defaultHeaders.has("Content-Type")) {
    // If the body is FormData,  NOT set Content-Type header
    // (FormData will automatically set Content-Type to multipart/form-data with boundary)
    if (!(fetchOptions.body instanceof FormData)) {
      defaultHeaders.set("Content-Type", "application/json");
    }
  }

  const defaultOptions: RequestInit = {
    ...fetchOptions,
    credentials: "include",
    headers: defaultHeaders,
  };

  // --- Handle query parameters automatically ---
  let url = endpoint;
  if (params) {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item === undefined || item === null) {
            return;
          }
          queryParams.append(key, String(item));
        });
      } else {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();

    if (queryString) {
      // Check if the endpoint already has a '?' to append correctly
      url += (endpoint.includes("?") ? "&" : "?") + queryString;
    }
  }

  // Always call the internal Next.js API routes
  const response = await fetch(url, defaultOptions);

  let data;
  try {
    // Check content-type before parsing JSON to avoid errors
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      // If not JSON (e.g., 204 No Content), return null or text
      data = null;
    }
  } catch (error) {
    data = { error: "An unexpected error occurred (Invalid JSON)" };
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error || data?.message || "API request failed",
      response.status,
      data
    );
  }

  return data as T;
}

export const http = {
  get: <T>(endpoint: string, options: CustomRequestInit = {}): Promise<T> => {
    return baseRequest<T>(endpoint, { ...options, method: "GET" });
  },

  post: <T>(
    endpoint: string,
    body: any,
    options: CustomRequestInit = {}
  ): Promise<T> => {
    const init: CustomRequestInit = {
      ...options,
      method: "POST",
      body:
        body instanceof FormData || typeof body === "string"
          ? body
          : JSON.stringify(body),
    };
    return baseRequest<T>(endpoint, init);
  },

  put: <T>(
    endpoint: string,
    body: any,
    options: CustomRequestInit = {}
  ): Promise<T> => {
    const init: CustomRequestInit = {
      ...options,
      method: "PUT",
      body:
        body instanceof FormData || typeof body === "string"
          ? body
          : JSON.stringify(body),
    };
    return baseRequest<T>(endpoint, init);
  },

  patch: <T>(
    endpoint: string,
    body: any,
    options: CustomRequestInit = {}
  ): Promise<T> => {
    const init: CustomRequestInit = {
      ...options,
      method: "PATCH",
      body:
        body instanceof FormData || typeof body === "string"
          ? body
          : JSON.stringify(body),
    };
    return baseRequest<T>(endpoint, init);
  },

  delete: <T>(
    endpoint: string,
    body?: any,
    options: CustomRequestInit = {}
  ): Promise<T> => {
    const init: CustomRequestInit = {
      ...options,
      method: "DELETE",
    };

    if (body !== undefined) {
      init.body =
        body instanceof FormData || typeof body === "string"
          ? body
          : JSON.stringify(body);
    }

    return baseRequest<T>(endpoint, init);
  },
};

export { ApiError };
