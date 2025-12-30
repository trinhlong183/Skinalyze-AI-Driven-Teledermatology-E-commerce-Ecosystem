import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { api, handleApiError } from "@/lib/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3000/api/v1";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const allowedKeys = [
      "page",
      "limit",
      "search",
      "categoryId",
      "brand",
      "minPrice",
      "maxPrice",
      "inStock",
    ];

    const query = new URLSearchParams();
    query.set("page", searchParams.get("page") ?? "1");
    query.set("limit", searchParams.get("limit") ?? "10");

    allowedKeys.forEach((key) => {
      if (key === "page" || key === "limit") {
        return;
      }

      const value = searchParams.get(key);
      if (value !== null && value !== "") {
        query.set(key, value);
      }
    });

    const queryString = query.toString();
    const endpoint = queryString ? `/products?${queryString}` : "/products";

    const data = await api.get(endpoint, { req });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Call backend API with token
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.value}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.message || "Failed to create product" },
        { status: response.status }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
