/* eslint-disable @typescript-eslint/no-explicit-any */

import envConfig from "@/config";
import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  envConfig.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3000/api/v1";

class BackendApiError extends Error {
  status: number;
  response: unknown;

  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = "BackendApiError";
    this.status = status;
    this.response = response;
  }
}

async function baseRequest(
  endpoint: string,
  options: RequestInit = {},
  req?: NextRequest // (optional)
) {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get("access_token")?.value;
  }

  const defaultHeaders = new Headers(options.headers as HeadersInit);

  // Only set Content-Type if body is not FormData
  if (!(options.body instanceof FormData)) {
    defaultHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    defaultHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: defaultHeaders,
  });

  let data;
  try {
    data = await response.json();
  } catch (error) {
    data = { error: "Backend API did not return JSON" };
  }
  if (!response.ok) {
    throw new BackendApiError(
      data.message || data.error || "Backend API request failed",
      response.status,
      data
    );
  }
  return data;
}

interface ApiConfig {
  options?: RequestInit;
  req?: NextRequest;
  body?: unknown;
}

export const api = {
  /**
   * @param endpoint
   * @param config - (Optional) Include 'options' and/or 'req'
   */
  get: (endpoint: string, config: ApiConfig = {}) => {
    const { options = {}, req } = config;
    return baseRequest(endpoint, { ...options, method: "GET" }, req);
  },

  /**
   * @param endpoint
   * @param body
   * @param config
   */
  post: (endpoint: string, body: unknown, config: ApiConfig = {}) => {
    const { options = {}, req } = config;
    return baseRequest(
      endpoint,
      {
        ...options,
        method: "POST",
        body: JSON.stringify(body),
      },
      req
    );
  },

  /**
   * @param endpoint
   * @param body
   * @param config
   */
  put: (endpoint: string, body: unknown, config: ApiConfig = {}) => {
    const { options = {}, req } = config;
    return baseRequest(
      endpoint,
      {
        ...options,
        method: "PUT",
        body: JSON.stringify(body),
      },
      req
    );
  },
  /**
   * @param endpoint
   * @param body
   * @param config
   */
  patch: (endpoint: string, body: unknown, config: ApiConfig = {}) => {
    const { options = {}, req } = config;
    return baseRequest(
      endpoint,
      {
        ...options,
        method: "PATCH",
        body: body instanceof FormData ? body : JSON.stringify(body),
      },
      req
    );
  },

  /**
   * @param endpoint
   * @param config
   */
  delete: (endpoint: string, config: ApiConfig = {}) => {
    const { options = {}, req, body } = config;
    const requestInit: RequestInit = { ...options, method: "DELETE" };

    if (body !== undefined) {
      requestInit.body =
        body instanceof FormData || typeof body === "string"
          ? body
          : JSON.stringify(body);
    }

    return baseRequest(endpoint, requestInit, req);
  },
};

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof BackendApiError) {
    return NextResponse.json(
      { error: error.message, details: error.response },
      { status: error.status }
    );
  }

  console.error("Unknown API route error:", error);
  return NextResponse.json(
    { error: "An internal server error occurred" },
    { status: 500 }
  );
}
